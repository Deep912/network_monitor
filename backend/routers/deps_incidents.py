from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Dependency, Incident, IncidentStatus, Link, Asset
from auth import get_current_user
from schemas import DependencyCreate, IncidentCreate, IncidentUpdate
from datetime import datetime, timezone

# ── Dependencies ──────────────────────────────────────────────────────────────
dep_router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


@dep_router.get("")
def list_deps(db: Session = Depends(get_db), _=Depends(get_current_user)):
    deps = db.query(Dependency).all()
    # Build node list from links and assets
    links = {l.id: l for l in db.query(Link).all()}
    assets = {a.id: a for a in db.query(Asset).all()}

    nodes = {}
    edges = []

    def get_node(node_type: str, node_id: int):
        key = f"{node_type}:{node_id}"
        if key not in nodes:
            if node_type == "link" and node_id in links:
                l = links[node_id]
                nodes[key] = {
                    "id": key,
                    "label": l.name,
                    "type": "link",
                    "status": l.status.value if l.status else "unknown",
                    "link_type": l.link_type.value if l.link_type else None,
                }
            elif node_type == "asset" and node_id in assets:
                a = assets[node_id]
                nodes[key] = {
                    "id": key,
                    "label": a.name,
                    "type": "asset",
                    "asset_type": a.asset_type.value if a.asset_type else None,
                    "status": "healthy",
                }
        return key

    for d in deps:
        src = get_node(d.source_type, d.source_id)
        tgt = get_node(d.target_type, d.target_id)
        edges.append({
            "id": str(d.id),
            "source": src,
            "target": tgt,
            "label": d.label or "",
        })

    return {"nodes": list(nodes.values()), "edges": edges}


@dep_router.post("", status_code=201)
def create_dep(data: DependencyCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = Dependency(**data.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@dep_router.delete("/{id}", status_code=204)
def delete_dep(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = db.query(Dependency).filter(Dependency.id == id).first()
    if not d:
        raise HTTPException(404)
    db.delete(d)
    db.commit()


# ── Incidents ─────────────────────────────────────────────────────────────────
inc_router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def enrich_incident(i: Incident) -> dict:
    return {
        "id": i.id,
        "title": i.title,
        "description": i.description,
        "severity": i.severity.value if i.severity else None,
        "status": i.status.value if i.status else None,
        "link_id": i.link_id,
        "link_name": i.link.name if i.link else None,
        "start_time": i.start_time.isoformat() if i.start_time else None,
        "end_time": i.end_time.isoformat() if i.end_time else None,
        "resolution_notes": i.resolution_notes,
    }


@inc_router.get("")
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = 1, per_page: int = 50,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if severity:
        q = q.filter(Incident.severity == severity)
    total = q.count()
    items = q.order_by(Incident.start_time.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [enrich_incident(i) for i in items], "total": total, "page": page, "per_page": per_page}


@inc_router.post("", status_code=201)
def create_incident(data: IncidentCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    i = Incident(**data.model_dump())
    db.add(i)
    db.commit()
    db.refresh(i)
    return enrich_incident(i)


@inc_router.get("/{id}")
def get_incident(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    i = db.query(Incident).filter(Incident.id == id).first()
    if not i:
        raise HTTPException(404)
    return enrich_incident(i)


@inc_router.put("/{id}")
def update_incident(id: int, data: IncidentUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    i = db.query(Incident).filter(Incident.id == id).first()
    if not i:
        raise HTTPException(404)
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(i, k, v)
    if updates.get("status") == "resolved" and not i.end_time:
        i.end_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(i)
    return enrich_incident(i)


@inc_router.delete("/{id}", status_code=204)
def delete_incident(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    i = db.query(Incident).filter(Incident.id == id).first()
    if not i:
        raise HTTPException(404)
    db.delete(i)
    db.commit()


# ── Alert Config ──────────────────────────────────────────────────────────────
alert_router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@alert_router.get("/config")
def get_config(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import AlertConfiguration
    c = db.query(AlertConfiguration).first()
    if not c:
        c = AlertConfiguration()
        db.add(c)
        db.commit()
        db.refresh(c)
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d.pop("smtp_pass", None)  # Never expose password
    return d


@alert_router.put("/config")
def update_config(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import AlertConfiguration
    c = db.query(AlertConfiguration).first()
    if not c:
        c = AlertConfiguration()
        db.add(c)
    for k, v in data.items():
        if hasattr(c, k):
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d.pop("smtp_pass", None)
    return d
