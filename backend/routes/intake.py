"""CivicSetu Intake API Routes."""

import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.storage.media_store import get_media_storage
from backend.services.intake_service import triage_intake
from backend.services.dedup_service import (
    check_for_duplicates,
    process_report_submission,
)
from backend.models.intake import IntakeSubmissionResult
from backend.services.geo_office_service import (
    find_nearest_governing_office,
    GoverningOfficeInfo,
    GOVERNING_OFFICES,
)
from backend.services.responsible_ward_service import (
    find_responsible_ward_for_location,
    ResponsibleWardInfo,
)
from backend.models.dedup import (
    DedupCheckRequest,
    DedupCheckResult,
    ReportSubmissionRequest,
    ReportSubmissionResponse,
)

logger = logging.getLogger("civicsetu.routes.intake")

router = APIRouter(prefix="/api/intake", tags=["intake"])


@router.post("/triage", response_model=IntakeSubmissionResult)
async def triage_citizen_report(
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    landmark: Optional[str] = Form(None),
):
    """
    Unified single-roundtrip multimodal intake endpoint.
    Accepts photo, audio voice note, and/or text description with optional GPS coordinates and landmark.
    Saves media via MediaStorageAdapter and executes Gemini multimodal triage with visual sanity check.
    """
    if not photo and not audio and not text:
        raise HTTPException(
            status_code=400,
            detail="At least one input modality (photo, audio voice note, or text description) must be provided."
        )

    photo_bytes: Optional[bytes] = None
    photo_mime: Optional[str] = None
    photo_url: Optional[str] = None

    audio_bytes: Optional[bytes] = None
    audio_mime: Optional[str] = None
    audio_url: Optional[str] = None

    media_storage = get_media_storage()

    # Process and save photo if provided
    if photo:
        try:
            photo_bytes = await photo.read()
            photo_mime = photo.content_type or "image/jpeg"
            if len(photo_bytes) > 0:
                photo_url = await media_storage.save_bytes(
                    data=photo_bytes,
                    mime_type=photo_mime,
                    filename_prefix="intake_photo",
                )
        except Exception as e:
            logger.error(f"Failed to read/save uploaded photo: {e}")

    # Process and save audio if provided
    if audio:
        try:
            audio_bytes = await audio.read()
            audio_mime = audio.content_type or "audio/webm"
            if len(audio_bytes) > 0:
                audio_url = await media_storage.save_bytes(
                    data=audio_bytes,
                    mime_type=audio_mime,
                    filename_prefix="intake_audio",
                )
        except Exception as e:
            logger.error(f"Failed to read/save uploaded audio: {e}")

    # Execute Gemini multimodal structured triage
    triage_result = await triage_intake(
        image_bytes=photo_bytes,
        image_mime=photo_mime,
        audio_bytes=audio_bytes,
        audio_mime=audio_mime,
        text_prompt=text,
        lat=lat,
        lng=lng,
        landmark=landmark,
    )

    nearest_office = None
    responsible_ward = None
    if lat is not None and lng is not None:
        nearest_office = find_nearest_governing_office(lat=lat, lng=lng)
        responsible_ward = find_responsible_ward_for_location(
            lat=lat,
            lng=lng,
            preferred_ward_id=triage_result.ward_id if triage_result else None,
        )
        if responsible_ward and triage_result:
            triage_result.ward_id = responsible_ward.ward_id

    return IntakeSubmissionResult(
        photo_url=photo_url,
        audio_url=audio_url,
        triage=triage_result,
        text=text,
        lat=lat,
        lng=lng,
        landmark=landmark,
        nearest_governing_office=nearest_office,
        responsible_ward=responsible_ward,
    )


@router.get("/responsible-ward", response_model=ResponsibleWardInfo)
async def get_responsible_ward_endpoint(
    lat: float,
    lng: float,
    ward_id: Optional[str] = None,
):
    """
    Finds the exact responsible municipal Ward / Circle jurisdiction for the given GPS coordinates.
    Returns official ward office address, contact phone, officer designation, and Google Maps link.
    """
    ward = find_responsible_ward_for_location(lat=lat, lng=lng, preferred_ward_id=ward_id)
    return ward


@router.get("/nearest-office", response_model=GoverningOfficeInfo)
async def get_nearest_office_endpoint(
    lat: float,
    lng: float,
    agency: Optional[str] = None,
    state: Optional[str] = None,
):
    """
    Finds the closest governing municipal / administrative office to given GPS coordinates.
    Calculates great-circle distance (km) using Haversine algorithm across Karnataka,
    Telangana, Andhra Pradesh, and Tamil Nadu.
    """
    office = find_nearest_governing_office(lat=lat, lng=lng, agency=agency, state=state)
    return office


@router.post("/check-duplicate", response_model=DedupCheckResult)
async def check_duplicate_incident(request: DedupCheckRequest):
    """
    Checks if an incoming report has any matching duplicate Master Incident within 100 meters.
    Performs spatial proximity query followed by Gemini semantic verification.
    """
    result = await check_for_duplicates(
        lat=request.lat,
        lng=request.lng,
        category=request.category,
        title=request.title,
        description=request.description,
        landmark=request.landmark,
        text=request.text,
    )
    return result


@router.post("/submit", response_model=ReportSubmissionResponse)
async def submit_citizen_report(request: ReportSubmissionRequest):
    """
    Finalizes and saves the citizen report.
    Automatically links to existing Master Incident if a duplicate is found (or explicitly chosen),
    boosting community impact score (+1) and triggering auto-escalation when thresholds are crossed.
    Creates a new Master Incident if unique.
    """
    response = await process_report_submission(request)
    return response
