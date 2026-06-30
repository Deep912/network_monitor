"""Network Operations Platform - Backend API"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.providers import router as providers_router
from routers.sites import router as sites_router
from routers.links import router as links_router
from routers.assets import router as assets_router
from routers.deps_incidents import dep_router, inc_router, alert_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    ensure_default_user()
    ensure_alert_config()

    # Start monitoring in background
    from monitoring import start_monitoring
    monitor_task = asyncio.create_task(start_monitoring())
    logger.info("Network monitoring started")

    yield

    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass


def ensure_default_user():
    from database import SessionLocal
    from models import User
    from auth import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).first():
            db.add(User(username="admin", hashed_password=hash_password("admin")))
            db.commit()
            logger.info("Default admin user created (admin/admin)")
    finally:
        db.close()


def ensure_alert_config():
    from database import SessionLocal
    from models import AlertConfiguration
    db = SessionLocal()
    try:
        if not db.query(AlertConfiguration).first():
            db.add(AlertConfiguration())
            db.commit()
    finally:
        db.close()


app = FastAPI(title="NetOps Platform", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(providers_router)
app.include_router(sites_router)
app.include_router(links_router)
app.include_router(assets_router)
app.include_router(dep_router)
app.include_router(inc_router)
app.include_router(alert_router)


@app.get("/health")
def health():
    return {"status": "ok"}
