from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Asset, Site
from auth import get_current_user
from schemas import AssetCreate, AssetUpdate

router = APIRouter(prefix="/api/assets", tags=["assets"])


def enrich(a: Asset, db: Session) -> dict:
    d = {c.name: getattr(a, c.name) for c in a.__table__.columns}
    d["site_name"] = a.site.name if a.site else None
    d["asset_type"] = a.asset_type.value if a.asset_type else None
    d["criticality"] = a.criticality.value if a.criticality else None
    return d


@router.get("")
def list_assets(
    search: Optional[str] = None,
    asset_type: Optional[str] = None,
    site_id: Optional[int] = None,
    page: int = 1, per_page: int = 50,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    q = db.query(Asset)
    if search:
        q = q.filter(Asset.name.ilike(f"%{search}%"))
    if asset_type:
        q = q.filter(Asset.asset_type == asset_type)
    if site_id:
        q = q.filter(Asset.site_id == site_id)
    total = q.count()
    items = q.order_by(Asset.name).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [enrich(a, db) for a in items], "total": total, "page": page, "per_page": per_page}


@router.post("", status_code=201)
def create_asset(data: AssetCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = Asset(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return enrich(a, db)


@router.get("/{id}")
def get_asset(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = db.query(Asset).filter(Asset.id == id).first()
    if not a:
        raise HTTPException(404)
    return enrich(a, db)


@router.put("/{id}")
def update_asset(id: int, data: AssetUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = db.query(Asset).filter(Asset.id == id).first()
    if not a:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return enrich(a, db)


@router.delete("/{id}", status_code=204)
def delete_asset(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = db.query(Asset).filter(Asset.id == id).first()
    if not a:
        raise HTTPException(404)
    db.delete(a)
    db.commit()
