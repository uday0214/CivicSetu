"""CivicSetu Authentication and Authorization API Routes."""

import logging
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from backend.storage.sqlite_store import get_sqlite_repository
from backend.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

logger = logging.getLogger("civicsetu.routes.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: int
    email: str
    role: Literal["citizen", "admin"]
    name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    ward_id: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    role: Literal["citizen", "admin"] = "citizen"
    name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    department: Optional[str] = None
    ward_id: Optional[str] = None


class DemoLoginRequest(BaseModel):
    role: Literal["citizen", "admin"]


async def get_current_user(authorization: Optional[str] = Header(None)) -> UserResponse:
    """Dependency that extracts and validates the JWT Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization token required (Header: 'Authorization: Bearer <token>')",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token payload")

    repo = get_sqlite_repository()
    user_dict = await repo.get_user_by_id(int(user_id))
    if not user_dict:
        raise HTTPException(status_code=404, detail="User account no longer exists")

    return UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        role=user_dict["role"],
        name=user_dict["name"],
        phone=user_dict.get("phone"),
        department=user_dict.get("department"),
        ward_id=user_dict.get("ward_id"),
        created_at=user_dict["created_at"],
    )


async def require_admin(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency enforcing Admin role authorization."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Municipal Admin authorization required",
        )
    return current_user


@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    """Authenticate with email and password."""
    repo = get_sqlite_repository()
    user_dict = await repo.get_user_by_email(credentials.email)
    if not user_dict or not verify_password(credentials.password, user_dict["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": str(user_dict["id"]),
        "email": user_dict["email"],
        "role": user_dict["role"],
        "name": user_dict["name"],
    })

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            role=user_dict["role"],
            name=user_dict["name"],
            phone=user_dict.get("phone"),
            department=user_dict.get("department"),
            ward_id=user_dict.get("ward_id"),
            created_at=user_dict["created_at"],
        ),
    )


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """Register a new citizen or municipal admin account."""
    repo = get_sqlite_repository()
    existing = await repo.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists")

    pw_hash = hash_password(req.password)
    user_data = {
        "email": req.email,
        "password_hash": pw_hash,
        "role": req.role,
        "name": req.name,
        "phone": req.phone or "",
        "department": req.department or ("BBMP Municipal Admin" if req.role == "admin" else "Citizen / Resident"),
        "ward_id": req.ward_id or ("BBMP-HQ" if req.role == "admin" else "WARD-142"),
    }

    created = await repo.create_user(user_data)
    token = create_access_token({
        "sub": str(created["id"]),
        "email": created["email"],
        "role": created["role"],
        "name": created["name"],
    })

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=created["id"],
            email=created["email"],
            role=created["role"],
            name=created["name"],
            phone=created.get("phone"),
            department=created.get("department"),
            ward_id=created.get("ward_id"),
            created_at=created["created_at"],
        ),
    )


@router.post("/demo-login", response_model=AuthResponse)
async def demo_login(req: DemoLoginRequest):
    """Instant one-click demo login as Citizen or Admin for pitch demos."""
    repo = get_sqlite_repository()
    target_email = "admin@bbmp.gov.in" if req.role == "admin" else "citizen@bengaluru.in"
    user_dict = await repo.get_user_by_email(target_email)

    if not user_dict:
        # Fallback create if somehow deleted
        pw_hash = hash_password("demo123")
        created = await repo.create_user({
            "email": target_email,
            "password_hash": pw_hash,
            "role": req.role,
            "name": "BBMP Ward Commander" if req.role == "admin" else "Aarav Sharma",
            "phone": "+91 98450 12345",
            "department": "BBMP Road Infrastructure" if req.role == "admin" else "Resident",
            "ward_id": "WARD-142",
        })
        user_dict = created

    token = create_access_token({
        "sub": str(user_dict["id"]),
        "email": user_dict["email"],
        "role": user_dict["role"],
        "name": user_dict["name"],
    })

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            role=user_dict["role"],
            name=user_dict["name"],
            phone=user_dict.get("phone"),
            department=user_dict.get("department"),
            ward_id=user_dict.get("ward_id"),
            created_at=user_dict["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve profile of the currently authorized user."""
    return current_user
