from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from models import User, Lead
from schemas import LeadCreate, LeadUpdate
from auth import require_company

router = APIRouter(prefix="/api/leads", tags=["Leads"])


@router.post("/")
async def create_lead(body: LeadCreate, user: User = Depends(require_company)):
    lead = Lead(
        agent_id=user.id,
        company_id=user.company_id,
        **body.model_dump(),
    )
    await lead.insert()
    return _lead_out(lead)


@router.get("/")
async def list_leads(user: User = Depends(require_company)):
    leads = await Lead.find(Lead.agent_id == user.id).sort("-created_at").to_list()
    return [_lead_out(ld) for ld in leads]


@router.put("/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user: User = Depends(require_company)):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    lead = await Lead.get(ObjectId(lead_id))
    if not lead or lead.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = body.model_dump(exclude_none=True)
    if "linked_listing_id" in update_data:
        val = update_data["linked_listing_id"]
        update_data["linked_listing_id"] = ObjectId(val) if val and ObjectId.is_valid(val) else None

    if update_data:
        await lead.update({"$set": update_data})
        lead = await Lead.get(lead.id)

    return _lead_out(lead)


def _lead_out(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "agent_id": str(lead.agent_id),
        "company_id": str(lead.company_id),
        "client_name": lead.client_name,
        "client_phone": lead.client_phone,
        "client_email": lead.client_email,
        "preferred_location": lead.preferred_location,
        "preferred_district": lead.preferred_district,
        "preferred_property_type": lead.preferred_property_type,
        "budget_min": lead.budget_min,
        "budget_max": lead.budget_max,
        "area_min_sqft": lead.area_min_sqft,
        "area_max_sqft": lead.area_max_sqft,
        "facing_preference": lead.facing_preference,
        "open_sides_needed": lead.open_sides_needed,
        "notes": lead.notes,
        "status": lead.status,
        "linked_listing_id": str(lead.linked_listing_id) if lead.linked_listing_id else None,
        "created_at": lead.created_at.isoformat(),
    }
