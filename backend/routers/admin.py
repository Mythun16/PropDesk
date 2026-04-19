import secrets
from fastapi import APIRouter, Depends, HTTPException

from models import User, Property, Lead, Agency
from schemas import AgencyUpdate
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Counts across both old and new status values
_AVAILABLE_STATUSES = ["available"]
_IN_DISCUSSION_STATUSES = ["in_discussion", "committed", "negotiating"]
_CLOSED_STATUSES = ["deal_closed", "closed"]


@router.get("/dashboard")
async def admin_dashboard(admin: User = Depends(require_admin)):
    company_id = admin.company_id

    total_agents = await User.find(
        {"role": {"$in": ["agent", "telecaller"]}, "company_id": company_id}
    ).count()

    available = await Property.find(
        {"company_id": company_id, "status": {"$in": _AVAILABLE_STATUSES}}
    ).count()
    in_discussion = await Property.find(
        {"company_id": company_id, "status": {"$in": _IN_DISCUSSION_STATUSES}}
    ).count()
    deal_closed = await Property.find(
        {"company_id": company_id, "status": {"$in": _CLOSED_STATUSES}}
    ).count()
    withdrawn = await Property.find(
        {"company_id": company_id, "status": "withdrawn"}
    ).count()

    total_leads = await Lead.find({"company_id": company_id}).count()
    unverified_leads = await Lead.find(
        {"company_id": company_id, "telecaller_verified": False, "status": "new"}
    ).count()

    # Closed deals by month
    closed_pipeline = [
        {"$match": {"company_id": company_id, "status": {"$in": _CLOSED_STATUSES}}},
        {
            "$group": {
                "_id": {
                    "month": {"$month": "$closed_date"},
                    "year": {"$year": "$closed_date"},
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 6},
    ]
    closed_by_month = await Property.aggregate(closed_pipeline).to_list()

    # Properties per agent
    agent_pipeline = [
        {"$match": {"company_id": company_id}},
        {"$group": {"_id": "$agent_id", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    per_agent_raw = await Property.aggregate(agent_pipeline).to_list()

    per_agent = []
    for item in per_agent_raw:
        agent = await User.get(item["_id"])
        per_agent.append(
            {
                "agent_id": str(item["_id"]),
                "agent_name": agent.full_name if agent else "Unknown",
                "total": item["total"],
            }
        )

    # Leads by source
    source_pipeline = [
        {"$match": {"company_id": company_id, "source": {"$ne": None}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    leads_by_source = await Lead.aggregate(source_pipeline).to_list()

    return {
        "total_agents": total_agents,
        "listings_by_status": {
            "available": available,
            "in_discussion": in_discussion,
            "committed": in_discussion,  # legacy key
            "deal_closed": deal_closed,
            "closed": deal_closed,       # legacy key
            "withdrawn": withdrawn,
            "total": available + in_discussion + deal_closed + withdrawn,
        },
        "total_leads": total_leads,
        "unverified_leads": unverified_leads,
        "closed_by_month": [
            {
                "month": item["_id"]["month"],
                "year": item["_id"]["year"],
                "count": item["count"],
            }
            for item in closed_by_month
        ],
        "listings_per_agent": per_agent,
        "leads_by_source": [
            {"source": item["_id"], "count": item["count"]}
            for item in leads_by_source
        ],
    }


@router.get("/company")
async def get_agency(admin: User = Depends(require_admin)):
    agency = await Agency.get(admin.company_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agents_count = await User.find(
        {"role": {"$in": ["agent", "telecaller"]}, "company_id": admin.company_id}
    ).count()
    return {
        "id": str(agency.id),
        "name": agency.name,
        "owner_name": agency.owner_name,
        "phone": agency.phone,
        "email": agency.email,
        "city": agency.city,
        "whatsapp_number": agency.whatsapp_number,
        "lead_dispatch_time": agency.lead_dispatch_time,
        "total_agents": agents_count,
        "created_at": agency.created_at.isoformat(),
    }


@router.put("/company")
async def update_agency(body: AgencyUpdate, admin: User = Depends(require_admin)):
    agency = await Agency.get(admin.company_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    update_data = body.model_dump(exclude_none=True)
    for k, v in update_data.items():
        setattr(agency, k, v)
    await agency.save()

    return {
        "id": str(agency.id),
        "name": agency.name,
        "owner_name": agency.owner_name,
        "phone": agency.phone,
        "email": agency.email,
        "city": agency.city,
        "whatsapp_number": agency.whatsapp_number,
        "lead_dispatch_time": agency.lead_dispatch_time,
    }


@router.get("/join-code")
async def get_join_code(admin: User = Depends(require_admin)):
    agency = await Agency.get(admin.company_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    if not agency.join_code:
        agency.join_code = secrets.token_hex(3).upper()
        await agency.save()
    return {"join_code": agency.join_code, "company_name": agency.name}


@router.post("/join-code/regenerate")
async def regenerate_join_code(admin: User = Depends(require_admin)):
    agency = await Agency.get(admin.company_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agency.join_code = secrets.token_hex(3).upper()
    await agency.save()
    return {"join_code": agency.join_code, "company_name": agency.name}


@router.get("/pending-agents")
async def pending_agents(admin: User = Depends(require_admin)):
    agents = await User.find(
        {"role": {"$in": ["agent", "telecaller"]}, "company_id": None}
    ).to_list()
    return [
        {
            "id": str(a.id),
            "full_name": a.full_name,
            "email": a.email,
            "role": a.role,
            "auth_provider": a.auth_provider,
            "created_at": a.created_at.isoformat(),
        }
        for a in agents
    ]
