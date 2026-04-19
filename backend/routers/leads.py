from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from models import User, Lead, ClientInfo
from schemas import LeadCreate, LeadUpdate
from auth import require_company

router = APIRouter(prefix="/api/leads", tags=["Leads"])

VALID_STATUSES = {
    "new", "contacted", "follow_up", "site_visit",
    "negotiating", "converted", "lost",
    "in_progress",  # legacy — still accepted
}

VALID_SOURCES = {
    "99acres", "magicbricks", "nobroker", "olx",
    "walk_in", "agent_upload", "whatsapp",
}


def _resolve_client(lead: Lead) -> dict:
    """Return client dict preferring nested ClientInfo, falling back to flat fields."""
    if lead.client:
        return {
            "name": lead.client.name,
            "phone": lead.client.phone,
            "email": lead.client.email,
        }
    return {
        "name": lead.client_name or "",
        "phone": lead.client_phone or "",
        "email": lead.client_email,
    }


def _resolve_requirements(lead: Lead) -> dict:
    """Return requirements dict preferring nested object, falling back to flat fields."""
    if lead.requirements:
        return lead.requirements
    return {
        "preferred_location": lead.preferred_location,
        "preferred_district": lead.preferred_district,
        "preferred_property_type": lead.preferred_property_type,
        "budget_min": lead.budget_min,
        "budget_max": lead.budget_max,
        "area_min_sqft": lead.area_min_sqft,
        "area_max_sqft": lead.area_max_sqft,
        "facing_preference": lead.facing_preference,
        "open_sides_needed": lead.open_sides_needed,
    }


def _lead_out(lead: Lead) -> dict:
    client = _resolve_client(lead)
    requirements = _resolve_requirements(lead)
    linked_id = lead.property_id or lead.linked_listing_id

    return {
        "id": str(lead.id),
        "agent_id": str(lead.agent_id or lead.assigned_to or ""),
        "assigned_to": str(lead.assigned_to or lead.agent_id or ""),
        "agency_id": str(lead.agency_id or lead.company_id or ""),
        "company_id": str(lead.company_id or lead.agency_id or ""),
        # New nested client
        "client": client,
        # Legacy flat fields (backward compat for frontend)
        "client_name": client["name"],
        "client_phone": client["phone"],
        "client_email": client["email"],
        "source": lead.source,
        # New nested requirements
        "requirements": requirements,
        # Legacy flat fields (backward compat)
        "preferred_location": lead.preferred_location or requirements.get("preferred_location"),
        "preferred_district": lead.preferred_district or requirements.get("preferred_district"),
        "preferred_property_type": lead.preferred_property_type or requirements.get("preferred_property_type"),
        "budget_min": lead.budget_min or requirements.get("budget_min"),
        "budget_max": lead.budget_max or requirements.get("budget_max"),
        "area_min_sqft": lead.area_min_sqft or requirements.get("area_min_sqft"),
        "area_max_sqft": lead.area_max_sqft or requirements.get("area_max_sqft"),
        "facing_preference": lead.facing_preference or requirements.get("facing_preference"),
        "open_sides_needed": lead.open_sides_needed or requirements.get("open_sides_needed"),
        "notes": lead.notes,
        "status": lead.status,
        "telecaller_verified": lead.telecaller_verified,
        "follow_up_at": lead.follow_up_at.isoformat() if lead.follow_up_at else None,
        "property_id": str(linked_id) if linked_id else None,
        "linked_listing_id": str(linked_id) if linked_id else None,  # legacy alias
        "created_at": lead.created_at.isoformat(),
        "updated_at": lead.updated_at.isoformat(),
    }


@router.post("/")
async def create_lead(body: LeadCreate, user: User = Depends(require_company)):
    # Resolve client info — prefer nested, fall back to flat
    if body.client:
        client_obj = ClientInfo(
            name=body.client.name,
            phone=body.client.phone,
            email=body.client.email,
        )
        client_name = body.client.name
        client_phone = body.client.phone
        client_email = body.client.email
    else:
        client_obj = ClientInfo(
            name=body.client_name or "",
            phone=body.client_phone or "",
            email=body.client_email,
        )
        client_name = body.client_name
        client_phone = body.client_phone
        client_email = body.client_email

    # Resolve requirements — prefer nested, fall back to flat
    requirements = body.requirements.model_dump(exclude_none=True) if body.requirements else None

    property_oid = None
    if body.property_id and ObjectId.is_valid(body.property_id):
        property_oid = ObjectId(body.property_id)

    lead = Lead(
        agent_id=user.id,
        assigned_to=user.id,
        company_id=user.company_id,
        agency_id=user.company_id,
        client=client_obj,
        client_name=client_name,
        client_phone=client_phone,
        client_email=client_email,
        source=body.source,
        requirements=requirements,
        preferred_location=body.preferred_location,
        preferred_district=body.preferred_district,
        preferred_property_type=body.preferred_property_type,
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        area_min_sqft=body.area_min_sqft,
        area_max_sqft=body.area_max_sqft,
        facing_preference=body.facing_preference,
        open_sides_needed=body.open_sides_needed,
        notes=body.notes,
        follow_up_at=body.follow_up_at,
        property_id=property_oid,
    )
    await lead.insert()
    return _lead_out(lead)


@router.get("/")
async def list_leads(
    user: User = Depends(require_company),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    telecaller_verified: Optional[bool] = Query(None),
    all_agents: Optional[bool] = Query(None),  # admin only: see all leads in agency
):
    query: dict = {}

    if all_agents and user.role == "admin":
        query["company_id"] = user.company_id
    else:
        query["agent_id"] = user.id

    if status and status != "All":
        query["status"] = status
    if source:
        query["source"] = source
    if telecaller_verified is not None:
        query["telecaller_verified"] = telecaller_verified

    leads = await Lead.find(query).sort("-created_at").to_list()
    return [_lead_out(ld) for ld in leads]


@router.get("/{lead_id}")
async def get_lead(lead_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    lead = await Lead.get(ObjectId(lead_id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.agent_id != user.id and lead.assigned_to != user.id and user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Not your lead")
    return _lead_out(lead)


@router.put("/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user: User = Depends(require_company)):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    lead = await Lead.get(ObjectId(lead_id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.agent_id != user.id and lead.assigned_to != user.id and user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Not your lead")

    update_data = body.model_dump(exclude_none=True)

    # Resolve nested client update
    if "client" in update_data:
        c = update_data.pop("client")
        update_data["client"] = ClientInfo(**c)
        update_data.setdefault("client_name", c.get("name"))
        update_data.setdefault("client_phone", c.get("phone"))
        update_data.setdefault("client_email", c.get("email"))

    # Resolve requirements update
    if "requirements" in update_data:
        req = update_data["requirements"]
        if hasattr(req, "model_dump"):
            update_data["requirements"] = req.model_dump(exclude_none=True)

    # Resolve property link — accept both field names
    prop_id_raw = update_data.pop("property_id", None) or update_data.pop("linked_listing_id", None)
    if prop_id_raw is not None:
        oid = ObjectId(prop_id_raw) if prop_id_raw and ObjectId.is_valid(prop_id_raw) else None
        update_data["property_id"] = oid
        update_data["linked_listing_id"] = oid

    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use one of: {', '.join(sorted(VALID_STATUSES))}")

    update_data["updated_at"] = datetime.utcnow()

    if update_data:
        await lead.update({"$set": update_data})
        lead = await Lead.get(lead.id)

    return _lead_out(lead)


@router.patch("/{lead_id}/verify")
async def verify_lead(lead_id: str, user: User = Depends(require_company)):
    """Mark a lead as telecaller-verified."""
    if user.role not in ("telecaller", "admin"):
        raise HTTPException(status_code=403, detail="Telecaller or admin access required")
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    lead = await Lead.get(ObjectId(lead_id))
    if not lead or lead.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.telecaller_verified = True
    lead.status = "contacted"
    lead.updated_at = datetime.utcnow()
    await lead.save()
    return _lead_out(lead)
