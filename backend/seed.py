"""Seed the database with demo data."""
import sys
sys.path.insert(0, ".")

from database import SessionLocal, Base, engine
from models import *
from auth import hash_password
from datetime import datetime, timezone, timedelta
import random

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    # Clear existing data
    db.query(Dependency).delete()
    db.query(Incident).delete()
    db.query(LinkCheck).delete()
    db.query(Link).delete()
    db.query(Asset).delete()
    db.query(Site).delete()
    db.query(Provider).delete()
    db.query(User).delete()
    db.commit()

    # User
    db.add(User(username="admin", hashed_password=hash_password("admin")))

    # Providers
    p1 = Provider(name="Comcast Business", support_phone="1-800-391-3000", noc_phone="1-800-251-2273",
                  support_email="noc@comcast.com", account_manager="Jane Smith",
                  portal_url="https://business.comcast.com", notes="Primary ISP for all sites")
    p2 = Provider(name="AT&T Business", support_phone="1-800-288-2020", noc_phone="1-888-722-2345",
                  support_email="noc@att.com", account_manager="Bob Johnson",
                  portal_url="https://business.att.com", notes="MPLS and SD-WAN provider")
    p3 = Provider(name="Zayo Group", support_phone="1-866-226-1015", noc_phone="1-877-585-0603",
                  support_email="noc@zayo.com", account_manager="Sara Lee",
                  portal_url="https://zayo.com", notes="Dark fiber and P2P circuits")
    db.add_all([p1, p2, p3])
    db.flush()

    # Sites
    s1 = Site(name="HQ - New York", address="100 Wall Street, New York, NY 10005",
              region="US-East", latitude=40.7074, longitude=-74.0113, description="Headquarters")
    s2 = Site(name="DR - Chicago", address="233 S Wacker Dr, Chicago, IL 60606",
              region="US-Central", latitude=41.8788, longitude=-87.6359, description="Disaster Recovery")
    s3 = Site(name="West Coast - Los Angeles", address="633 W 5th St, Los Angeles, CA 90071",
              region="US-West", latitude=34.0522, longitude=-118.2437, description="West Coast Hub")
    db.add_all([s1, s2, s3])
    db.flush()

    # Links
    now = datetime.now(timezone.utc)
    links_data = [
        dict(name="HQ Primary Internet", link_type=LinkType.internet, provider_id=p1.id, site_id=s1.id,
             circuit_id="COMCAST-001", bandwidth="1 Gbps", primary_ip="203.0.113.1",
             monitoring_target="8.8.8.8", status=LinkStatus.healthy, priority=1,
             health_score=98, latency=12.5, packet_loss=0.0, last_checked=now),
        dict(name="HQ Secondary Internet", link_type=LinkType.internet, provider_id=p2.id, site_id=s1.id,
             circuit_id="ATT-001", bandwidth="500 Mbps", primary_ip="198.51.100.1",
             monitoring_target="1.1.1.1", status=LinkStatus.healthy, priority=2,
             health_score=95, latency=18.2, packet_loss=0.0, last_checked=now),
        dict(name="HQ-DR MPLS", link_type=LinkType.mpls, provider_id=p2.id, site_id=s1.id,
             circuit_id="ATT-MPLS-001", bandwidth="200 Mbps",
             monitoring_target="10.0.1.1", status=LinkStatus.warning, priority=1,
             health_score=65, latency=145.0, packet_loss=2.1, last_checked=now),
        dict(name="HQ-LA P2P", link_type=LinkType.p2p, provider_id=p3.id, site_id=s1.id,
             circuit_id="ZAYO-P2P-001", bandwidth="10 Gbps",
             monitoring_target="10.0.2.1", status=LinkStatus.healthy, priority=1,
             health_score=99, latency=38.0, packet_loss=0.0, last_checked=now),
        dict(name="DR Primary Internet", link_type=LinkType.internet, provider_id=p1.id, site_id=s2.id,
             circuit_id="COMCAST-002", bandwidth="500 Mbps", primary_ip="203.0.113.10",
             monitoring_target="8.8.4.4", status=LinkStatus.healthy, priority=1,
             health_score=97, latency=8.3, packet_loss=0.0, last_checked=now),
        dict(name="DR-LA MPLS", link_type=LinkType.mpls, provider_id=p2.id, site_id=s2.id,
             circuit_id="ATT-MPLS-002", bandwidth="100 Mbps",
             monitoring_target="10.0.3.1", status=LinkStatus.down, priority=1,
             health_score=0, latency=None, packet_loss=100.0, last_checked=now),
        dict(name="LA Primary Internet", link_type=LinkType.internet, provider_id=p2.id, site_id=s3.id,
             circuit_id="ATT-002", bandwidth="1 Gbps", primary_ip="198.51.100.10",
             monitoring_target="9.9.9.9", status=LinkStatus.healthy, priority=1,
             health_score=92, latency=22.1, packet_loss=0.1, last_checked=now),
        dict(name="HQ VPN Tunnel A", link_type=LinkType.vpn, provider_id=p1.id, site_id=s1.id,
             circuit_id="VPN-001", bandwidth="100 Mbps",
             monitoring_target="172.16.0.1", status=LinkStatus.healthy, priority=2,
             health_score=88, latency=45.0, packet_loss=0.5, last_checked=now),
        dict(name="LA SD-WAN Primary", link_type=LinkType.sdwan, provider_id=p3.id, site_id=s3.id,
             circuit_id="SDWAN-001", bandwidth="500 Mbps",
             monitoring_target="192.168.100.1", status=LinkStatus.warning, priority=1,
             health_score=55, latency=210.0, packet_loss=5.2, last_checked=now),
        dict(name="DR Backup Internet", link_type=LinkType.internet, provider_id=p3.id, site_id=s2.id,
             circuit_id="ZAYO-001", bandwidth="200 Mbps", primary_ip="203.0.113.20",
             monitoring_target="208.67.222.222", status=LinkStatus.healthy, priority=2,
             health_score=96, latency=14.7, packet_loss=0.0, last_checked=now),
    ]
    links = [Link(**d) for d in links_data]
    db.add_all(links)
    db.flush()

    # Assets
    assets_data = [
        dict(name="HQ-FW-01", hostname="hq-fw-01.corp", ip_address="10.0.0.1",
             asset_type=AssetType.firewall, site_id=s1.id, owner="NetOps", criticality=Severity.critical),
        dict(name="HQ-SW-CORE-01", hostname="hq-sw-core-01.corp", ip_address="10.0.0.2",
             asset_type=AssetType.switch, site_id=s1.id, owner="NetOps", criticality=Severity.critical),
        dict(name="HQ-RTR-01", hostname="hq-rtr-01.corp", ip_address="10.0.0.3",
             asset_type=AssetType.router, site_id=s1.id, owner="NetOps", criticality=Severity.critical),
        dict(name="WEB-PROD-01", hostname="web-prod-01.corp", ip_address="10.0.1.10",
             asset_type=AssetType.server, site_id=s1.id, owner="Engineering", criticality=Severity.high),
        dict(name="DB-PROD-01", hostname="db-prod-01.corp", ip_address="10.0.1.20",
             asset_type=AssetType.server, site_id=s1.id, owner="Engineering", criticality=Severity.critical),
        dict(name="Customer Portal", hostname="portal.corp", ip_address="10.0.1.30",
             asset_type=AssetType.application, site_id=s1.id, owner="Product", criticality=Severity.critical),
        dict(name="DR-FW-01", hostname="dr-fw-01.corp", ip_address="10.1.0.1",
             asset_type=AssetType.firewall, site_id=s2.id, owner="NetOps", criticality=Severity.critical),
        dict(name="DR-SW-CORE-01", hostname="dr-sw-core-01.corp", ip_address="10.1.0.2",
             asset_type=AssetType.switch, site_id=s2.id, owner="NetOps", criticality=Severity.high),
        dict(name="NAS-STORAGE-01", hostname="nas-01.corp", ip_address="10.0.2.10",
             asset_type=AssetType.storage, site_id=s1.id, owner="IT", criticality=Severity.high),
        dict(name="LA-FW-01", hostname="la-fw-01.corp", ip_address="10.2.0.1",
             asset_type=AssetType.firewall, site_id=s3.id, owner="NetOps", criticality=Severity.critical),
    ]
    assets = [Asset(**d) for d in assets_data]
    db.add_all(assets)
    db.flush()

    # Dependencies (link → asset and asset → asset)
    deps = [
        Dependency(source_type="link", source_id=links[0].id, target_type="asset", target_id=assets[0].id, label="Primary upstream"),
        Dependency(source_type="link", source_id=links[1].id, target_type="asset", target_id=assets[0].id, label="Secondary upstream"),
        Dependency(source_type="asset", source_id=assets[0].id, target_type="asset", target_id=assets[1].id, label="Internal"),
        Dependency(source_type="asset", source_id=assets[1].id, target_type="asset", target_id=assets[3].id, label="Traffic"),
        Dependency(source_type="asset", source_id=assets[3].id, target_type="asset", target_id=assets[5].id, label="Serves"),
        Dependency(source_type="link", source_id=links[5].id, target_type="asset", target_id=assets[6].id, label="Upstream"),
        Dependency(source_type="asset", source_id=assets[6].id, target_type="asset", target_id=assets[7].id, label="Internal"),
    ]
    db.add_all(deps)

    # Historical checks (last 24h)
    check_records = []
    for link in links:
        for h in range(24):
            t = now - timedelta(hours=24 - h)
            lat_jitter = random.uniform(-5, 15)
            base_lat = link.latency or 999
            check_records.append(LinkCheck(
                link_id=link.id,
                checked_at=t,
                status=link.status,
                latency=max(1, base_lat + lat_jitter) if link.status != LinkStatus.down else None,
                packet_loss=link.packet_loss,
                health_score=link.health_score,
            ))

    db.bulk_save_objects(check_records)

    # Incidents
    incidents = [
        Incident(title="DR-LA MPLS Circuit Down", description="MPLS circuit between DR and LA is unreachable.",
                 severity=Severity.critical, status=IncidentStatus.open, link_id=links[5].id,
                 start_time=now - timedelta(hours=2)),
        Incident(title="HQ-DR MPLS High Latency", description="Latency spiked above 100ms.",
                 severity=Severity.medium, status=IncidentStatus.open, link_id=links[2].id,
                 start_time=now - timedelta(hours=1)),
        Incident(title="LA SD-WAN Degraded", description="Packet loss above threshold.",
                 severity=Severity.high, status=IncidentStatus.open, link_id=links[8].id,
                 start_time=now - timedelta(minutes=30)),
        Incident(title="HQ Primary Internet Packet Loss", description="Brief packet loss event resolved.",
                 severity=Severity.medium, status=IncidentStatus.resolved, link_id=links[0].id,
                 start_time=now - timedelta(days=2), end_time=now - timedelta(days=2, hours=-1),
                 resolution_notes="Provider confirmed issue resolved on their end."),
    ]
    db.add_all(incidents)

    # Alert config
    if not db.query(AlertConfiguration).first():
        db.add(AlertConfiguration())

    db.commit()
    print("✅ Seed data created successfully")
    print("   Admin login: admin / admin")
    print(f"   {len(links)} links, {len(assets)} assets, {len(incidents)} incidents")


if __name__ == "__main__":
    seed()
    db.close()
