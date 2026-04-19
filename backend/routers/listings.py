import re
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from models import User, Property, Lead, AssignedAgent, ClientInfo
from schemas import PropertyCreate, PropertyUpdate, CommitRequest, AssignAgentRequest
from auth import get_current_user, require_company

router = APIRouter(prefix="/api/listings", tags=["Properties"])

# Valid status values (new + legacy)
VALID_STATUSES = {
    "available", "in_discussion", "negotiating", "deal_closed", "withdrawn",
    "committed", "closed",  # legacy — still accepted
}


def _effective_photos(prop: Property) -> list:
    """Return photos preferring new 'photos' field, falling back to 'images'."""
    return prop.photos if prop.photos else prop.images


def _prop_out(prop: Property, agent_name: str = "", agent_phone: str = "", agent_email: str = "", assigned_agents_enriched=None, is_collaboration: bool = False) -> dict:
    location = None
    if prop.location_detail:
        location = {
            "city": prop.location_detail.city,
            "locality": prop.location_detail.locality,
            "pincode": prop.location_detail.pincode,
            "coordinates": prop.location_detail.coordinates,
        }
    elif prop.district or prop.location:
        location = {
            "city": prop.district or "",
            "locality": prop.location or "",
            "pincode": None,
            "coordinates": None,
        }

    details = prop.details or {}
    if not details:
        # Build details from legacy flat fields for backward compat
        if prop.total_area_sqft is not None:
            details["total_area_sqft"] = prop.total_area_sqft
        if prop.price_per_sqft is not None:
            details["price_per_sqft"] = prop.price_per_sqft
        if prop.dimensions is not None:
            details["dimensions"] = prop.dimensions
        if prop.open_sides is not None:
            details["open_sides"] = prop.open_sides
        if prop.construction_done is not None:
            details["construction_done"] = prop.construction_done
        if prop.boundary_wall is not None:
            details["boundary_wall"] = prop.boundary_wall
        if prop.floors_allowed is not None:
            details["floors_allowed"] = prop.floors_allowed

    return {
        "id": str(prop.id),
        "set_no": prop.set_no,
        "agent_id": str(prop.agent_id or prop.added_by or ""),
        "added_by": str(prop.added_by or prop.agent_id or ""),
        "agent_name": agent_name,
        "agent_phone": agent_phone,
        "agent_email": agent_email,
        "agency_id": str(prop.agency_id or prop.company_id or ""),
        "company_id": str(prop.company_id or prop.agency_id or ""),
        # New fields
        "property_type": prop.property_type,
        "transaction_type": prop.transaction_type,
        "title": prop.title,
        "description": prop.description,
        "price": prop.price if prop.price is not None else prop.total_property_value,
        "is_negotiable": prop.is_negotiable,
        "location": location,
        # Legacy flat location (kept for frontend backward compat)
        "location_str": prop.location,
        "district": prop.district,
        "facing": prop.facing,
        "details": details,
        # Legacy flat details (kept for frontend backward compat)
        "total_area_sqft": prop.total_area_sqft,
        "price_per_sqft": prop.price_per_sqft,
        "total_property_value": prop.total_property_value or prop.price,
        "dimensions": prop.dimensions,
        "open_sides": prop.open_sides,
        "construction_done": prop.construction_done,
        "boundary_wall": prop.boundary_wall,
        "floors_allowed": prop.floors_allowed,
        "photos": _effective_photos(prop),
        "images": _effective_photos(prop),  # legacy alias
        "status": prop.status,
        "is_collaboration": is_collaboration,
        "assigned_agents": assigned_agents_enriched if assigned_agents_enriched is not None else [
            {
                "agent_id": str(a.agent_id),
                "agent_name": "",
                "agent_phone": "",
                "status": a.status,
                "assigned_at": a.assigned_at.isoformat(),
            }
            for a in prop.assigned_agents
        ],
        # Convenience top-level locality/city strings so frontend never gets a dict object
        "locality": (location.get("locality") if location else None) or prop.location or "",
        "city": (location.get("city") if location else None) or prop.district or "",
        "nearby_amenities": prop.nearby_amenities,
        # Legacy commit fields
        "committed_client_name": prop.committed_client_name,
        "committed_client_phone": prop.committed_client_phone,
        "committed_date": prop.committed_date.isoformat() if prop.committed_date else None,
        "closed_date": prop.closed_date.isoformat() if prop.closed_date else None,
        "created_at": prop.created_at.isoformat(),
        "updated_at": prop.updated_at.isoformat(),
    }


@router.post("/")
async def create_property(body: PropertyCreate, user: User = Depends(require_company)):
    if user.role not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Not allowed")

    highest = await Property.find(
        Property.company_id == user.company_id
    ).sort("-set_no").first_or_none()
    set_no = (highest.set_no + 1) if highest else 1

    # Resolve photos
    photos = body.photos or body.images or []

    # Build location_detail if new format provided
    location_detail = None
    if body.location_detail:
        from models import LocationDetail
        location_detail = LocationDetail(**body.location_detail.model_dump())

    prop = Property(
        set_no=set_no,
        agent_id=user.id,
        added_by=user.id,
        company_id=user.company_id,
        agency_id=user.company_id,
        property_type=body.property_type,
        transaction_type=body.transaction_type,
        title=body.title,
        description=body.description,
        price=body.price or body.total_property_value,
        is_negotiable=body.is_negotiable,
        location_detail=location_detail,
        location=body.location,
        district=body.district,
        facing=body.facing,
        details=body.details,
        total_area_sqft=body.total_area_sqft,
        price_per_sqft=body.price_per_sqft,
        total_property_value=body.total_property_value or body.price,
        dimensions=body.dimensions,
        open_sides=body.open_sides,
        construction_done=body.construction_done,
        boundary_wall=body.boundary_wall,
        floors_allowed=body.floors_allowed,
        photos=photos,
        images=photos,
        nearby_amenities=body.nearby_amenities,
    )
    await prop.insert()
    return _prop_out(prop, user.full_name)


@router.get("/")
async def search_properties(
    user: User = Depends(require_company),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
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
    query: dict = {"company_id": user.company_id}

    if agent_only:
        query["agent_id"] = user.id
    collab_ids: set = set()
    # Support both old 'district' and new 'city' param
    city_val = city or district
    if city_val:
        query["$or"] = [
            {"district": {"$regex": re.escape(city_val), "$options": "i"}},
            {"location_detail.city": {"$regex": re.escape(city_val), "$options": "i"}},
        ]
    # Support both old 'location' and new 'locality' param
    locality_val = locality or location
    if locality_val:
        loc_filter = [
            {"location": {"$regex": re.escape(locality_val), "$options": "i"}},
            {"location_detail.locality": {"$regex": re.escape(locality_val), "$options": "i"}},
        ]
        if "$or" in query:
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": loc_filter}]
        else:
            query["$or"] = loc_filter
    if property_type and property_type != "All":
        query["property_type"] = property_type
    if transaction_type and transaction_type != "All":
        query["transaction_type"] = transaction_type
    if min_area is not None:
        query.setdefault("total_area_sqft", {})["$gte"] = min_area
    if max_area is not None:
        query.setdefault("total_area_sqft", {})["$lte"] = max_area
    if min_price_sqft is not None:
        query.setdefault("price_per_sqft", {})["$gte"] = min_price_sqft
    if max_price_sqft is not None:
        query.setdefault("price_per_sqft", {})["$lte"] = max_price_sqft
    if min_value is not None:
        query.setdefault("price", {})["$gte"] = min_value
    if max_value is not None:
        query.setdefault("price", {})["$lte"] = max_value
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

    props = await Property.find(query).sort("-created_at").to_list()

    # Also include collaborated listings (where this agent is in assigned_agents)
    if agent_only:
        collab_query = {k: v for k, v in query.items() if k != "agent_id"}
        collab_query["assigned_agents.agent_id"] = user.id
        collab_props = await Property.find(collab_query).sort("-created_at").to_list()
        existing_ids = {p.id for p in props}
        collab_ids = {p.id for p in collab_props if p.id not in existing_ids}
        props = props + [p for p in collab_props if p.id not in existing_ids]
        props.sort(key=lambda p: p.created_at, reverse=True)

    agent_ids = list({p.agent_id for p in props if p.agent_id})
    agents = await User.find({"_id": {"$in": agent_ids}}).to_list()
    agent_map = {a.id: a for a in agents}

    return [
        _prop_out(
            p,
            agent_map[p.agent_id].full_name if p.agent_id and p.agent_id in agent_map else "Unknown",
            agent_phone=agent_map[p.agent_id].phone or "" if p.agent_id and p.agent_id in agent_map else "",
            agent_email=agent_map[p.agent_id].email or "" if p.agent_id and p.agent_id in agent_map else "",
            is_collaboration=p.id in collab_ids,
        )
        for p in props
    ]


@router.get("/{listing_id}")
async def get_property(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    agent = await User.get(prop.agent_id or prop.added_by)

    # Enrich assigned agents with name and phone
    assigned_enriched = []
    for a in prop.assigned_agents:
        ag = await User.get(a.agent_id)
        assigned_enriched.append({
            "agent_id": str(a.agent_id),
            "agent_name": ag.full_name if ag else "Unknown",
            "agent_phone": ag.phone or "" if ag else "",
            "status": a.status,
            "assigned_at": a.assigned_at.isoformat(),
        })

    return _prop_out(
        prop,
        agent.full_name if agent else "Unknown",
        agent_phone=agent.phone or "" if agent else "",
        agent_email=agent.email or "" if agent else "",
        assigned_agents_enriched=assigned_enriched,
    )


@router.put("/{listing_id}")
async def update_property(
    listing_id: str, body: PropertyUpdate, user: User = Depends(require_company)
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if prop.agent_id != user.id and prop.added_by != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your property")

    update_data = body.model_dump(exclude_none=True)

    # Normalise photos — keep both fields in sync
    photos = update_data.pop("photos", None) or update_data.pop("images", None)
    if photos is not None:
        update_data["photos"] = photos
        update_data["images"] = photos

    # Convert location_detail dict to embedded model
    if "location_detail" in update_data:
        from models import LocationDetail
        update_data["location_detail"] = LocationDetail(**update_data["location_detail"])

    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await prop.update({"$set": update_data})
        prop = await Property.get(prop.id)

    agent = await User.get(prop.agent_id or prop.added_by)
    return _prop_out(prop, agent.full_name if agent else "Unknown")


@router.delete("/{listing_id}")
async def delete_property(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if prop.agent_id != user.id and prop.added_by != user.id:
        raise HTTPException(status_code=403, detail="Not your property")
    if prop.status != "available":
        raise HTTPException(status_code=400, detail="Can only delete available properties")

    await prop.delete()
    return {"detail": "Property deleted"}


@router.patch("/{listing_id}/commit")
async def commit_property(
    listing_id: str, body: CommitRequest, user: User = Depends(require_company)
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    is_owner = prop.agent_id == user.id or prop.added_by == user.id
    is_assigned = any(str(a.agent_id) == str(user.id) for a in prop.assigned_agents)
    if not is_owner and not is_assigned and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your property")

    if prop.status not in ("available",):
        raise HTTPException(status_code=400, detail="Property is not available")

    prop.status = "in_discussion"
    prop.committed_client_name = body.committed_client_name
    prop.committed_client_phone = body.committed_client_phone
    prop.committed_date = body.committed_date or datetime.utcnow()
    prop.updated_at = datetime.utcnow()
    await prop.save()

    # Auto-create a lead for this client if one doesn't already exist
    existing_lead = await Lead.find_one({
        "property_id": prop.id,
        "client_phone": body.committed_client_phone,
    })
    if not existing_lead:
        lead = Lead(
            agency_id=prop.agency_id or prop.company_id,
            company_id=prop.company_id or prop.agency_id,
            agent_id=user.id,
            assigned_to=user.id,
            property_id=prop.id,
            linked_listing_id=prop.id,
            client=ClientInfo(name=body.committed_client_name, phone=body.committed_client_phone),
            client_name=body.committed_client_name,
            client_phone=body.committed_client_phone,
            source="agent_upload",
            status="contacted",
        )
        await lead.insert()

    agent = await User.get(prop.agent_id or prop.added_by)
    return _prop_out(prop, agent.full_name if agent else "Unknown")


@router.patch("/{listing_id}/close")
async def close_property(listing_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    is_owner = prop.agent_id == user.id or prop.added_by == user.id
    is_assigned = any(str(a.agent_id) == str(user.id) for a in prop.assigned_agents)
    if not is_owner and not is_assigned and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your property")

    if prop.status not in ("in_discussion", "negotiating", "committed"):
        raise HTTPException(status_code=400, detail="Property must be in discussion or negotiating first")

    prop.status = "deal_closed"
    prop.closed_date = datetime.utcnow()
    prop.updated_at = datetime.utcnow()
    await prop.save()

    # Auto-update linked leads to "converted"
    lead_col = Lead.get_motor_collection()
    await lead_col.update_many(
        {"property_id": prop.id, "status": {"$nin": ["converted", "lost"]}},
        {"$set": {"status": "converted", "updated_at": datetime.utcnow()}},
    )

    agent = await User.get(prop.agent_id or prop.added_by)
    return _prop_out(prop, agent.full_name if agent else "Unknown")


@router.patch("/{listing_id}/status")
async def update_status(listing_id: str, body: dict, user: User = Depends(require_company)):
    """Generic status update endpoint for the full status pipeline."""
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    new_status = body.get("status")
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use one of: {', '.join(sorted(VALID_STATUSES))}")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    is_owner = prop.agent_id == user.id or prop.added_by == user.id
    is_assigned = any(str(a.agent_id) == str(user.id) for a in prop.assigned_agents)
    if not is_owner and not is_assigned and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your property")

    prop.status = new_status
    if new_status in ("deal_closed", "closed"):
        prop.closed_date = prop.closed_date or datetime.utcnow()
        # Auto-update linked leads to "converted"
        lead_col = Lead.get_motor_collection()
        await lead_col.update_many(
            {"property_id": prop.id, "status": {"$nin": ["converted", "lost"]}},
            {"$set": {"status": "converted", "updated_at": datetime.utcnow()}},
        )
    prop.updated_at = datetime.utcnow()
    await prop.save()

    agent = await User.get(prop.agent_id or prop.added_by)
    return _prop_out(prop, agent.full_name if agent else "Unknown")


@router.post("/{listing_id}/assigned-agents")
async def assign_agent(
    listing_id: str, body: AssignAgentRequest, user: User = Depends(require_company)
):
    """Add an agent to the property's assigned_agents list."""
    if not ObjectId.is_valid(listing_id) or not ObjectId.is_valid(body.agent_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    prop = await Property.get(ObjectId(listing_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    agent_oid = ObjectId(body.agent_id)
    already = any(str(a.agent_id) == body.agent_id for a in prop.assigned_agents)
    if not already:
        prop.assigned_agents.append(
            AssignedAgent(agent_id=agent_oid, status=body.status)
        )
        prop.updated_at = datetime.utcnow()
        await prop.save()

    agent = await User.get(prop.agent_id or prop.added_by)
    return _prop_out(prop, agent.full_name if agent else "Unknown")
