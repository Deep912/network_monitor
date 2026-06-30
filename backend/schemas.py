from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from models import LinkType, LinkStatus, AssetType, IncidentStatus, Severity


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Provider ──────────────────────────────────────────────────────────────────
class ProviderBase(BaseModel):
    name: str
    support_phone: Optional[str] = None
    noc_phone: Optional[str] = None
    support_email: Optional[str] = None
    account_manager: Optional[str] = None
    notes: Optional[str] = None
    portal_url: Optional[str] = None

class ProviderCreate(ProviderBase): pass
class ProviderUpdate(ProviderBase): pass

class ProviderOut(ProviderBase):
    id: int
    created_at: datetime
    link_count: Optional[int] = 0
    class Config: from_attributes = True


# ── Site ──────────────────────────────────────────────────────────────────────
class SiteBase(BaseModel):
    name: str
    address: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None

class SiteCreate(SiteBase): pass
class SiteUpdate(SiteBase): pass

class SiteOut(SiteBase):
    id: int
    created_at: datetime
    link_count: Optional[int] = 0
    asset_count: Optional[int] = 0
    class Config: from_attributes = True


# ── Link ──────────────────────────────────────────────────────────────────────
class LinkBase(BaseModel):
    name: str
    description: Optional[str] = None
    link_type: LinkType
    provider_id: Optional[int] = None
    site_id: Optional[int] = None
    circuit_id: Optional[str] = None
    circuit_number: Optional[str] = None
    bandwidth: Optional[str] = None
    primary_ip: Optional[str] = None
    secondary_ip: Optional[str] = None
    monitoring_target: Optional[str] = None
    status: Optional[LinkStatus] = LinkStatus.unknown
    priority: Optional[int] = 1
    notes: Optional[str] = None

class LinkCreate(LinkBase): pass
class LinkUpdate(LinkBase): pass

class LinkOut(LinkBase):
    id: int
    health_score: Optional[float] = None
    latency: Optional[float] = None
    packet_loss: Optional[float] = None
    last_checked: Optional[datetime] = None
    created_at: datetime
    provider_name: Optional[str] = None
    site_name: Optional[str] = None
    class Config: from_attributes = True


# ── Asset ─────────────────────────────────────────────────────────────────────
class AssetBase(BaseModel):
    name: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    asset_type: AssetType
    site_id: Optional[int] = None
    owner: Optional[str] = None
    description: Optional[str] = None
    criticality: Optional[Severity] = Severity.medium

class AssetCreate(AssetBase): pass
class AssetUpdate(AssetBase): pass

class AssetOut(AssetBase):
    id: int
    created_at: datetime
    site_name: Optional[str] = None
    class Config: from_attributes = True


# ── Dependency ────────────────────────────────────────────────────────────────
class DependencyCreate(BaseModel):
    source_type: str
    source_id: int
    target_type: str
    target_id: int
    label: Optional[str] = None

class DependencyOut(DependencyCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True


# ── Incident ──────────────────────────────────────────────────────────────────
class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Optional[Severity] = Severity.high
    status: Optional[IncidentStatus] = IncidentStatus.open
    link_id: Optional[int] = None
    resolution_notes: Optional[str] = None

class IncidentCreate(IncidentBase): pass
class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    resolution_notes: Optional[str] = None
    severity: Optional[Severity] = None

class IncidentOut(IncidentBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    link_name: Optional[str] = None
    class Config: from_attributes = True


# ── Link Check ────────────────────────────────────────────────────────────────
class LinkCheckOut(BaseModel):
    id: int
    link_id: int
    checked_at: datetime
    status: Optional[LinkStatus]
    latency: Optional[float]
    packet_loss: Optional[float]
    response_time: Optional[float]
    health_score: Optional[float]
    class Config: from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_links: int
    healthy_links: int
    warning_links: int
    down_links: int
    unknown_links: int
    total_providers: int
    total_sites: int
    total_assets: int
    active_incidents: int


# ── Alert Config ──────────────────────────────────────────────────────────────
class AlertConfigOut(BaseModel):
    id: int
    alert_on_link_down: bool
    alert_on_link_recovered: bool
    alert_on_high_latency: bool
    latency_threshold_ms: float
    alert_on_high_packet_loss: bool
    packet_loss_threshold: float
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    alert_email: str
    enabled: bool
    class Config: from_attributes = True

class AlertConfigUpdate(BaseModel):
    alert_on_link_down: Optional[bool] = None
    alert_on_link_recovered: Optional[bool] = None
    alert_on_high_latency: Optional[bool] = None
    latency_threshold_ms: Optional[float] = None
    alert_on_high_packet_loss: Optional[bool] = None
    packet_loss_threshold: Optional[float] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    smtp_from: Optional[str] = None
    alert_email: Optional[str] = None
    enabled: Optional[bool] = None


# ── Pagination ────────────────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int
