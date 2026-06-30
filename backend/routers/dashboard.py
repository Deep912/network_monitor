from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Link, Provider, Site, Asset, Incident, LinkCheck, LinkStatus, IncidentStatus
from auth import get_current_user
from schemas import DashboardStats
from datetime import datetime, timezone, timedelta
from typing import List

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    links = db.query(Link).all()
    return DashboardStats(
        total_links=len(links),
        healthy_links=sum(1 for l in links if l.status == LinkStatus.healthy),
        warning_links=sum(1 for l in links if l.status == LinkStatus.warning),
        down_links=sum(1 for l in links if l.status == LinkStatus.down),
        unknown_links=sum(1 for l in links if l.status == LinkStatus.unknown),
        total_providers=db.query(Provider).count(),
        total_sites=db.query(Site).count(),
        total_assets=db.query(Asset).count(),
        active_incidents=db.query(Incident).filter(Incident.status == IncidentStatus.open).count(),
    )


@router.get("/latency-trends")
def latency_trends(hours: int = 24, db: Session = Depends(get_db), _=Depends(get_current_user)):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    # Hourly avg latency
    rows = db.query(
        func.date_trunc("hour", LinkCheck.checked_at).label("hour"),
        func.avg(LinkCheck.latency).label("avg_latency"),
        func.avg(LinkCheck.packet_loss).label("avg_loss"),
    ).filter(
        LinkCheck.checked_at >= since,
        LinkCheck.latency.isnot(None)
    ).group_by("hour").order_by("hour").all()

    return [{"time": r.hour.isoformat(), "latency": round(r.avg_latency or 0, 2), "packet_loss": round(r.avg_loss or 0, 2)} for r in rows]


@router.get("/status-distribution")
def status_distribution(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Link.status, func.count(Link.id)).group_by(Link.status).all()
    return [{"status": r[0], "count": r[1]} for r in rows]


@router.get("/recent-incidents")
def recent_incidents(limit: int = 10, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import Incident
    incidents = db.query(Incident).order_by(Incident.start_time.desc()).limit(limit).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "severity": i.severity,
            "status": i.status,
            "start_time": i.start_time.isoformat() if i.start_time else None,
            "link_name": i.link.name if i.link else None,
        }
        for i in incidents
    ]


@router.get("/top-problematic")
def top_problematic(limit: int = 5, db: Session = Depends(get_db), _=Depends(get_current_user)):
    links = db.query(Link).filter(
        Link.status.in_([LinkStatus.down, LinkStatus.warning])
    ).order_by(Link.health_score).limit(limit).all()
    return [
        {
            "id": l.id,
            "name": l.name,
            "status": l.status,
            "health_score": l.health_score,
            "latency": l.latency,
            "packet_loss": l.packet_loss,
        }
        for l in links
    ]
