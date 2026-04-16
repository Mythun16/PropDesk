from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from models import User, Listing, Lead
from schemas import CreateAgentRequest, AssignCompanyRequest
from auth import require_admin, hash_password

router = APIRouter(prefix="/api/agents", tags=["Agents"])


def _agent_out(agent: User, stats: dict = None) -> dict:
    out = {
        "id": str(agent.id),
        "full_name": agent.full_name,
        "email": agent.email,
        "phone": agent.phone,
        "avatar_url": agent.avatar_url,
        "role": agent.role,
        "company_id": str(agent.company_id) if agent.company_id else None,
        "is_active": agent.is_active,
        "auth_provider": agent.auth_provider,
        "created_at": agent.created_at.isoformat(),
    }
    if stats:
        out.update(stats)
    return out


@router.get("/")
async def list_agents(admin: User = Depends(require_admin)):
    agents = await User.find(
        User.role == "agent", User.company_id == admin.company_id
    ).to_list()

    results = []
    for agent in agents:
        available = await Listing.find(
            Listing.agent_id == agent.id, Listing.status == "available",
        ).count()
        committed = await Listing.find(
            Listing.agent_id == agent.id, Listing.status == "committed",
        ).count()
        closed = await Listing.find(
            Listing.agent_id == agent.id, Listing.status == "closed",
        ).count()
        total_listings = available + committed + closed
        leads = await Lead.find(Lead.agent_id == agent.id).count()

        results.append(
            _agent_out(
                agent,
                {
                    "listings_total": total_listings,
                    "listings_available": available,
                    "listings_committed": committed,
                    "listings_closed": closed,
                    "leads_count": leads,
                },
            )
        )
    return results


@router.get("/{agent_id}")
async def get_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent or agent.company_id != admin.company_id or agent.role != "agent":
        raise HTTPException(status_code=404, detail="Agent not found")

    listings = await Listing.find(
        Listing.agent_id == agent.id
    ).sort("-created_at").to_list()
    leads = await Lead.find(Lead.agent_id == agent.id).sort("-created_at").to_list()

    return {
        "agent": _agent_out(agent),
        "listings": [
            {
                "id": str(l.id),
                "set_no": l.set_no,
                "location": l.location,
                "district": l.district,
                "total_area_sqft": l.total_area_sqft,
                "total_property_value": l.total_property_value,
                "property_type": l.property_type,
                "status": l.status,
                "created_at": l.created_at.isoformat(),
            }
            for l in listings
        ],
        "leads": [
            {
                "id": str(ld.id),
                "client_name": ld.client_name,
                "client_phone": ld.client_phone,
                "preferred_location": ld.preferred_location,
                "preferred_district": ld.preferred_district,
                "budget_min": ld.budget_min,
                "budget_max": ld.budget_max,
                "status": ld.status,
                "created_at": ld.created_at.isoformat(),
            }
            for ld in leads
        ],
    }


@router.post("/")
async def create_agent(body: CreateAgentRequest, admin: User = Depends(require_admin)):
    try:
        agent = User(
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            hashed_password=hash_password(body.password),
            role="agent",
            auth_provider="local",
            company_id=admin.company_id,
        )
        await agent.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    return _agent_out(agent)


@router.patch("/{agent_id}/deactivate")
async def deactivate_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent or agent.company_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = False
    await agent.save()
    return _agent_out(agent)


@router.patch("/{agent_id}/assign-company")
async def assign_company(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.role != "agent":
        raise HTTPException(status_code=400, detail="User is not an agent")

    agent.company_id = admin.company_id
    await agent.save()

    await Listing.get_motor_collection().update_many(
        {"agent_id": agent.id}, {"$set": {"company_id": admin.company_id}}
    )
    await Lead.get_motor_collection().update_many(
        {"agent_id": agent.id}, {"$set": {"company_id": admin.company_id}}
    )

    return _agent_out(agent)


@router.patch("/{agent_id}/reactivate")
async def reactivate_agent(agent_id: str, admin: User = Depends(require_admin)):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = await User.get(ObjectId(agent_id))
    if not agent or agent.company_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = True
    await agent.save()
    return _agent_out(agent)


@router.post("/invite-by-email")
async def invite_agent_by_email(body: dict, admin: User = Depends(require_admin)):
    """Pull any existing agent into this admin's company by their email address."""
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    agent = await User.find_one(User.email == email)
    if not agent:
        raise HTTPException(status_code=404, detail="No account found with this email")
    if agent.role != "agent":
        raise HTTPException(status_code=400, detail="That account is not an agent")
    if agent.company_id == admin.company_id:
        raise HTTPException(status_code=400, detail="Agent is already in your company")

    agent.company_id = admin.company_id
    agent.is_active = True
    await agent.save()

    # Re-home all the agent's listings and leads to the new company
    await Listing.get_motor_collection().update_many(
        {"agent_id": agent.id},
        {"$set": {"company_id": admin.company_id}},
    )
    await Lead.get_motor_collection().update_many(
        {"agent_id": agent.id},
        {"$set": {"company_id": admin.company_id}},
    )

    available = await Listing.find(Listing.agent_id == agent.id, Listing.status == "available").count()
    committed = await Listing.find(Listing.agent_id == agent.id, Listing.status == "committed").count()
    closed = await Listing.find(Listing.agent_id == agent.id, Listing.status == "closed").count()
    leads = await Lead.find(Lead.agent_id == agent.id).count()

    return _agent_out(agent, {
        "listings_total": available + committed + closed,
        "listings_available": available,
        "listings_committed": committed,
        "listings_closed": closed,
        "leads_count": leads,
    })
