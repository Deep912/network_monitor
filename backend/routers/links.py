from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import get_db
from models import Link, Provider, Site, LinkCheck, LinkStatus
from auth import get_current_user
from schemas import LinkCreate, LinkUpdate

router = APIRouter(prefix="/api/links", tags=["links"])


def enrich(l: Link, db: Session) -> dict:
    d = {c.name: getattr(l, c.name) for c in l.__table__.columns}
    d["provider_name"] = l.provider.name if l.provider else None
    d["site_name"] = l.site.name if l.site else None
    d["link_type"] = l.link_type.value if l.link_type else None
    d["status"] = l.status.value if l.status else None
    return d


@router.get("")
def list_links(
    search: Optional[str] = None,
    status: Optional[str] = None,
    link_type: Optional[str] = None,
    site_id: Optional[int] = None,
    provider_id: Optional[int] = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Link)
    if search:
        q = q.filter(Link.name.ilike(f"%{search}%"))
    if status:
        q = q.filter(Link.status == status)
    if link_type:
        q = q.filter(Link.link_type == link_type)
    if site_id:
        q = q.filter(Link.site_id == site_id)
    if provider_id:
        q = q.filter(Link.provider_id == provider_id)
    total = q.count()
    items = q.order_by(Link.name).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [enrich(l, db) for l in items], "total": total, "page": page, "per_page": per_page}


@router.post("", status_code=201)
def create_link(data: LinkCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = Link(**data.model_dump())
    db.add(l)
    db.commit()
    db.refresh(l)
    return enrich(l, db)


@router.get("/{id}")
def get_link(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Link).filter(Link.id == id).first()
    if not l:
        raise HTTPException(404)
    d = enrich(l, db)
    # Include recent incidents
    d["incidents"] = [
        {
            "id": i.id,
            "title": i.title,
            "severity": i.severity,
            "status": i.status,
            "start_time": i.start_time.isoformat() if i.start_time else None,
            "end_time": i.end_time.isoformat() if i.end_time else None,
        }
        for i in sorted(l.incidents, key=lambda x: x.start_time, reverse=True)[:10]
    ]
    return d


@router.put("/{id}")
def update_link(id: int, data: LinkUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Link).filter(Link.id == id).first()
    if not l:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(l, k, v)
    db.commit()
    db.refresh(l)
    return enrich(l, db)


@router.delete("/{id}", status_code=204)
def delete_link(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Link).filter(Link.id == id).first()
    if not l:
        raise HTTPException(404)
    db.delete(l)
    db.commit()


@router.get("/{id}/history")
def link_history(
    id: int,
    period: str = "24h",  # 24h | 7d | 30d
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    periods = {"24h": 24, "7d": 168, "30d": 720}
    hours = periods.get(period, 24)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    checks = db.query(LinkCheck).filter(
        LinkCheck.link_id == id,
        LinkCheck.checked_at >= since,
    ).order_by(LinkCheck.checked_at).all()

    return [
        {
            "time": c.checked_at.isoformat(),
            "latency": c.latency,
            "packet_loss": c.packet_loss,
            "health_score": c.health_score,
            "status": c.status.value if c.status else None,
        }
        for c in checks
    ]


@router.post("/{id}/check-now")
async def check_now(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from monitoring import check_link
    from models import AlertConfiguration
    l = db.query(Link).filter(Link.id == id).first()
    if not l:
        raise HTTPException(404)
    alert_config = db.query(AlertConfiguration).first()
    await check_link(l, db, alert_config)
    db.refresh(l)
    return enrich(l, db)
