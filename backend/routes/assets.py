"""CivicSetu Media Assets Database API Routes."""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from backend.storage.sqlite_store import get_sqlite_repository

logger = logging.getLogger("civicsetu.routes.assets")

router = APIRouter(prefix="/api/assets", tags=["assets"])


class AssetResponse(BaseModel):
    asset_id: str
    filename: str
    file_url: str
    file_path: Optional[str] = None
    mime_type: str
    size_bytes: int
    asset_type: str
    incident_id: Optional[str] = None
    report_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: str
    metadata_json: Optional[str] = None


class AssetStatsResponse(BaseModel):
    total_assets: int
    total_bytes: int
    total_mb: float
    breakdown_by_type: Dict[str, int]


@router.get("", response_model=List[AssetResponse])
async def list_assets(
    incident_id: Optional[str] = Query(None, description="Filter by incident ID"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type (photo, audio, audit_before, audit_after)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List assets stored in the lightweight database with optional filtering."""
    repo = get_sqlite_repository()
    assets = await repo.list_assets(
        incident_id=incident_id,
        asset_type=asset_type,
        limit=limit,
        offset=offset,
    )
    return [AssetResponse.model_validate(a) for a in assets]


@router.get("/stats", response_model=AssetStatsResponse)
async def get_asset_stats():
    """Get aggregate statistics of stored assets (count, bytes, storage breakdown)."""
    repo = get_sqlite_repository()
    return await repo.get_asset_stats()


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str):
    """Retrieve metadata for a specific media asset from the database."""
    repo = get_sqlite_repository()
    asset = await repo.get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found in database")
    return AssetResponse.model_validate(asset)
