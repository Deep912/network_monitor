from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
from models import Provider, Link
from auth import get_current_user
from schemas import ProviderCreate, ProviderUpdate, ProviderOut

router = APIRouter(prefix="/api/providers", tags=["providers"])


def enrich(p: Provider, db: Session) -> dict:
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["link_count"] = db.query(func.count(Link.id)).filter(Link.provider_id == p.id).scalar()
    return d


@router.get("")
def list_providers(
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Provider)
    if search:
        q = q.filter(Provider.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [enrich(p, db) for p in items], "total": total, "page": page, "per_page": per_page}


@router.post("", response_model=ProviderOut, status_code=201)
def create_provider(data: ProviderCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = Provider(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return enrich(p, db)


@router.get("/{id}")
def get_provider(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Provider).filter(Provider.id == id).first()
    if not p:
        raise HTTPException(404)
    return enrich(p, db)


@router.put("/{id}")
def update_provider(id: int, data: ProviderUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Provider).filter(Provider.id == id).first()
    if not p:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return enrich(p, db)


@router.delete("/{id}", status_code=204)
def delete_provider(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Provider).filter(Provider.id == id).first()
    if not p:
        raise HTTPException(404)
    db.delete(p)
    db.commit()
