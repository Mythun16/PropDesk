from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os

from models import (
    Agency, User, Property, Lead,
    PortalPost, WhatsappDispatch, MatchingSession, AssignmentRequest, AgencyInvite,
)


async def _drop_conflicting_google_id_index(client):
    """
    Drop the legacy unique `google_id_1` index (if present).
    Prevents startup crashes when local users store `google_id = null`.
    """
    users_collection = client.propdesk.get_collection("users")
    try:
        indexes = await users_collection.list_indexes().to_list(length=None)
        for idx in indexes:
            if idx.get("name") == "google_id_1":
                await users_collection.drop_index("google_id_1")
                break
    except Exception:
        pass


async def init_db():
    """Connect to MongoDB and initialize Beanie ODM."""
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    await _drop_conflicting_google_id_index(client)
    await init_beanie(
        database=client.propdesk,
        document_models=[
            Agency,
            User,
            Property,
            Lead,
            PortalPost,
            WhatsappDispatch,
            MatchingSession,
            AssignmentRequest,
            AgencyInvite,
        ],
    )
