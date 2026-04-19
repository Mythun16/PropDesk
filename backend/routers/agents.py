from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from models import User, Property, Lead, Agency, AgencyInvite
from schemas import CreateAgentRequest, AssignCompanyRequest, AgentProfileUpdate
from auth import require_admin, require_company, get_current_user, hash_password

router = APIRouter(prefix="/api/agents", tags=["Agents"])

PROPERTY_STATUSES = {
    "available", "in_discussion", "negotiating", "deal_closed", "withdrawn",
    "committed", "closed",  # legacy
}


def _agent_out(agent: User, stats: dict = None) -> dict:
    out = {
        "id": str(agent.id),
        "full_name": agent.full_name,
        "email": agent.email,
        "phone": agent.phone,
        "avatar_url": agent.avatar_url,
        "role": agent.role,
        "company_id": str(agent.company_id) if agent.company_id else None,
        "language": agent.language,
        "whatsapp_opted_in": agent.whatsapp_opted_in,
        "is_active": agent.is_active,
        "auth_provider": agent.auth_provider,
        "created_at": agent.created_at.isoformat(),
    }
    if stats:
        out.update(stats)
    return out


async def _agent_stats(agent: User) -> dict:
    available = await Property.find(
        Property.agent_id == agent.id, Property.status == "available",
    ).count()
    in_discussion = await Property.find(
        Property.agent_id == agent.id,
        {"status": {"$in": ["in_discussion", "committed"]}},
    ).count()
    deal_closed = await Property.find(
        Property.agent_id == agent.id,
        {"status": {"$in": ["deal_closed", "closed"]}},
    ).count()
    total = await Property.find(Property.agent_id == agent.id).count()
    leads = await Lead.find(Lead.agent_id == agent.id).count()
    return {
        "listings_total": total,
        "listings_available": available,
        "listings_committed": in_discussion,   # legacy key kept
        "listings_in_discussion": in_discussion,
        "listings_closed": deal_closed,         # legacy key kept
        "listings_deal_closed": deal_closed,
        "leads_count": leads,
    }


@router.get("/")
async def list_agents(admin: User = Depends(require_admin)):
    agents = await User.find({
        "role": {"$in": ["agent", "telecaller"]},
        "$or": [
            {"company_id": admin.company_id},
            {"company_ids": admin.company_id}
        ]
    }).to_list()

    results = []
    for agent in agents:
        stats = await _agent_stats(agent)
        results.append(_agent_out(agent, stats))
    return results


@router.get("/my-invites")
async def my_invites(user: User = Depends(get_current_user)):
    """Agents see their pending agency invites."""
    if user.role not in ("agent", "telecaller"):
        raise HTTPException(status_code=403, detail="Agents only")
    invites = await AgencyInvite.find({"agent_id": user.id, "status": "pending"}).to_list()
    result = []
    for inv in invites:
        result.append({
            "id": str(inv.id),
            "agency_id": str(inv.agency_id),
            "agency_name": inv.agency_name or "Unknown",
            "status": inv.status,
            "created_at": inv.created_at.isoformat(),
        })
    return result


@router.get("/{agent_id}")
async def get_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent or agent.role not in ("agent", "telecaller"):
        raise HTTPException(status_code=404, detail="Agent not found")
    belongs = agent.company_id == admin.company_id or admin.company_id in (agent.company_ids or [])
    if not belongs:
        raise HTTPException(status_code=404, detail="Agent not found")

    properties = await Property.find(
        Property.agent_id == agent.id
    ).sort("-created_at").to_list()
    leads = await Lead.find(Lead.agent_id == agent.id).sort("-created_at").to_list()

    return {
        "agent": _agent_out(agent),
        "listings": [
            {
                "id": str(p.id),
                "set_no": p.set_no,
                "title": p.title,
                "location": p.location,
                "district": p.district,
                "total_area_sqft": p.total_area_sqft,
                "price": p.price or p.total_property_value,
                "total_property_value": p.total_property_value or p.price,
                "property_type": p.property_type,
                "transaction_type": p.transaction_type,
                "status": p.status,
                "created_at": p.created_at.isoformat(),
            }
            for p in properties
        ],
        "leads": [
            {
                "id": str(ld.id),
                "client": {
                    "name": ld.client.name if ld.client else (ld.client_name or ""),
                    "phone": ld.client.phone if ld.client else (ld.client_phone or ""),
                    "email": ld.client.email if ld.client else ld.client_email,
                },
                "client_name": ld.client.name if ld.client else ld.client_name,
                "client_phone": ld.client.phone if ld.client else ld.client_phone,
                "client_email": ld.client.email if ld.client else ld.client_email,
                "source": ld.source,
                "requirements": ld.requirements or {
                    "preferred_location": ld.preferred_location,
                    "preferred_district": ld.preferred_district,
                    "preferred_property_type": ld.preferred_property_type,
                    "budget_min": ld.budget_min,
                    "budget_max": ld.budget_max,
                },
                "preferred_location": ld.preferred_location,
                "preferred_district": ld.preferred_district,
                "preferred_property_type": ld.preferred_property_type,
                "budget_min": ld.budget_min,
                "budget_max": ld.budget_max,
                "status": ld.status,
                "telecaller_verified": ld.telecaller_verified,
                "created_at": ld.created_at.isoformat(),
            }
            for ld in leads
        ],
    }


@router.post("/")
async def create_agent(body: CreateAgentRequest, admin: User = Depends(require_admin)):
    if body.role not in ("agent", "telecaller"):
        raise HTTPException(status_code=400, detail="Role must be 'agent' or 'telecaller'")
    try:
        agent = User(
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            hashed_password=hash_password(body.password),
            role=body.role,
            auth_provider="local",
            company_id=admin.company_id,
            company_ids=[admin.company_id] if admin.company_id else [],
            language=body.language,
        )
        await agent.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    return _agent_out(agent)


@router.patch("/me/profile")
async def update_my_profile(body: AgentProfileUpdate, user: User = Depends(get_current_user)):
    """Agent/telecaller updates their own profile (language, whatsapp opt-in, etc.)."""
    update_data = body.model_dump(exclude_none=True)
    if update_data:
        for k, v in update_data.items():
            setattr(user, k, v)
        await user.save()
    return _agent_out(user)


@router.patch("/{agent_id}/deactivate")
async def deactivate_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    belongs = agent.company_id == admin.company_id or admin.company_id in (agent.company_ids or [])
    if not belongs:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = False
    await agent.save()
    return _agent_out(agent)


@router.patch("/{agent_id}/reactivate")
async def reactivate_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    belongs = agent.company_id == admin.company_id or admin.company_id in (agent.company_ids or [])
    if not belongs:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = True
    await agent.save()
    return _agent_out(agent)


@router.patch("/{agent_id}/assign-company")
async def assign_company(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.role not in ("agent", "telecaller"):
        raise HTTPException(status_code=400, detail="User is not an agent or telecaller")

    if admin.company_id not in agent.company_ids:
        agent.company_ids.append(admin.company_id)
    if not agent.company_id:
        agent.company_id = admin.company_id
    await agent.save()
    # propagate listings/leads only if this is the primary company
    if agent.company_id == admin.company_id:
        await Property.get_motor_collection().update_many(
            {"agent_id": agent.id},
            {"$set": {"company_id": admin.company_id, "agency_id": admin.company_id}},
        )
        await Lead.get_motor_collection().update_many(
            {"agent_id": agent.id},
            {"$set": {"company_id": admin.company_id, "agency_id": admin.company_id}},
        )
    return _agent_out(agent)


@router.post("/invite-by-email")
async def invite_agent_by_email(body: dict, admin: User = Depends(require_admin)):
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    agent = await User.find_one(User.email == email)
    if not agent:
        raise HTTPException(status_code=404, detail="No account found with this email")
    if agent.role not in ("agent", "telecaller"):
        raise HTTPException(status_code=400, detail="That account is not an agent or telecaller")
    already = agent.company_id == admin.company_id or admin.company_id in (agent.company_ids or [])
    if already:
        raise HTTPException(status_code=400, detail="Agent is already in your agency")

    existing = await AgencyInvite.find_one({
        "agency_id": admin.company_id, "agent_id": agent.id, "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="An invite is already pending for this agent")

    agency = await Agency.get(admin.company_id)
    invite = AgencyInvite(
        agency_id=admin.company_id,
        agency_name=agency.name if agency else "",
        agent_id=agent.id,
        invited_by=admin.id,
    )
    await invite.insert()
    return {"detail": f"Invite sent to {agent.full_name}", "agent_name": agent.full_name}


@router.post("/invites/{invite_id}/accept")
async def accept_invite(invite_id: str, user: User = Depends(get_current_user)):
    """Agent accepts an agency invite."""
    if not ObjectId.is_valid(invite_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    invite = await AgencyInvite.get(ObjectId(invite_id))
    if not invite or str(invite.agent_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Invite is no longer pending")

    invite.status = "accepted"
    await invite.save()

    # Add to company_ids; set primary if none set
    if invite.agency_id not in user.company_ids:
        user.company_ids.append(invite.agency_id)
    if not user.company_id:
        user.company_id = invite.agency_id
    await user.save()

    return {"detail": "Joined agency!", "agency_name": invite.agency_name}


@router.post("/invites/{invite_id}/decline")
async def decline_invite(invite_id: str, user: User = Depends(get_current_user)):
    """Agent declines an agency invite."""
    if not ObjectId.is_valid(invite_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    invite = await AgencyInvite.get(ObjectId(invite_id))
    if not invite or str(invite.agent_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Invite is no longer pending")

    invite.status = "declined"
    await invite.save()
    return {"detail": "Invite declined"}
