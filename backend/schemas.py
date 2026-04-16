from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId


# ── Auth ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str  # "admin" or "agent"


class GoogleAuthRequest(BaseModel):
    credential: str
    role: str  # "admin" or "agent"


class CompleteOnboardingRequest(BaseModel):
    role: Optional[str] = None          # optional for legacy guest onboarding
    company_name: Optional[str] = None  # admins: create a new company
    join_code: Optional[str] = None     # agents: join an existing company


class TokenResponse(BaseModel):
    token: str
    role: str
    is_new_user: bool
    last_page: str
    token_type: str = "bearer"
    user: dict


class TrackLastPageRequest(BaseModel):
    last_page: str


# ── User / Agent ──────────────────────────────────────────────────────
class CreateAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str


class AssignCompanyRequest(BaseModel):
    company_id: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    company_id: Optional[str] = None
    is_new_user: bool
    last_page: str
    last_login: Optional[datetime] = None
    is_active: bool
    auth_provider: str
    created_at: datetime


# ── Listing ───────────────────────────────────────────────────────────
class ListingCreate(BaseModel):
    location: str
    district: str
    total_area_sqft: float
    price_per_sqft: float
    total_property_value: float
    property_type: str
    dimensions: str
    open_sides: int
    construction_done: str
    facing: str
    boundary_wall: bool
    floors_allowed: int
    images: List[str] = []
    description: Optional[str] = None


class ListingUpdate(BaseModel):
    location: Optional[str] = None
    district: Optional[str] = None
    total_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    total_property_value: Optional[float] = None
    property_type: Optional[str] = None
    dimensions: Optional[str] = None
    open_sides: Optional[int] = None
    construction_done: Optional[str] = None
    facing: Optional[str] = None
    boundary_wall: Optional[bool] = None
    floors_allowed: Optional[int] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None


class CommitRequest(BaseModel):
    committed_client_name: str
    committed_client_phone: str
    committed_date: Optional[datetime] = None


# ── Lead ──────────────────────────────────────────────────────────────
class LeadCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    preferred_location: str
    preferred_district: str
    preferred_property_type: str
    budget_min: float
    budget_max: float
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    facing_preference: Optional[str] = None
    open_sides_needed: Optional[int] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
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
    linked_listing_id: Optional[str] = None


# ── Company ───────────────────────────────────────────────────────────
class CompanyUpdate(BaseModel):
    name: str
