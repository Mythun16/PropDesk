import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from database import init_db
from models import Agency, User, Property, Lead
from auth import hash_password
from routers import auth as auth_router
from routers import listings as listings_router
from routers import uploads as uploads_router
from routers import agents as agents_router
from routers import leads as leads_router
from routers import admin as admin_router
from routers import portal_posts as portal_posts_router
from routers import whatsapp as whatsapp_router
from routers import matching as matching_router
from routers import assignment_requests as assignment_requests_router


async def seed_data():
    """Seed demo data if users collection is empty."""
    admin_exists = await User.find_one(User.email == "admin@demorealty.com")
    if admin_exists:
        return

    agency = Agency(name="Demo Realty", join_code="DEMO01")
    await agency.insert()

    admin = User(
        full_name="Admin User",
        email="admin@demorealty.com",
        hashed_password=hash_password("admin123"),
        role="admin",
        auth_provider="local",
        company_id=agency.id,
        last_page="/admin/dashboard",
        last_login=datetime.utcnow(),
    )
    await admin.insert()

    agent = User(
        full_name="Rajan Kumar",
        email="agent@demorealty.com",
        hashed_password=hash_password("agent123"),
        role="agent",
        auth_provider="local",
        company_id=agency.id,
        last_page="/agent/dashboard",
        last_login=datetime.utcnow(),
        language="en",
        whatsapp_opted_in=True,
    )
    await agent.insert()

    telecaller = User(
        full_name="Priya Calls",
        email="telecaller@demorealty.com",
        hashed_password=hash_password("tele123"),
        role="telecaller",
        auth_provider="local",
        company_id=agency.id,
        last_page="/telecaller/dashboard",
        last_login=datetime.utcnow(),
        language="ta",
    )
    await telecaller.insert()

    # Seed properties using new schema
    properties_data = [
        dict(set_no=1, location="Tambaram", district="Chennai", transaction_type="sell",
             title="East-facing plot in Tambaram", property_type="plot",
             total_area_sqft=2400, price_per_sqft=6500, total_property_value=15600000,
             price=15600000, dimensions="40x60", open_sides=2,
             construction_done="No", facing="E", boundary_wall=True, floors_allowed=3, status="available"),
        dict(set_no=2, location="Peelamedu", district="Coimbatore", transaction_type="sell",
             title="Commercial plot near Peelamedu", property_type="plot",
             total_area_sqft=3600, price_per_sqft=6300, total_property_value=22680000,
             price=22680000, dimensions="60x60", open_sides=3,
             construction_done="No", facing="N", boundary_wall=True, floors_allowed=5, status="available"),
        dict(set_no=3, location="Anna Nagar", district="Madurai", transaction_type="rent",
             title="House for rent in Anna Nagar", property_type="house",
             total_area_sqft=1800, price_per_sqft=6150, total_property_value=12000,
             price=12000, dimensions="30x60", open_sides=1,
             construction_done="Yes", facing="W", boundary_wall=False, floors_allowed=2, status="available"),
        dict(set_no=4, location="Thillai Nagar", district="Trichy", transaction_type="sell",
             title="Large commercial plot in Thillai Nagar", property_type="plot",
             total_area_sqft=5000, price_per_sqft=5950, total_property_value=29750000,
             price=29750000, dimensions="50x100", open_sides=4,
             construction_done="Compound wall only", facing="NE", boundary_wall=True, floors_allowed=6, status="available"),
        dict(set_no=5, location="Fairlands", district="Salem", transaction_type="sell",
             title="Residential plot in Fairlands", property_type="plot",
             total_area_sqft=2700, price_per_sqft=5800, total_property_value=15660000,
             price=15660000, dimensions="45x60", open_sides=2,
             construction_done="No", facing="S", boundary_wall=True, floors_allowed=3, status="available"),
    ]
    for data in properties_data:
        prop = Property(
            agent_id=agent.id,
            added_by=agent.id,
            company_id=agency.id,
            agency_id=agency.id,
            images=data.get("images", []),
            photos=data.get("photos", []),
            **{k: v for k, v in data.items() if k not in ("images", "photos")},
        )
        await prop.insert()

    print("✅ Seed data inserted: 1 agency, 1 admin, 1 agent, 1 telecaller, 5 properties")


async def migrate_join_codes():
    """Assign join codes to agencies created before this field existed."""
    col = Agency.get_motor_collection()
    async for doc in col.find({"join_code": {"$exists": False}}):
        code = secrets.token_hex(3).upper()
        await col.update_one({"_id": doc["_id"]}, {"$set": {"join_code": code}})


async def migrate_property_status():
    """
    One-time migration: map legacy status values to new canonical values.
      committed → in_discussion
      closed    → deal_closed
    Idempotent — safe to run on every startup.
    """
    col = Property.get_motor_collection()
    await col.update_many({"status": "committed"}, {"$set": {"status": "in_discussion"}})
    await col.update_many({"status": "closed"}, {"$set": {"status": "deal_closed"}})


async def migrate_agency_ids():
    """Backfill agency_id / added_by on existing properties and leads."""
    pcol = Property.get_motor_collection()
    await pcol.update_many(
        {"agency_id": {"$exists": False}},
        [{"$set": {"agency_id": "$company_id", "added_by": "$agent_id"}}],
    )
    lcol = Lead.get_motor_collection()
    await lcol.update_many(
        {"agency_id": {"$exists": False}},
        [{"$set": {"agency_id": "$company_id", "assigned_to": "$agent_id"}}],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_data()
    await migrate_join_codes()
    await migrate_property_status()
    await migrate_agency_ids()
    yield


app = FastAPI(title="PropDesk CRM", version="2.0.0", lifespan=lifespan)

_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

_LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prop-desk-seven.vercel.app", *_LOCAL_ORIGINS, *_extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Routers
app.include_router(auth_router.router)
app.include_router(listings_router.router)
app.include_router(uploads_router.router)
app.include_router(agents_router.router)
app.include_router(leads_router.router)
app.include_router(admin_router.router)
app.include_router(portal_posts_router.router)
app.include_router(whatsapp_router.router)
app.include_router(matching_router.router)
app.include_router(assignment_requests_router.router)


@app.get("/")
async def root():
    return {"message": "PropDesk CRM API", "version": "2.0.0"}
