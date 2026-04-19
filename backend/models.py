from datetime import datetime
from typing import Optional, List, Dict, Any

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import IndexModel


# ── Embedded sub-models ────────────────────────────────────────────────

class LocationDetail(BaseModel):
    city: str
    locality: Optional[str] = None
    pincode: Optional[str] = None
    coordinates: Optional[Dict[str, Any]] = None  # GeoJSON Point


class AssignedAgent(BaseModel):
    agent_id: PydanticObjectId
    status: str = "available"  # available | in_discussion | negotiating | deal_closed | withdrawn
    assigned_at: datetime = Field(default_factory=datetime.utcnow)


class ClientInfo(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


class MatchResult(BaseModel):
    property_id: PydanticObjectId
    score: float
    match_notes: Optional[str] = None
    price: Optional[float] = None
    locality: Optional[str] = None
    type: Optional[str] = None


# ── Collections ────────────────────────────────────────────────────────

class Agency(Document):
    """Was: Company. Collection kept as 'companies' to preserve existing data."""
    name: str
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    whatsapp_number: Optional[str] = None
    lead_dispatch_time: Optional[str] = None  # e.g. "09:00"
    join_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "companies"  # same collection — no data migration needed


# Backward-compat alias used by older imports
Company = Agency


class User(Document):
    full_name: str
    email: str
    phone: Optional[str] = None
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str  # "admin" | "agent" | "telecaller"
    is_new_user: bool = False
    last_page: str = "/agent/dashboard"
    last_login: Optional[datetime] = None
    company_id: Optional[PydanticObjectId] = None
    company_ids: List[PydanticObjectId] = []     # all agencies this user belongs to
    is_active: bool = True
    auth_provider: str
    language: str = "en"            # NEW: en | ta | hi
    whatsapp_opted_in: bool = False  # NEW
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", 1)], unique=True),
            IndexModel(
                [("google_id", 1)],
                unique=True,
                partialFilterExpression={"google_id": {"$type": "string"}},
            ),
        ]


class Property(Document):
    """Was: Listing. Collection kept as 'listings' to preserve existing data."""

    # Identity
    set_no: int
    # New canonical names + old names kept for backward compat
    agency_id: Optional[PydanticObjectId] = None   # new name
    company_id: Optional[PydanticObjectId] = None  # old name (kept)
    added_by: Optional[PydanticObjectId] = None    # new name
    agent_id: Optional[PydanticObjectId] = None    # old name (kept)

    # Core fields
    property_type: str  # "house" | "plot"   (old values: "Residential" | "Commercial")
    transaction_type: Optional[str] = None   # NEW: sell | rent | lease
    title: Optional[str] = None              # NEW
    description: Optional[str] = None
    price: Optional[float] = None            # NEW flat price
    is_negotiable: bool = False              # NEW

    # Location — new structured + old flat fields kept for backward compat
    location_detail: Optional[LocationDetail] = None  # NEW
    location: Optional[str] = None                    # OLD locality string
    district: Optional[str] = None                   # OLD city/district

    facing: Optional[str] = None  # N|S|E|W|NE|NW|SE|SW

    # Flexible details object (replaces individual columns in new docs)
    details: Optional[Dict[str, Any]] = None  # NEW

    # Old detail columns — kept for backward compat
    total_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    total_property_value: Optional[float] = None
    dimensions: Optional[str] = None
    open_sides: Optional[int] = None
    construction_done: Optional[str] = None
    boundary_wall: Optional[bool] = None
    floors_allowed: Optional[int] = None

    # Photos — new name + old name kept
    photos: List[str] = []   # NEW
    images: List[str] = []   # OLD (kept)

    # Status
    # New values: available | in_discussion | negotiating | deal_closed | withdrawn
    # Old values: available | committed | closed  (still accepted)
    status: str = "available"

    # Assigned agents — NEW
    assigned_agents: List[AssignedAgent] = []

    # Old commit fields kept for backward compat
    committed_client_name: Optional[str] = None
    committed_client_phone: Optional[str] = None
    committed_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None

    # Nearby amenities — NEW
    nearby_amenities: Optional[Dict[str, Any]] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "listings"  # same collection — no data migration needed
        indexes = [
            IndexModel([("company_id", 1)]),
            IndexModel([("agency_id", 1)]),
            IndexModel([("agent_id", 1)]),
            IndexModel([("added_by", 1)]),
            IndexModel([("district", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("transaction_type", 1)]),
        ]


# Backward-compat alias
Listing = Property


class Lead(Document):
    # IDs — new canonical names + old names kept
    agency_id: Optional[PydanticObjectId] = None   # new name
    company_id: Optional[PydanticObjectId] = None  # old name (kept)
    assigned_to: Optional[PydanticObjectId] = None # new name
    agent_id: Optional[PydanticObjectId] = None    # old name (kept)
    property_id: Optional[PydanticObjectId] = None      # new name
    linked_listing_id: Optional[PydanticObjectId] = None # old name (kept)

    # Client — new nested + old flat kept for backward compat
    client: Optional[ClientInfo] = None   # NEW
    client_name: Optional[str] = None     # OLD
    client_phone: Optional[str] = None    # OLD
    client_email: Optional[str] = None    # OLD

    # Source — NEW
    source: Optional[str] = None  # 99acres|magicbricks|nobroker|olx|walk_in|agent_upload|whatsapp

    # Requirements — new flexible object + old flat fields kept
    requirements: Optional[Dict[str, Any]] = None  # NEW
    preferred_location: Optional[str] = None       # OLD
    preferred_district: Optional[str] = None       # OLD
    preferred_property_type: Optional[str] = None  # OLD
    budget_min: Optional[float] = None             # OLD
    budget_max: Optional[float] = None             # OLD
    area_min_sqft: Optional[float] = None          # OLD
    area_max_sqft: Optional[float] = None          # OLD
    facing_preference: Optional[str] = None        # OLD
    open_sides_needed: Optional[int] = None        # OLD

    notes: Optional[str] = None

    # Status — extended pipeline
    # new: new|contacted|follow_up|site_visit|negotiating|converted|lost
    # old: new|in_progress|converted|lost  (still accepted)
    status: str = "new"

    telecaller_verified: bool = False          # NEW
    follow_up_at: Optional[datetime] = None    # NEW

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)  # NEW

    class Settings:
        name = "leads"
        indexes = [
            IndexModel([("company_id", 1)]),
            IndexModel([("agency_id", 1)]),
            IndexModel([("agent_id", 1)]),
            IndexModel([("assigned_to", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("source", 1)]),
        ]


class PortalPost(Document):
    property_id: PydanticObjectId
    portal: str  # 99acres | magicbricks | nobroker | olx
    portal_listing_id: Optional[str] = None
    portal_listing_url: Optional[str] = None
    status: str = "pending"  # pending | posted | failed | expired
    posted_at: Optional[datetime] = None
    error_log: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "portal_posts"
        indexes = [
            IndexModel([("property_id", 1)]),
            IndexModel([("portal", 1)]),
            IndexModel([("status", 1)]),
        ]


class WhatsappDispatch(Document):
    agency_id: PydanticObjectId
    agent_id: PydanticObjectId
    type: str  # lead_digest | follow_up_reminder | deal_update
    lead_ids: List[PydanticObjectId] = []
    status: str = "pending"  # pending | sent | delivered | failed
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "whatsapp_dispatches"
        indexes = [
            IndexModel([("agency_id", 1)]),
            IndexModel([("agent_id", 1)]),
            IndexModel([("status", 1)]),
        ]


class AssignmentRequest(Document):
    """Agent requests collaboration rights on a property owned by another agent."""
    property_id: PydanticObjectId
    requester_id: PydanticObjectId   # agent who wants access
    owner_id: PydanticObjectId       # primary agent / property owner
    company_id: PydanticObjectId
    status: str = "pending"          # pending | approved | denied
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "assignment_requests"
        indexes = [
            IndexModel([("property_id", 1)]),
            IndexModel([("requester_id", 1)]),
            IndexModel([("owner_id", 1)]),
            IndexModel([("company_id", 1)]),
            IndexModel([("status", 1)]),
        ]


class AgencyInvite(Document):
    """Admin invites an agent to join their agency — agent must accept."""
    agency_id: PydanticObjectId
    agency_name: str = ""
    agent_id: PydanticObjectId
    invited_by: PydanticObjectId          # admin user id
    status: str = "pending"              # pending | accepted | declined
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "agency_invites"
        indexes = [
            IndexModel([("agency_id", 1)]),
            IndexModel([("agent_id", 1)]),
            IndexModel([("status", 1)]),
        ]


class MatchingSession(Document):
    agent_id: PydanticObjectId
    lead_id: PydanticObjectId
    requirements: Optional[Dict[str, Any]] = None
    results: List[MatchResult] = []
    shared_via_whatsapp: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "matching_sessions"
        indexes = [
            IndexModel([("agent_id", 1)]),
            IndexModel([("lead_id", 1)]),
        ]
