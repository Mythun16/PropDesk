from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from models import User, Lead, WhatsappDispatch
from schemas import WhatsappDispatchCreate, WhatsappStatusUpdate
from auth import require_admin, require_company

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

VALID_TYPES = {"lead_digest", "follow_up_reminder", "deal_update"}
VALID_STATUSES = {"pending", "sent", "delivered", "failed"}


def _dispatch_out(d: WhatsappDispatch) -> dict:
    return {
        "id": str(d.id),
        "agency_id": str(d.agency_id),
        "agent_id": str(d.agent_id),
        "type": d.type,
        "lead_ids": [str(lid) for lid in d.lead_ids],
        "status": d.status,
        "sent_at": d.sent_at.isoformat() if d.sent_at else None,
        "created_at": d.created_at.isoformat(),
    }


@router.post("/dispatch")
async def create_dispatch(body: WhatsappDispatchCreate, admin: User = Depends(require_admin)):
    """Admin triggers a WhatsApp dispatch to an agent."""
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {', '.join(sorted(VALID_TYPES))}")
    if not ObjectId.is_valid(body.agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = await User.get(ObjectId(body.agent_id))
    if not agent or agent.company_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Agent not found in your agency")
    if not agent.whatsapp_opted_in:
        raise HTTPException(status_code=400, detail="Agent has not opted in to WhatsApp notifications")

    # Validate lead IDs belong to the agency
    lead_oids = []
    for lid in body.lead_ids:
        if not ObjectId.is_valid(lid):
            raise HTTPException(status_code=400, detail=f"Invalid lead_id: {lid}")
        lead = await Lead.get(ObjectId(lid))
        if not lead or lead.company_id != admin.company_id:
            raise HTTPException(status_code=404, detail=f"Lead {lid} not found")
        lead_oids.append(ObjectId(lid))

    dispatch = WhatsappDispatch(
        agency_id=admin.company_id,
        agent_id=ObjectId(body.agent_id),
        type=body.type,
        lead_ids=lead_oids,
        status="pending",
    )
    await dispatch.insert()

    # In production this would trigger the WhatsApp Business API.
    # For now we mark it as sent immediately as a placeholder.
    dispatch.status = "sent"
    dispatch.sent_at = datetime.utcnow()
    await dispatch.save()

    return _dispatch_out(dispatch)


@router.get("/dispatches")
async def list_dispatches(
    admin: User = Depends(require_admin),
    agent_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    query: dict = {"agency_id": admin.company_id}
    if agent_id:
        if not ObjectId.is_valid(agent_id):
            raise HTTPException(status_code=400, detail="Invalid agent_id")
        query["agent_id"] = ObjectId(agent_id)
    if type:
        query["type"] = type
    if status:
        query["status"] = status

    dispatches = await WhatsappDispatch.find(query).sort("-created_at").to_list()
    return [_dispatch_out(d) for d in dispatches]


@router.patch("/dispatches/{dispatch_id}/status")
async def update_dispatch_status(
    dispatch_id: str, body: WhatsappStatusUpdate, admin: User = Depends(require_admin)
):
    """Update delivery status (webhook callback from WhatsApp API)."""
    if not ObjectId.is_valid(dispatch_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    dispatch = await WhatsappDispatch.get(ObjectId(dispatch_id))
    if not dispatch or dispatch.agency_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    dispatch.status = body.status
    await dispatch.save()
    return _dispatch_out(dispatch)


@router.patch("/opt-in")
async def toggle_whatsapp_opt_in(body: dict, user: User = Depends(require_company)):
    """Agent toggles their own WhatsApp opt-in."""
    opted_in = body.get("whatsapp_opted_in")
    if opted_in is None:
        raise HTTPException(status_code=400, detail="whatsapp_opted_in (bool) is required")
    user.whatsapp_opted_in = bool(opted_in)
    await user.save()
    return {"whatsapp_opted_in": user.whatsapp_opted_in}
