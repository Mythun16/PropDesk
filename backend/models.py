from datetime import datetime
from typing import Optional, List

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel


class Company(Document):
    name: str
    join_code: Optional[str] = None   # 6-char code agents use to join this company
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "companies"


class User(Document):
    full_name: str
    email: str
    phone: Optional[str] = None
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str  # "agent" or "admin"
    # First-time onboarding state (production-grade SaaS pattern)
    is_new_user: bool = False
    last_page: str = "/agent/dashboard"
    last_login: Optional[datetime] = None
    company_id: Optional[PydanticObjectId] = None
    is_active: bool = True
    auth_provider: str  # "local" or "google"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", 1)], unique=True),
            # Only enforce uniqueness for real Google IDs.
            # Without this, local users with `google_id = null` can collide.
            IndexModel(
                [("google_id", 1)],
                unique=True,
                partialFilterExpression={"google_id": {"$type": "string"}},
            ),
        ]


class Listing(Document):
    set_no: int
    agent_id: PydanticObjectId
    company_id: PydanticObjectId
    location: str
    district: str
    total_area_sqft: float
    price_per_sqft: float
    total_property_value: float
    property_type: str  # "Residential" or "Commercial"
    dimensions: str
    open_sides: int  # 1-4
    construction_done: str  # "No", "Compound wall only", "Partial foundation", "Yes"
    facing: str  # "E","W","N","S","NE","NW","SE","SW"
    boundary_wall: bool
    floors_allowed: int
    images: List[str] = []
    description: Optional[str] = None
    status: str = "available"  # "available", "committed", "closed"
    committed_client_name: Optional[str] = None
    committed_client_phone: Optional[str] = None
    committed_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "listings"
        indexes = [
            IndexModel([("company_id", 1)]),
            IndexModel([("agent_id", 1)]),
            IndexModel([("district", 1)]),
            IndexModel([("status", 1)]),
        ]


class Lead(Document):
    agent_id: PydanticObjectId
    company_id: PydanticObjectId
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    preferred_location: str
    preferred_district: str
    preferred_property_type: str  # "Residential", "Commercial", "Any"
    budget_min: float
    budget_max: float
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    facing_preference: Optional[str] = None
    open_sides_needed: Optional[int] = None
    notes: Optional[str] = None
    status: str = "new"  # "new", "in_progress", "converted", "lost"
    linked_listing_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "leads"
