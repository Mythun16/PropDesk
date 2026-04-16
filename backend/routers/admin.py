import secrets
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from models import User, Listing, Lead, Company
from schemas import CompanyUpdate
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard")
async def admin_dashboard(admin: User = Depends(require_admin)):
    company_id = admin.company_id

    total_agents = await User.find(
        User.role == "agent", User.company_id == company_id
    ).count()

    # Listings by status
    available = await Listing.find(
        Listing.company_id == company_id, Listing.status == "available"
    ).count()
    committed = await Listing.find(
        Listing.company_id == company_id, Listing.status == "committed"
    ).count()
    closed = await Listing.find(
        Listing.company_id == company_id, Listing.status == "closed"
    ).count()

    total_leads = await Lead.find(Lead.company_id == company_id).count()

    # Closed by month — MongoDB aggregation
    closed_pipeline = [
        {"$match": {"company_id": company_id, "status": "closed"}},
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
    closed_by_month = await Listing.aggregate(closed_pipeline).to_list()

    # Listings per agent
    agent_pipeline = [
        {"$match": {"company_id": company_id}},
        {"$group": {"_id": "$agent_id", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    listings_per_agent_raw = await Listing.aggregate(agent_pipeline).to_list()

    # Resolve agent names
    listings_per_agent = []
    for item in listings_per_agent_raw:
        agent = await User.get(item["_id"])
        listings_per_agent.append(
            {
                "agent_id": str(item["_id"]),
                "agent_name": agent.full_name if agent else "Unknown",
                "total": item["total"],
            }
        )

    return {
        "total_agents": total_agents,
        "listings_by_status": {
            "available": available,
            "committed": committed,
            "closed": closed,
            "total": available + committed + closed,
        },
        "total_leads": total_leads,
        "closed_by_month": [
            {
                "month": item["_id"]["month"],
                "year": item["_id"]["year"],
                "count": item["count"],
            }
            for item in closed_by_month
        ],
        "listings_per_agent": listings_per_agent,
    }


@router.get("/company")
async def get_company(admin: User = Depends(require_admin)):
    company = await Company.get(admin.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    agents_count = await User.find(
        User.role == "agent", User.company_id == admin.company_id
    ).count()
    return {
        "id": str(company.id),
        "name": company.name,
        "total_agents": agents_count,
        "created_at": company.created_at.isoformat(),
    }


@router.put("/company")
async def update_company(body: CompanyUpdate, admin: User = Depends(require_admin)):
    company = await Company.get(admin.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.name = body.name
    await company.save()
    return {"id": str(company.id), "name": company.name}


@router.get("/join-code")
async def get_join_code(admin: User = Depends(require_admin)):
    """Return (and lazily generate) the company join code."""
    company = await Company.get(admin.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not company.join_code:
        company.join_code = secrets.token_hex(3).upper()
        await company.save()
    return {"join_code": company.join_code, "company_name": company.name}


@router.post("/join-code/regenerate")
async def regenerate_join_code(admin: User = Depends(require_admin)):
    """Generate a brand-new join code (old one stops working immediately)."""
    company = await Company.get(admin.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.join_code = secrets.token_hex(3).upper()
    await company.save()
    return {"join_code": company.join_code, "company_name": company.name}


@router.get("/pending-agents")
async def pending_agents(admin: User = Depends(require_admin)):
    """List agents with no company assigned (Google OAuth users pending assignment)."""
    agents = await User.find(
        User.role == "agent", User.company_id == None
    ).to_list()
    return [
        {
            "id": str(a.id),
            "full_name": a.full_name,
            "email": a.email,
            "auth_provider": a.auth_provider,
            "created_at": a.created_at.isoformat(),
        }
        for a in agents
    ]
