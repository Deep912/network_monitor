from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
from models import Site, Link, Asset
from auth import get_current_user
from schemas import SiteCreate, SiteUpdate

router = APIRouter(prefix="/api/sites", tags=["sites"])


def enrich(s: Site, db: Session) -> dict:
    d = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    d["link_count"] = db.query(func.count(Link.id)).filter(Link.site_id == s.id).scalar()
    d["asset_count"] = db.query(func.count(Asset.id)).filter(Asset.site_id == s.id).scalar()
    return d


@router.get("")
def list_sites(
    search: Optional[str] = None,
    region: Optional[str] = None,
    page: int = 1, per_page: int = 20,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    q = db.query(Site)
    if search:
        q = q.filter(Site.name.ilike(f"%{search}%"))
    if region:
        q = q.filter(Site.region == region)
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [enrich(s, db) for s in items], "total": total, "page": page, "per_page": per_page}


@router.post("", status_code=201)
def create_site(data: SiteCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = Site(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return enrich(s, db)


@router.get("/{id}")
def get_site(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Site).filter(Site.id == id).first()
    if not s:
        raise HTTPException(404)
    return enrich(s, db)


@router.put("/{id}")
def update_site(id: int, data: SiteUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Site).filter(Site.id == id).first()
    if not s:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return enrich(s, db)


@router.delete("/{id}", status_code=204)
def delete_site(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Site).filter(Site.id == id).first()
    if not s:
        raise HTTPException(404)
    db.delete(s)
    db.commit()
