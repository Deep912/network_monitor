"""Background monitoring service.

Runs every 60 seconds and updates link status, latency, packet loss, health score.
Creates/resolves incidents automatically.
Sends email alerts if configured.
"""
import asyncio
import socket
import time
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

try:
    import icmplib
    ICMP_AVAILABLE = True
except ImportError:
    ICMP_AVAILABLE = False

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Link, LinkCheck, LinkStatus, Incident, IncidentStatus, Severity, AlertConfiguration

logger = logging.getLogger(__name__)


# ── Health Score ──────────────────────────────────────────────────────────────

def compute_health_score(latency: Optional[float], packet_loss: Optional[float], status: LinkStatus) -> float:
    if status == LinkStatus.down:
        return 0.0
    if status == LinkStatus.unknown or (latency is None and packet_loss is None):
        return 50.0

    score = 100.0

    if latency is not None:
        if latency > 500:
            score -= 50
        elif latency > 200:
            score -= 30
        elif latency > 100:
            score -= 15
        elif latency > 50:
            score -= 5

    if packet_loss is not None:
        if packet_loss > 50:
            score -= 40
        elif packet_loss > 20:
            score -= 25
        elif packet_loss > 10:
            score -= 15
        elif packet_loss > 5:
            score -= 8
        elif packet_loss > 2:
            score -= 3

    return max(0.0, min(100.0, score))


def determine_status(latency: Optional[float], packet_loss: Optional[float], reachable: bool) -> LinkStatus:
    if not reachable:
        return LinkStatus.down
    if packet_loss is not None and packet_loss > 20:
        return LinkStatus.warning
    if latency is not None and latency > 200:
        return LinkStatus.warning
    return LinkStatus.healthy


# ── Probe Methods ─────────────────────────────────────────────────────────────

async def icmp_ping(host: str, count: int = 4) -> dict:
    """ICMP ping using icmplib (requires root/cap_net_raw) or fallback TCP."""
    if ICMP_AVAILABLE:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: icmplib.ping(host, count=count, interval=0.2, timeout=2, privileged=False)
            )
            return {
                "reachable": result.is_alive,
                "latency": result.avg_rtt if result.is_alive else None,
                "packet_loss": result.packet_loss * 100,
            }
        except Exception as e:
            logger.debug(f"ICMP failed for {host}: {e}")

    # Fallback: TCP to port 80
    return await tcp_check(host, 80)


async def tcp_check(host: str, port: int = 80, timeout: float = 5.0) -> dict:
    start = time.monotonic()
    try:
        loop = asyncio.get_event_loop()
        fut = loop.run_in_executor(None, lambda: socket.create_connection((host, port), timeout=timeout))
        conn = await asyncio.wait_for(fut, timeout=timeout + 1)
        conn.close()
        latency = (time.monotonic() - start) * 1000
        return {"reachable": True, "latency": latency, "packet_loss": 0.0}
    except Exception:
        return {"reachable": False, "latency": None, "packet_loss": 100.0}


async def http_check(url: str, timeout: float = 10.0) -> dict:
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url)
        latency = (time.monotonic() - start) * 1000
        reachable = resp.status_code < 500
        return {"reachable": reachable, "latency": latency, "packet_loss": 0.0}
    except Exception:
        return {"reachable": False, "latency": None, "packet_loss": 100.0}


async def probe_target(target: str) -> dict:
    """Choose probe method based on target format."""
    if not target:
        return {"reachable": False, "latency": None, "packet_loss": 100.0}

    target = target.strip()
    if target.startswith("http://") or target.startswith("https://"):
        return await http_check(target)

    if ":" in target and not target.startswith("["):
        # host:port
        parts = target.rsplit(":", 1)
        try:
            port = int(parts[1])
            return await tcp_check(parts[0], port)
        except ValueError:
            pass

    return await icmp_ping(target)


# ── Alert ─────────────────────────────────────────────────────────────────────

async def send_alert_email(config: AlertConfiguration, subject: str, body: str):
    if not config.enabled or not config.smtp_host or not config.alert_email:
        return
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = config.smtp_from or config.smtp_user
        msg["To"] = config.alert_email
        await aiosmtplib.send(
            msg,
            hostname=config.smtp_host,
            port=config.smtp_port,
            username=config.smtp_user or None,
            password=config.smtp_pass or None,
            start_tls=True,
        )
    except Exception as e:
        logger.warning(f"Alert email failed: {e}")


# ── Core Monitor Loop ─────────────────────────────────────────────────────────

async def check_link(link: Link, db: Session, alert_config: Optional[AlertConfiguration]):
    if not link.monitoring_target:
        return

    result = await probe_target(link.monitoring_target)
    reachable = result["reachable"]
    latency = result["latency"]
    packet_loss = result["packet_loss"]
    response_time = latency

    new_status = determine_status(latency, packet_loss, reachable)
    health_score = compute_health_score(latency, packet_loss, new_status)
    prev_status = link.status

    # Update link
    link.status = new_status
    link.latency = latency
    link.packet_loss = packet_loss
    link.health_score = health_score
    link.last_checked = datetime.now(timezone.utc)

    # Store check record
    check = LinkCheck(
        link_id=link.id,
        status=new_status,
        latency=latency,
        packet_loss=packet_loss,
        response_time=response_time,
        health_score=health_score,
    )
    db.add(check)

    # Incident management
    if new_status == LinkStatus.down and prev_status != LinkStatus.down:
        incident = Incident(
            title=f"Link Down: {link.name}",
            description=f"Link {link.name} ({link.monitoring_target}) is unreachable.",
            severity=Severity.critical if link.priority == 1 else Severity.high,
            link_id=link.id,
        )
        db.add(incident)
        if alert_config and alert_config.alert_on_link_down:
            await send_alert_email(
                alert_config,
                f"[ALERT] Link Down: {link.name}",
                f"Link {link.name} became unreachable.\nTarget: {link.monitoring_target}"
            )

    elif new_status != LinkStatus.down and prev_status == LinkStatus.down:
        # Resolve open incidents for this link
        open_incidents = db.query(Incident).filter(
            Incident.link_id == link.id,
            Incident.status == IncidentStatus.open
        ).all()
        for inc in open_incidents:
            inc.status = IncidentStatus.resolved
            inc.end_time = datetime.now(timezone.utc)
            inc.resolution_notes = "Auto-resolved: link recovered"
        if alert_config and alert_config.alert_on_link_recovered:
            await send_alert_email(
                alert_config,
                f"[RESOLVED] Link Recovered: {link.name}",
                f"Link {link.name} has recovered.\nTarget: {link.monitoring_target}"
            )

    elif new_status == LinkStatus.warning:
        if alert_config:
            if (alert_config.alert_on_high_latency and latency and
                    latency > alert_config.latency_threshold_ms and prev_status == LinkStatus.healthy):
                await send_alert_email(
                    alert_config,
                    f"[WARNING] High Latency: {link.name}",
                    f"Link {link.name} latency: {latency:.1f}ms (threshold: {alert_config.latency_threshold_ms}ms)"
                )
            if (alert_config.alert_on_high_packet_loss and packet_loss and
                    packet_loss > alert_config.packet_loss_threshold and prev_status == LinkStatus.healthy):
                await send_alert_email(
                    alert_config,
                    f"[WARNING] Packet Loss: {link.name}",
                    f"Link {link.name} packet loss: {packet_loss:.1f}% (threshold: {alert_config.packet_loss_threshold}%)"
                )

    db.commit()


async def monitor_all_links():
    db = SessionLocal()
    try:
        links = db.query(Link).filter(Link.monitoring_target.isnot(None)).all()
        alert_config = db.query(AlertConfiguration).first()
        tasks = [check_link(link, db, alert_config) for link in links]
        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        logger.error(f"Monitor cycle error: {e}")
    finally:
        db.close()


async def start_monitoring():
    """Background monitoring loop - runs every 60 seconds."""
    logger.info("Monitoring service started")
    while True:
        try:
            await monitor_all_links()
        except Exception as e:
            logger.error(f"Monitor error: {e}")
        await asyncio.sleep(60)
