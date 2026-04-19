from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId


# ── Auth ───────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str  # "admin" | "agent" | "telecaller"


class GoogleAuthRequest(BaseModel):
    credential: str
    role: str  # "admin" | "agent"


class CompleteOnboardingRequest(BaseModel):
    role: Optional[str] = None
    company_name: Optional[str] = None  # admins: create agency
    join_code: Optional[str] = None     # agents/telecallers: join agency
    phone: Optional[str] = None          # collected on last onboarding step


class TokenResponse(BaseModel):
    token: str
    role: str
    is_new_user: bool
    last_page: str
    token_type: str = "bearer"
    user: dict


class TrackLastPageRequest(BaseModel):
    last_page: str


# ── Agency (was Company) ───────────────────────────────────────────────

class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    whatsapp_number: Optional[str] = None
    lead_dispatch_time: Optional[str] = None  # e.g. "09:00"


# Backward-compat alias
CompanyUpdate = AgencyUpdate


# ── Agent / User ───────────────────────────────────────────────────────

class CreateAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str = "agent"              # agent | telecaller
    language: str = "en"            # en | ta | hi


class AssignCompanyRequest(BaseModel):
    company_id: str


class AgentProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None           # en | ta | hi
    whatsapp_opted_in: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    company_id: Optional[str] = None
    language: str = "en"
    whatsapp_opted_in: bool = False
    is_new_user: bool
    last_page: str
    last_login: Optional[datetime] = None
    is_active: bool
    auth_provider: str
    created_at: datetime


# ── Location sub-schema ────────────────────────────────────────────────

class LocationDetailSchema(BaseModel):
    city: str
    locality: Optional[str] = None
    pincode: Optional[str] = None
    coordinates: Optional[Dict[str, Any]] = None  # GeoJSON Point


# ── Property (was Listing) ─────────────────────────────────────────────

class PropertyCreate(BaseModel):
    # Required
    property_type: str                    # house | plot
    transaction_type: str                 # sell | rent | lease

    # Either title or legacy location string
    title: Optional[str] = None

    # New structured location
    location_detail: Optional[LocationDetailSchema] = None

    # Legacy flat location (still accepted)
    location: Optional[str] = None
    district: Optional[str] = None

    description: Optional[str] = None

    # New single price
    price: Optional[float] = None
    is_negotiable: bool = False

    facing: Optional[str] = None

    # New flexible details
    details: Optional[Dict[str, Any]] = None

    # Legacy detail fields (still accepted)
    total_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    total_property_value: Optional[float] = None
    dimensions: Optional[str] = None
    open_sides: Optional[int] = None
    construction_done: Optional[str] = None
    boundary_wall: Optional[bool] = None
    floors_allowed: Optional[int] = None

    # Photos — accept either name
    photos: Optional[List[str]] = None
    images: Optional[List[str]] = None

    nearby_amenities: Optional[Dict[str, Any]] = None


class PropertyUpdate(BaseModel):
    property_type: Optional[str] = None
    transaction_type: Optional[str] = None
    title: Optional[str] = None
    location_detail: Optional[LocationDetailSchema] = None
    location: Optional[str] = None
    district: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    is_negotiable: Optional[bool] = None
    facing: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    total_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    total_property_value: Optional[float] = None
    dimensions: Optional[str] = None
    open_sides: Optional[int] = None
    construction_done: Optional[str] = None
    boundary_wall: Optional[bool] = None
    floors_allowed: Optional[int] = None
    photos: Optional[List[str]] = None
    images: Optional[List[str]] = None
    nearby_amenities: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


# Backward-compat aliases
ListingCreate = PropertyCreate
ListingUpdate = PropertyUpdate


class CommitRequest(BaseModel):
    committed_client_name: str
    committed_client_phone: str
    committed_date: Optional[datetime] = None


class AssignAgentRequest(BaseModel):
    agent_id: str
    status: str = "available"


# ── Lead ───────────────────────────────────────────────────────────────

class ClientInfoSchema(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


class RequirementsSchema(BaseModel):
    """Flexible requirements bag — all fields optional."""
    preferred_location: Optional[str] = None
    preferred_district: Optional[str] = None
    preferred_property_type: Optional[str] = None   # house | plot | Any
    transaction_type: Optional[str] = None           # sell | rent | lease
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    facing_preference: Optional[str] = None
    open_sides_needed: Optional[int] = None
    extra: Optional[Dict[str, Any]] = None


class LeadCreate(BaseModel):
    # New nested client — preferred
    client: Optional[ClientInfoSchema] = None

    # Old flat client fields — still accepted for backward compat
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None

    source: Optional[str] = None  # 99acres|magicbricks|nobroker|olx|walk_in|agent_upload|whatsapp

    # New nested requirements — preferred
    requirements: Optional[RequirementsSchema] = None

    # Old flat requirement fields — still accepted
    preferred_location: Optional[str] = None
    preferred_district: Optional[str] = None
    preferred_property_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    facing_preference: Optional[str] = None
    open_sides_needed: Optional[int] = None

    notes: Optional[str] = None
    follow_up_at: Optional[datetime] = None
    property_id: Optional[str] = None


class LeadUpdate(BaseModel):
    client: Optional[ClientInfoSchema] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    source: Optional[str] = None
    requirements: Optional[RequirementsSchema] = None
    preferred_location: Optional[str] = None
    preferred_district: Optional[str] = None
    preferred_property_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    facing_preference: Optional[str] = None
    open_sides_needed: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    telecaller_verified: Optional[bool] = None
    follow_up_at: Optional[datetime] = None
    # Accept both old and new property link names
    linked_listing_id: Optional[str] = None
    property_id: Optional[str] = None


# ── Portal Posts ───────────────────────────────────────────────────────

class PortalPostCreate(BaseModel):
    property_id: str
    portal: str  # 99acres | magicbricks | nobroker | olx


class PortalPostUpdate(BaseModel):
    portal_listing_id: Optional[str] = None
    portal_listing_url: Optional[str] = None
    status: Optional[str] = None   # pending | posted | failed | expired
    error_log: Optional[str] = None


# ── WhatsApp Dispatch ──────────────────────────────────────────────────

class WhatsappDispatchCreate(BaseModel):
    agent_id: str
    type: str           # lead_digest | follow_up_reminder | deal_update
    lead_ids: List[str] = []


class WhatsappStatusUpdate(BaseModel):
    status: str  # sent | delivered | failed


# ── Matching Session ───────────────────────────────────────────────────

class MatchingSessionCreate(BaseModel):
    lead_id: str
    requirements: Optional[Dict[str, Any]] = None  # override lead's requirements
