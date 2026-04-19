from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from models import User, Lead, Property, MatchingSession, MatchResult
from schemas import MatchingSessionCreate
from auth import require_company

router = APIRouter(prefix="/api/matching", tags=["Property Matching"])


def _session_out(session: MatchingSession) -> dict:
    return {
        "id": str(session.id),
        "agent_id": str(session.agent_id),
        "lead_id": str(session.lead_id),
        "requirements": session.requirements,
        "results": [
            {
                "property_id": str(r.property_id),
                "score": r.score,
                "match_notes": r.match_notes,
                "price": r.price,
                "locality": r.locality,
                "type": r.type,
            }
            for r in session.results
        ],
        "shared_via_whatsapp": session.shared_via_whatsapp,
        "created_at": session.created_at.isoformat(),
    }


def _score_property(prop: Property, reqs: dict) -> tuple[float, list[str]]:
    """
    Score a property against lead requirements.
    Returns (score 0-100, list of match notes).
    """
    score = 0.0
    notes = []

    # Property type match (25 pts)
    req_type = (reqs.get("preferred_property_type") or "").lower()
    prop_type = (prop.property_type or "").lower()
    if req_type and req_type not in ("any", ""):
        # Map legacy types
        type_map = {"residential": "house", "commercial": "plot"}
        req_type_norm = type_map.get(req_type, req_type)
        if req_type_norm == prop_type:
            score += 25
            notes.append(f"Property type matches ({prop.property_type})")
    else:
        score += 12  # partial credit when no type specified

    # Transaction type match (15 pts)
    req_tx = (reqs.get("transaction_type") or "").lower()
    if req_tx and prop.transaction_type:
        if req_tx == prop.transaction_type.lower():
            score += 15
            notes.append(f"Transaction type matches ({prop.transaction_type})")
    else:
        score += 7

    # Budget match (30 pts)
    budget_min = reqs.get("budget_min")
    budget_max = reqs.get("budget_max")
    prop_price = prop.price or prop.total_property_value or 0
    if prop_price and (budget_min is not None or budget_max is not None):
        bmin = budget_min or 0
        bmax = budget_max or float("inf")
        if bmin <= prop_price <= bmax:
            score += 30
            notes.append("Price within budget range")
        elif prop_price < bmin:
            # Below budget — good deal
            score += 20
            notes.append("Price below budget (good value)")
        else:
            # Over budget by how much?
            overage = (prop_price - bmax) / bmax if bmax else 1
            if overage < 0.1:
                score += 10
                notes.append("Price slightly over budget (<10%)")
    else:
        score += 15  # no budget specified

    # Area match (15 pts)
    area_min = reqs.get("area_min_sqft")
    area_max = reqs.get("area_max_sqft")
    prop_area = prop.total_area_sqft or (prop.details or {}).get("total_area_sqft")
    if prop_area and (area_min is not None or area_max is not None):
        amin = area_min or 0
        amax = area_max or float("inf")
        if amin <= prop_area <= amax:
            score += 15
            notes.append(f"Area matches ({prop_area} sqft)")
        elif prop_area > amax:
            score += 5
            notes.append("Area larger than requested")
    else:
        score += 7

    # Location match (10 pts)
    req_loc = (reqs.get("preferred_district") or reqs.get("preferred_location") or "").lower()
    prop_city = (prop.district or (prop.location_detail.city if prop.location_detail else "") or "").lower()
    if req_loc and prop_city:
        if req_loc in prop_city or prop_city in req_loc:
            score += 10
            notes.append(f"Location matches ({prop.district or prop_city})")

    # Facing match (5 pts)
    req_facing = (reqs.get("facing_preference") or "").upper()
    if req_facing and prop.facing and req_facing == prop.facing.upper():
        score += 5
        notes.append(f"Facing matches ({prop.facing})")

    return round(score, 1), notes


@router.post("/")
async def run_matching(body: MatchingSessionCreate, user: User = Depends(require_company)):
    if not ObjectId.is_valid(body.lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead_id")

    lead = await Lead.get(ObjectId(body.lead_id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.agent_id != user.id and lead.assigned_to != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your lead")

    # Use override requirements if provided, else fall back to lead's requirements
    reqs = body.requirements or lead.requirements or {}
    if not reqs:
        # Build from legacy flat fields
        reqs = {
            "preferred_location": lead.preferred_location,
            "preferred_district": lead.preferred_district,
            "preferred_property_type": lead.preferred_property_type,
            "budget_min": lead.budget_min,
            "budget_max": lead.budget_max,
            "area_min_sqft": lead.area_min_sqft,
            "area_max_sqft": lead.area_max_sqft,
            "facing_preference": lead.facing_preference,
        }
        reqs = {k: v for k, v in reqs.items() if v is not None}

    # Fetch available properties for the agency
    available_props = await Property.find(
        {"company_id": user.company_id, "status": {"$in": ["available"]}}
    ).to_list()

    results = []
    for prop in available_props:
        score, notes = _score_property(prop, reqs)
        if score >= 20:  # minimum relevance threshold
            prop_locality = (
                prop.location or
                (prop.location_detail.locality if prop.location_detail else None) or
                prop.district or ""
            )
            results.append(
                MatchResult(
                    property_id=prop.id,
                    score=score,
                    match_notes="; ".join(notes),
                    price=prop.price or prop.total_property_value,
                    locality=prop_locality,
                    type=prop.property_type,
                )
            )

    # Sort by score descending
    results.sort(key=lambda r: r.score, reverse=True)

    session = MatchingSession(
        agent_id=user.id,
        lead_id=lead.id,
        requirements=reqs,
        results=results[:20],  # cap at top 20
    )
    await session.insert()
    return _session_out(session)


@router.get("/")
async def list_sessions(user: User = Depends(require_company)):
    sessions = await MatchingSession.find(
        MatchingSession.agent_id == user.id
    ).sort("-created_at").to_list()
    return [_session_out(s) for s in sessions]


@router.get("/{session_id}")
async def get_session(session_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    session = await MatchingSession.get(ObjectId(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Matching session not found")
    if session.agent_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your session")
    return _session_out(session)


@router.patch("/{session_id}/share")
async def mark_shared(session_id: str, user: User = Depends(require_company)):
    """Mark matching results as shared via WhatsApp."""
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    session = await MatchingSession.get(ObjectId(session_id))
    if not session or session.agent_id != user.id and user.role != "admin":
        raise HTTPException(status_code=404, detail="Session not found")
    session.shared_via_whatsapp = True
    await session.save()
    return _session_out(session)
