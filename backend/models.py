from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class LinkType(str, enum.Enum):
    internet = "internet"
    mpls = "mpls"
    p2p = "p2p"
    vpn = "vpn"
    sdwan = "sdwan"


class LinkStatus(str, enum.Enum):
    healthy = "healthy"
    warning = "warning"
    down = "down"
    unknown = "unknown"


class AssetType(str, enum.Enum):
    server = "server"
    firewall = "firewall"
    router = "router"
    switch = "switch"
    storage = "storage"
    application = "application"


class IncidentStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    closed = "closed"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Provider(Base):
    __tablename__ = "providers"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, index=True)
    support_phone = Column(String(32))
    noc_phone = Column(String(32))
    support_email = Column(String(128))
    account_manager = Column(String(128))
    notes = Column(Text)
    portal_url = Column(String(256))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    links = relationship("Link", back_populates="provider")


class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, index=True)
    address = Column(String(256))
    region = Column(String(64))
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    links = relationship("Link", back_populates="site")
    assets = relationship("Asset", back_populates="site")


class Link(Base):
    __tablename__ = "links"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, index=True)
    description = Column(Text)
    link_type = Column(SAEnum(LinkType), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    site_id = Column(Integer, ForeignKey("sites.id"))
    circuit_id = Column(String(64))
    circuit_number = Column(String(64))
    bandwidth = Column(String(32))
    primary_ip = Column(String(45))
    secondary_ip = Column(String(45))
    monitoring_target = Column(String(128))
    status = Column(SAEnum(LinkStatus), default=LinkStatus.unknown)
    priority = Column(Integer, default=1)
    notes = Column(Text)
    health_score = Column(Float, default=100.0)
    latency = Column(Float)
    packet_loss = Column(Float)
    last_checked = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    provider = relationship("Provider", back_populates="links")
    site = relationship("Site", back_populates="links")
    checks = relationship("LinkCheck", back_populates="link", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="link")

    __table_args__ = (Index("ix_links_status", "status"),)


class LinkCheck(Base):
    __tablename__ = "link_checks"
    id = Column(Integer, primary_key=True)
    link_id = Column(Integer, ForeignKey("links.id"), nullable=False)
    checked_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(SAEnum(LinkStatus))
    latency = Column(Float)
    packet_loss = Column(Float)
    response_time = Column(Float)
    health_score = Column(Float)

    link = relationship("Link", back_populates="checks")

    __table_args__ = (Index("ix_link_checks_link_time", "link_id", "checked_at"),)


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, index=True)
    hostname = Column(String(128))
    ip_address = Column(String(45))
    asset_type = Column(SAEnum(AssetType), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"))
    owner = Column(String(128))
    description = Column(Text)
    criticality = Column(SAEnum(Severity), default=Severity.medium)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    site = relationship("Site", back_populates="assets")


class Dependency(Base):
    __tablename__ = "dependencies"
    id = Column(Integer, primary_key=True)
    source_type = Column(String(32), nullable=False)  # 'link' or 'asset'
    source_id = Column(Integer, nullable=False)
    target_type = Column(String(32), nullable=False)
    target_id = Column(Integer, nullable=False)
    label = Column(String(64))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_dep_source", "source_type", "source_id"),
        Index("ix_dep_target", "target_type", "target_id"),
    )


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    severity = Column(SAEnum(Severity), default=Severity.high)
    status = Column(SAEnum(IncidentStatus), default=IncidentStatus.open)
    link_id = Column(Integer, ForeignKey("links.id"))
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)

    link = relationship("Link", back_populates="incidents")

    __table_args__ = (Index("ix_incidents_status", "status"),)


class AlertConfiguration(Base):
    __tablename__ = "alert_configurations"
    id = Column(Integer, primary_key=True)
    alert_on_link_down = Column(Boolean, default=True)
    alert_on_link_recovered = Column(Boolean, default=True)
    alert_on_high_latency = Column(Boolean, default=True)
    latency_threshold_ms = Column(Float, default=200.0)
    alert_on_high_packet_loss = Column(Boolean, default=True)
    packet_loss_threshold = Column(Float, default=5.0)
    smtp_host = Column(String(128), default="")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(128), default="")
    smtp_pass = Column(String(256), default="")
    smtp_from = Column(String(128), default="")
    alert_email = Column(String(256), default="")
    enabled = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
