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
from models import Company, User, Listing
from auth import hash_password
from routers import auth as auth_router
from routers import listings as listings_router
from routers import uploads as uploads_router
from routers import agents as agents_router
from routers import leads as leads_router
from routers import admin as admin_router


async def seed_data():
    """Seed demo data if users collection is empty."""
    admin_exists = await User.find_one(User.email == "admin@demorealty.com")
    if admin_exists:
        return

    # Create company
    company = Company(name="Demo Realty", join_code="DEMO01")
    await company.insert()

    # Create admin
    admin = User(
        full_name="Admin User",
        email="admin@demorealty.com",
        hashed_password=hash_password("admin123"),
        role="admin",
        auth_provider="local",
        company_id=company.id,
        last_page="/admin/dashboard",
        last_login=datetime.utcnow(),
    )
    await admin.insert()

    # Create agent
    agent = User(
        full_name="Rajan Kumar",
        email="agent@demorealty.com",
        hashed_password=hash_password("agent123"),
        role="agent",
        auth_provider="local",
        company_id=company.id,
        last_page="/agent/dashboard",
        last_login=datetime.utcnow(),
    )
    await agent.insert()

    # Seed 10 listings
    listings_data = [
        dict(set_no=1, location="Tambaram", district="Chennai", total_area_sqft=2400, price_per_sqft=6500, total_property_value=9750000, property_type="Residential", dimensions="40x60", open_sides=2, construction_done="No", facing="E", boundary_wall=True, floors_allowed=3, status="available"),
        dict(set_no=2, location="Peelamedu", district="Coimbatore", total_area_sqft=3600, price_per_sqft=6300, total_property_value=11340000, property_type="Commercial", dimensions="60x60", open_sides=3, construction_done="No", facing="N", boundary_wall=True, floors_allowed=5, status="available"),
        dict(set_no=3, location="Anna Nagar", district="Madurai", total_area_sqft=1800, price_per_sqft=6150, total_property_value=12300000, property_type="Residential", dimensions="30x60", open_sides=1, construction_done="No", facing="W", boundary_wall=False, floors_allowed=2, status="available"),
        dict(set_no=4, location="Thillai Nagar", district="Trichy", total_area_sqft=5000, price_per_sqft=5950, total_property_value=14280000, property_type="Commercial", dimensions="50x100", open_sides=4, construction_done="Compound wall only", facing="NE", boundary_wall=True, floors_allowed=6, status="available"),
        dict(set_no=5, location="Fairlands", district="Salem", total_area_sqft=2700, price_per_sqft=5800, total_property_value=15660000, property_type="Residential", dimensions="45x60", open_sides=2, construction_done="No", facing="S", boundary_wall=True, floors_allowed=3, status="available"),
        dict(set_no=6, location="Palayamkottai", district="Tirunelveli", total_area_sqft=1500, price_per_sqft=5650, total_property_value=18080000, property_type="Residential", dimensions="25x60", open_sides=1, construction_done="No", facing="E", boundary_wall=False, floors_allowed=2, status="available"),
        dict(set_no=7, location="Katpadi", district="Vellore", total_area_sqft=4000, price_per_sqft=5500, total_property_value=19800000, property_type="Commercial", dimensions="50x80", open_sides=3, construction_done="Partial foundation", facing="NW", boundary_wall=True, floors_allowed=4, status="available"),
        dict(set_no=8, location="Perundurai", district="Erode", total_area_sqft=3200, price_per_sqft=5350, total_property_value=21400000, property_type="Residential", dimensions="40x80", open_sides=2, construction_done="No", facing="N", boundary_wall=True, floors_allowed=3, status="available"),
        dict(set_no=9, location="Medical College Rd", district="Thanjavur", total_area_sqft=2000, price_per_sqft=5100, total_property_value=25500000, property_type="Residential", dimensions="40x50", open_sides=2, construction_done="No", facing="SE", boundary_wall=False, floors_allowed=2, status="available"),
        dict(set_no=10, location="Nagercoil Town", district="Kanyakumari", total_area_sqft=6000, price_per_sqft=4850, total_property_value=29100000, property_type="Commercial", dimensions="60x100", open_sides=4, construction_done="No", facing="W", boundary_wall=True, floors_allowed=7, status="available"),
    ]
    for data in listings_data:
        listing = Listing(agent_id=agent.id, company_id=company.id, **data)
        await listing.insert()

    print("✅ Seed data inserted: 1 company, 1 admin, 1 agent, 10 listings")


async def migrate_join_codes():
    """Assign join codes to companies that were created before this field existed."""
    col = Company.get_motor_collection()
    async for doc in col.find({"join_code": {"$exists": False}}):
        code = secrets.token_hex(3).upper()   # e.g. "A3F9B2"
        await col.update_one({"_id": doc["_id"]}, {"$set": {"join_code": code}})


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_data()
    await migrate_join_codes()
    yield


app = FastAPI(title="PropDesk CRM", version="1.0.0", lifespan=lifespan)

# CORS — comma-separated list in ALLOWED_ORIGINS env var for production
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prop-desk-seven.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
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


@app.get("/")
async def root():
    return {"message": "PropDesk CRM API", "version": "1.0.0"}
