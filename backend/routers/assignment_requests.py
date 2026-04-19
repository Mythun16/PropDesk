from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from models import User, Property, AssignmentRequest, AssignedAgent
from auth import require_company, require_admin

router = APIRouter(prefix="/api/assignment-requests", tags=["Assignment Requests"])


def _request_out(
    req: AssignmentRequest,
    prop_info: dict = None,
    requester_name: str = "",
    owner_name: str = "",
) -> dict:
    return {
        "id": str(req.id),
        "property_id": str(req.property_id),
        "property_info": prop_info,
        "requester_id": str(req.requester_id),
        "requester_name": requester_name,
        "owner_id": str(req.owner_id),
        "owner_name": owner_name,
        "status": req.status,
        "message": req.message,
        "created_at": req.created_at.isoformat(),
        "updated_at": req.updated_at.isoformat(),
    }


async def _enrich(req: AssignmentRequest) -> dict:
    prop = await Property.get(req.property_id)
    prop_info = None
    if prop:
        locality = (
            (prop.location_detail.locality if prop.location_detail else None)
            or prop.location
            or ""
        )
        city = (
            (prop.location_detail.city if prop.location_detail else None)
            or prop.district
            or ""
        )
        prop_info = {
            "set_no": prop.set_no,
            "title": prop.title,
            "locality": locality,
            "city": city,
            "status": prop.status,
        }

    requester = await User.get(req.requester_id)
    owner = await User.get(req.owner_id)
    return _request_out(
        req,
        prop_info=prop_info,
        requester_name=requester.full_name if requester else "Unknown",
        owner_name=owner.full_name if owner else "Unknown",
    )


@router.post("/")
async def request_assignment(body: dict, user: User = Depends(require_company)):
    """Agent requests collaboration access to a property owned by another agent."""
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Only agents can request collaboration")

    property_id = (body.get("property_id") or "").strip()
    if not property_id or not ObjectId.is_valid(property_id):
        raise HTTPException(status_code=400, detail="Valid property_id required")

    prop = await Property.get(ObjectId(property_id))
    if not prop or prop.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Property not found")

    owner_id = prop.agent_id or prop.added_by
    if not owner_id:
        raise HTTPException(status_code=400, detail="Property has no owner")
    if str(owner_id) == str(user.id):
        raise HTTPException(status_code=400, detail="You already own this property")

    already_assigned = any(str(a.agent_id) == str(user.id) for a in prop.assigned_agents)
    if already_assigned:
        raise HTTPException(status_code=400, detail="You are already assigned to this property")

    existing = await AssignmentRequest.find_one({
        "property_id": prop.id,
        "requester_id": user.id,
        "status": "pending",
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request for this property")

    req = AssignmentRequest(
        property_id=prop.id,
        requester_id=user.id,
        owner_id=owner_id,
        company_id=user.company_id,
        message=body.get("message") or None,
    )
    await req.insert()
    return await _enrich(req)


@router.get("/")
async def list_requests(
    user: User = Depends(require_company),
    direction: Optional[str] = Query(None),  # "incoming" | "outgoing" | None=both
):
    """List assignment requests for the current agent."""
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Agents only")

    if direction == "incoming":
        reqs = await AssignmentRequest.find(
            {"owner_id": user.id}
        ).sort("-created_at").to_list()
    elif direction == "outgoing":
        reqs = await AssignmentRequest.find(
            {"requester_id": user.id}
        ).sort("-created_at").to_list()
    else:
        incoming = await AssignmentRequest.find(
            {"owner_id": user.id}
        ).sort("-created_at").to_list()
        outgoing = await AssignmentRequest.find(
            {"requester_id": user.id}
        ).sort("-created_at").to_list()
        # Merge, deduplicate by id
        seen = set()
        reqs = []
        for r in incoming + outgoing:
            if str(r.id) not in seen:
                seen.add(str(r.id))
                reqs.append(r)
        reqs.sort(key=lambda r: r.created_at, reverse=True)

    return [await _enrich(r) for r in reqs]


@router.get("/company")
async def company_collab_activity(admin: User = Depends(require_admin)):
    """Admin sees all collaboration requests (all statuses) within their company, newest first."""
    reqs = await AssignmentRequest.find(
        {"company_id": admin.company_id}
    ).sort("-updated_at").to_list()
    return [await _enrich(r) for r in reqs]


@router.patch("/{request_id}/approve")
async def approve_request(request_id: str, user: User = Depends(require_company)):
    """Property owner approves a collaboration request."""
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Agents only")
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    req = await AssignmentRequest.get(ObjectId(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if str(req.owner_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Only the property owner can approve")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    req.status = "approved"
    req.updated_at = datetime.utcnow()
    await req.save()

    # Add requester to property's assigned_agents
    prop = await Property.get(req.property_id)
    if prop:
        already = any(str(a.agent_id) == str(req.requester_id) for a in prop.assigned_agents)
        if not already:
            prop.assigned_agents.append(
                AssignedAgent(agent_id=req.requester_id, status="available")
            )
            prop.updated_at = datetime.utcnow()
            await prop.save()

    return await _enrich(req)


@router.patch("/{request_id}/deny")
async def deny_request(request_id: str, user: User = Depends(require_company)):
    """Property owner denies a collaboration request."""
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Agents only")
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    req = await AssignmentRequest.get(ObjectId(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if str(req.owner_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Only the property owner can deny")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    req.status = "denied"
    req.updated_at = datetime.utcnow()
    await req.save()
    return await _enrich(req)
