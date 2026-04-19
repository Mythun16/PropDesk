from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from models import User, Property, PortalPost
from schemas import PortalPostCreate, PortalPostUpdate
from auth import require_company, require_admin

router = APIRouter(prefix="/api/portal-posts", tags=["Portal Posts"])

VALID_PORTALS = {"99acres", "magicbricks", "nobroker", "olx"}
VALID_STATUSES = {"pending", "posted", "failed", "expired"}


def _post_out_base(post: PortalPost) -> dict:
    return {
        "id": str(post.id),
        "property_id": str(post.property_id),
        "portal": post.portal,
        "portal_listing_id": post.portal_listing_id,
        "portal_listing_url": post.portal_listing_url,
        "status": post.status,
        "posted_at": post.posted_at.isoformat() if post.posted_at else None,
        "error_log": post.error_log,
        "created_at": post.created_at.isoformat(),
        "agent_name": "",
        "agent_phone": "",
        "property_title": "",
    }


async def _enrich_post(post: PortalPost) -> dict:
    from models import Property, User as UserModel
    out = _post_out_base(post)
    prop = await Property.get(post.property_id)
    if prop:
        out["property_title"] = prop.title or prop.location or ""
        agent = await UserModel.get(prop.agent_id or prop.added_by)
        if agent:
            out["agent_name"] = agent.full_name
            out["agent_phone"] = agent.phone or ""
    return out


@router.post("/")
async def create_portal_post(body: PortalPostCreate, user: User = Depends(require_company)):
    if user.role not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")
    if body.portal not in VALID_PORTALS:
        raise HTTPException(status_code=400, detail=f"Portal must be one of: {', '.join(sorted(VALID_PORTALS))}")
    if not ObjectId.is_valid(body.property_id):
        raise HTTPException(status_code=400, detail="Invalid property_id")

    prop = await Property.get(ObjectId(body.property_id))
    if not prop or prop.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Property not found")

    post = PortalPost(
        property_id=ObjectId(body.property_id),
        portal=body.portal,
    )
    await post.insert()
    return _post_out_base(post)


@router.get("/")
async def list_portal_posts(
    user: User = Depends(require_company),
    property_id: Optional[str] = Query(None),
    portal: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    agent_only: Optional[bool] = Query(None),
):
    query: dict = {}
    if property_id:
        if not ObjectId.is_valid(property_id):
            raise HTTPException(status_code=400, detail="Invalid property_id")
        query["property_id"] = ObjectId(property_id)
    if portal:
        query["portal"] = portal
    if status:
        query["status"] = status

    # Scope to agent's own properties when user is agent or agent_only flag set
    if not property_id:
        if user.role == "agent" or agent_only:
            agent_prop_ids = [
                p.id async for p in Property.find(
                    {"agent_id": user.id, "company_id": user.company_id}
                )
            ]
            query["property_id"] = {"$in": agent_prop_ids}
        else:
            company_prop_ids = [
                p.id async for p in Property.find({"company_id": user.company_id})
            ]
            query["property_id"] = {"$in": company_prop_ids}

    posts = await PortalPost.find(query).sort("-created_at").to_list()
    return [await _enrich_post(p) for p in posts]


@router.get("/{post_id}")
async def get_portal_post(post_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    post = await PortalPost.get(ObjectId(post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Portal post not found")
    return await _enrich_post(post)


@router.patch("/{post_id}")
async def update_portal_post(
    post_id: str, body: PortalPostUpdate, user: User = Depends(require_company)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    post = await PortalPost.get(ObjectId(post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Portal post not found")

    # Agents can only update posts for their own properties; admins have full access
    if user.role not in ("admin",):
        prop = await Property.get(post.property_id)
        if not prop or (prop.agent_id != user.id and prop.added_by != user.id):
            raise HTTPException(status_code=403, detail="Not your property")

    update_data = body.model_dump(exclude_none=True)
    if "status" in update_data:
        if update_data["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        if update_data["status"] == "posted" and not post.posted_at:
            update_data["posted_at"] = datetime.utcnow()

    if update_data:
        await post.update({"$set": update_data})
        post = await PortalPost.get(post.id)

    return await _enrich_post(post)


@router.delete("/{post_id}")
async def delete_portal_post(post_id: str, user: User = Depends(require_company)):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    post = await PortalPost.get(ObjectId(post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Portal post not found")
    if user.role not in ("admin",):
        prop = await Property.get(post.property_id)
        if not prop or (prop.agent_id != user.id and prop.added_by != user.id):
            raise HTTPException(status_code=403, detail="Not your property")
    await post.delete()
    return {"detail": "Portal post deleted"}
