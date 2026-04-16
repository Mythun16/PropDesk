from fastapi import APIRouter, HTTPException
from datetime import datetime
from pymongo.errors import DuplicateKeyError

from models import User, Company
from schemas import (
    LoginRequest,
    RegisterRequest,
    GoogleAuthRequest,
    TokenResponse,
    CompleteOnboardingRequest,
    TrackLastPageRequest,
)
from auth import verify_password, create_access_token, get_current_user, hash_password
from oauth import verify_google_token
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["Auth"])


async def _user_dict(user: User) -> dict:
    company_name = None
    if user.company_id:
        company = await Company.get(user.company_id)
        company_name = company.name if company else None
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "company_id": str(user.company_id) if user.company_id else None,
        "company_name": company_name,
        "is_new_user": user.is_new_user,
        "last_page": user.last_page,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "is_active": user.is_active,
        "auth_provider": user.auth_provider,
        "created_at": user.created_at.isoformat(),
    }

def _default_last_page(role: str) -> str:
    if role == "admin":
        return "/admin/dashboard"
    return "/agent/dashboard"


@router.post("/login")
async def login(body: LoginRequest):
    user = await User.find_one(User.email == body.email)
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    user.last_login = datetime.utcnow()
    if not user.last_page:
        user.last_page = _default_last_page(user.role)
    await user.save()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        token=token,
        role=user.role,
        is_new_user=user.is_new_user,
        last_page=user.last_page,
        user=await _user_dict(user),
    )


@router.post("/register")
async def register(body: RegisterRequest):
    if body.role not in ["admin", "agent"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.utcnow()
    user = User(
        full_name=body.full_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        auth_provider="local",
        is_new_user=True,
        last_page=_default_last_page(body.role),
        last_login=now,
    )
    try:
        await user.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        token=token,
        role=user.role,
        is_new_user=user.is_new_user,
        last_page=user.last_page,
        user=await _user_dict(user),
    )


@router.post("/google")
async def google_auth(body: GoogleAuthRequest):
    try:
        payload = verify_google_token(body.credential)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Google token error: {e}")

    if body.role not in ["admin", "agent"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    google_id = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name", "")
    picture = payload.get("picture")

    now = datetime.utcnow()

    # Try finding by google_id first, then by email
    created_new_user = False
    user = await User.find_one(User.google_id == google_id)
    if not user:
        user = await User.find_one(User.email == email)
        if user:
            # Link Google ID to existing account
            user.google_id = google_id
            if picture and not user.avatar_url:
                user.avatar_url = picture
            await user.save()
        else:
            # Create brand-new user
            try:
                user = User(
                    full_name=name,
                    email=email,
                    google_id=google_id,
                    avatar_url=picture,
                    role=body.role,
                    auth_provider="google",
                    company_id=None,
                    is_new_user=True,
                    last_page=_default_last_page(body.role),
                    last_login=now,
                )
                await user.insert()
                created_new_user = True
            except DuplicateKeyError:
                raise HTTPException(status_code=400, detail="Email already registered")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    # Persist tracking fields
    user.last_login = now
    if not user.last_page:
        user.last_page = _default_last_page(user.role)

    # Role selection is security-critical; reject mismatches.
    if user.role != body.role:
        # Back-compat: older records used role="guest" for onboarding.
        if user.role == "guest":
            user.role = body.role
        else:
            raise HTTPException(status_code=403, detail="Role mismatch")

    # If the user record already existed, they are not considered "new"
    # anymore for onboarding purposes.
    if not created_new_user:
        user.is_new_user = False

    await user.save()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        token=token,
        role=user.role,
        is_new_user=user.is_new_user,
        last_page=user.last_page,
        user=await _user_dict(user),
    )


@router.post("/complete-onboarding")
async def complete_onboarding(body: CompleteOnboardingRequest, user: User = Depends(get_current_user)):
    # Legacy guest onboarding support: treat "guest" as new.
    is_new = user.is_new_user or user.role == "guest"
    if not is_new:
        raise HTTPException(status_code=400, detail="User already onboarded")

    target_role = body.role or user.role
    if target_role not in ["admin", "agent"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user.role = target_role

    if user.company_id is None:
        if target_role == "admin":
            # Admin creates a new company workspace
            if not body.company_name:
                raise HTTPException(status_code=400, detail="Company name required")
            import secrets as _sec
            company = Company(name=body.company_name, join_code=_sec.token_hex(3).upper())
            await company.insert()
            user.company_id = company.id
        else:
            # Agent joins an existing company via join code
            if not body.join_code:
                raise HTTPException(status_code=400, detail="Company join code required")
            code = body.join_code.strip().upper()
            company = await Company.find_one({"join_code": code})
            if not company:
                raise HTTPException(status_code=404, detail="Invalid join code — ask your admin for the correct code")
            user.company_id = company.id

    user.is_new_user = False
    user.last_page = _default_last_page(user.role)
    user.last_login = datetime.utcnow()
    await user.save()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        token=token,
        role=user.role,
        is_new_user=user.is_new_user,
        last_page=user.last_page,
        user=await _user_dict(user),
    )


@router.post("/join-company")
async def join_company(body: dict, user: User = Depends(get_current_user)):
    """Allow an already-onboarded agent to join a company using a join code."""
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Only agents can join a company this way")

    code = (body.get("join_code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Join code is required")

    company = await Company.find_one({"join_code": code})
    if not company:
        raise HTTPException(status_code=404, detail="Invalid join code — ask your admin for the correct code")

    user.company_id = company.id
    await user.save()

    # Move the agent's existing listings and leads to the new company
    from models import Listing, Lead
    await Listing.get_motor_collection().update_many(
        {"agent_id": user.id}, {"$set": {"company_id": company.id}}
    )
    await Lead.get_motor_collection().update_many(
        {"agent_id": user.id}, {"$set": {"company_id": company.id}}
    )

    return {
        "detail": "Joined company successfully",
        "company_name": company.name,
        "company_id": str(company.id),
    }


@router.put("/last-page")
async def last_page(body: TrackLastPageRequest, user: User = Depends(get_current_user)):
    user.last_page = body.last_page
    await user.save()
    return {"detail": "last_page_updated"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return await _user_dict(user)
