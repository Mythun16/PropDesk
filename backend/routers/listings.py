import re
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from models import User, Listing
from schemas import ListingCreate, ListingUpdate, CommitRequest
from auth import get_current_user, require_company

router = APIRouter(prefix="/api/listings", tags=["Listings"])


def _listing_out(listing: Listing, agent_name: str = "") -> dict:
    return {
        "id": str(listing.id),
        "set_no": listing.set_no,
        "agent_id": str(listing.agent_id),
        "agent_name": agent_name,
        "company_id": str(listing.company_id),
        "location": listing.location,
        "district": listing.district,
        "total_area_sqft": listing.total_area_sqft,
        "price_per_sqft": listing.price_per_sqft,
        "total_property_value": listing.total_property_value,
        "property_type": listing.property_type,
        "dimensions": listing.dimensions,
        "open_sides": listing.open_sides,
        "construction_done": listing.construction_done,
        "facing": listing.facing,
        "boundary_wall": listing.boundary_wall,
        "floors_allowed": listing.floors_allowed,
        "images": listing.images,
        "description": listing.description,
        "status": listing.status,
        "committed_client_name": listing.committed_client_name,
        "committed_client_phone": listing.committed_client_phone,
        "committed_date": listing.committed_date.isoformat() if listing.committed_date else None,
        "closed_date": listing.closed_date.isoformat() if listing.closed_date else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
    }


@router.post("/")
async def create_listing(body: ListingCreate, user: User = Depends(require_company)):
    if user.role not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Not allowed")

    highest_listing = await Listing.find(Listing.company_id == user.company_id).sort("-set_no").first_or_none()
    set_no = (highest_listing.set_no + 1) if highest_listing else 1

    listing = Listing(
        set_no=set_no,
        agent_id=user.id,
        company_id=user.company_id,
        **body.model_dump(),
    )
    await listing.insert()
    return _listing_out(listing, user.full_name)


@router.get("/")
async def search_listings(
    user: User = Depends(require_company),
    district: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    min_area: Optional[float] = Query(None),
    max_area: Optional[float] = Query(None),
    min_price_sqft: Optional[float] = Query(None),
    max_price_sqft: Optional[float] = Query(None),
    min_value: Optional[float] = Query(None),
    max_value: Optional[float] = Query(None),
    open_sides: Optional[int] = Query(None),
    facing: Optional[str] = Query(None),
    boundary_wall: Optional[bool] = Query(None),
    construction_done: Optional[str] = Query(None),
    min_floors: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    agent_only: Optional[bool] = Query(None),
):
    # agent_only=true → show only this user's own listings
    # otherwise → show all listings across all agents/companies
    query: dict = {}

    if agent_only:
        query["agent_id"] = user.id
    if district:
        query["district"] = {"$regex": re.escape(district), "$options": "i"}
    if location:
        query["location"] = {"$regex": re.escape(location), "$options": "i"}
    if property_type and property_type != "All":
        query["property_type"] = property_type
    if min_area is not None:
        query.setdefault("total_area_sqft", {})["$gte"] = min_area
    if max_area is not None:
        query.setdefault("total_area_sqft", {})["$lte"] = max_area
    if min_price_sqft is not None:
        query.setdefault("price_per_sqft", {})["$gte"] = min_price_sqft
    if max_price_sqft is not None:
        query.setdefault("price_per_sqft", {})["$lte"] = max_price_sqft
    if min_value is not None:
        query.setdefault("total_property_value", {})["$gte"] = min_value
    if max_value is not None:
        query.setdefault("total_property_value", {})["$lte"] = max_value
    if open_sides is not None:
        query["open_sides"] = open_sides
    if facing:
        query["facing"] = facing
    if boundary_wall is not None:
        query["boundary_wall"] = boundary_wall
    if construction_done:
        query["construction_done"] = construction_done
    if min_floors is not None:
        query.setdefault("floors_allowed", {})["$gte"] = min_floors
    if status and status != "All":
        query["status"] = status

    listings = await Listing.find(query).sort("-created_at").to_list()

    # Populate agent names
    agent_ids = list({l.agent_id for l in listings})
    agents = await User.find({"_id": {"$in": agent_ids}}).to_list()
    agent_map = {a.id: a.full_name for a in agents}

    return [_listing_out(l, agent_map.get(l.agent_id, "Unknown")) for l in listings]


@router.get("/{listing_id}")
async def get_listing(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    listing = await Listing.get(ObjectId(listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    agent = await User.get(listing.agent_id)
    agent_name = agent.full_name if agent else "Unknown"
    return _listing_out(listing, agent_name)


@router.put("/{listing_id}")
async def update_listing(
    listing_id: str, body: ListingUpdate, user: User = Depends(require_company)
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    listing = await Listing.get(ObjectId(listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.agent_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your listing")

    update_data = body.model_dump(exclude_none=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await listing.update({"$set": update_data})
        listing = await Listing.get(listing.id)

    agent = await User.get(listing.agent_id)
    return _listing_out(listing, agent.full_name if agent else "Unknown")


@router.delete("/{listing_id}")
async def delete_listing(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    listing = await Listing.get(ObjectId(listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.agent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    if listing.status != "available":
        raise HTTPException(status_code=400, detail="Can only delete available listings")

    await listing.delete()
    return {"detail": "Listing deleted"}


@router.patch("/{listing_id}/commit")
async def commit_listing(
    listing_id: str, body: CommitRequest, user: User = Depends(require_company)
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    listing = await Listing.get(ObjectId(listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != "available":
        raise HTTPException(status_code=400, detail="Listing is not available")

    listing.status = "committed"
    listing.committed_client_name = body.committed_client_name
    listing.committed_client_phone = body.committed_client_phone
    listing.committed_date = body.committed_date or datetime.utcnow()
    listing.updated_at = datetime.utcnow()
    await listing.save()

    agent = await User.get(listing.agent_id)
    return _listing_out(listing, agent.full_name if agent else "Unknown")


@router.patch("/{listing_id}/close")
async def close_listing(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    listing = await Listing.get(ObjectId(listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.agent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    if listing.status != "committed":
        raise HTTPException(status_code=400, detail="Listing must be committed first")

    listing.status = "closed"
    listing.closed_date = datetime.utcnow()
    listing.updated_at = datetime.utcnow()
    await listing.save()

    agent = await User.get(listing.agent_id)
    return _listing_out(listing, agent.full_name if agent else "Unknown")
