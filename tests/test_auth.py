"""Automated Test Suite for CivicSetu Authentication and Authorization."""

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.services.auth_service import hash_password, verify_password, create_access_token, decode_access_token


@pytest.mark.asyncio
async def test_password_hashing_and_verification():
    raw = "BengaluruCivicSecure2025"
    hashed = hash_password(raw)
    assert hashed != raw
    assert "$" in hashed
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False


@pytest.mark.asyncio
async def test_jwt_token_generation_and_decoding():
    payload = {"sub": "42", "email": "test@bengaluru.in", "role": "citizen"}
    token = create_access_token(payload)
    assert token is not None
    assert len(token.split(".")) == 3

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["email"] == "test@bengaluru.in"
    assert decoded["role"] == "citizen"
    assert "exp" in decoded


@pytest.mark.asyncio
async def test_demo_login_citizen_and_admin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Citizen Demo Login
        res_citizen = await ac.post("/api/auth/demo-login", json={"role": "citizen"})
        assert res_citizen.status_code == 200
        data_cit = res_citizen.json()
        assert "token" in data_cit
        assert data_cit["user"]["role"] == "citizen"
        assert "bengaluru.in" in data_cit["user"]["email"]

        # 2. Admin Demo Login
        res_admin = await ac.post("/api/auth/demo-login", json={"role": "admin"})
        assert res_admin.status_code == 200
        data_adm = res_admin.json()
        assert "token" in data_adm
        assert data_adm["user"]["role"] == "admin"
        assert "admin@bbmp.gov.in" in data_adm["user"]["email"]


@pytest.mark.asyncio
async def test_register_and_login_flow():
    email = f"officer_{uuid.uuid4().hex[:8]}@bbmp.gov.in"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register new admin
        res_reg = await ac.post("/api/auth/register", json={
            "email": email,
            "password": "SecurePassword123!",
            "role": "admin",
            "name": "Suresh Gowda",
            "department": "BBMP Solid Waste Management",
            "ward_id": "WARD-150"
        })
        assert res_reg.status_code == 200
        data_reg = res_reg.json()
        assert data_reg["user"]["email"] == email
        assert data_reg["user"]["role"] == "admin"
        token = data_reg["token"]

        # Access /api/auth/me with Bearer token
        res_me = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res_me.status_code == 200
        assert res_me.json()["email"] == email

        # Login with correct password
        res_login = await ac.post("/api/auth/login", json={
            "email": email,
            "password": "SecurePassword123!"
        })
        assert res_login.status_code == 200
        assert res_login.json()["user"]["name"] == "Suresh Gowda"

        # Login with incorrect password
        res_fail = await ac.post("/api/auth/login", json={
            "email": email,
            "password": "WrongPassword!"
        })
        assert res_fail.status_code == 401
