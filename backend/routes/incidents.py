"""CivicSetu Master Incidents API Routes."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Body

from backend.models.enums import IncidentStatus, PriorityTier, IndianAgency
from backend.models.schemas import MasterIncident, CitizenReport
from backend.models.audit import (
    ResolutionSubmitResult,
    CitizenReopenRequest,
    CitizenReopenResult,
)
from backend.models.state_machine import is_valid_status_transition, compute_sla_deadline
from backend.services.dedup_service import compute_priority_escalation
from backend.services.audit_service import (
    process_resolution_submission,
    process_citizen_reopen,
)
from backend.storage.json_store import get_repository

logger = logging.getLogger("civicsetu.routes.incidents")

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=List[MasterIncident])
async def list_incidents(
    ward_id: Optional[str] = Query(None, description="Filter by Indian municipal ward"),
    agency: Optional[str] = Query(None, description="Filter by Indian agency"),
    priority: Optional[str] = Query(None, description="Filter by priority tier"),
    status: Optional[str] = Query(None, description="Filter by ticket status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List master incidents with optional filtering by ward, agency, priority, and status.
    """
    repo = get_repository()
    incidents_raw = await repo.list_incidents(
        ward_id=ward_id,
        agency=agency,
        priority=priority,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [MasterIncident.model_validate(inc) for inc in incidents_raw]


@router.get("/{incident_id}", response_model=MasterIncident)
async def get_incident(incident_id: str):
    """
    Retrieve single master incident by ID.
    """
    repo = get_repository()
    data = await repo.get_incident(incident_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return MasterIncident.model_validate(data)


@router.get("/{incident_id}/reports", response_model=List[CitizenReport])
async def list_incident_citizen_reports(incident_id: str):
    """
    Retrieve all individual citizen reports linked to this Master Incident.
    """
    repo = get_repository()
    reports_raw = await repo.list_citizen_reports(incident_id=incident_id)
    return [CitizenReport.model_validate(r) for r in reports_raw]


@router.post("/{incident_id}/upvote")
async def upvote_incident(incident_id: str):
    """
    Citizen upvote / support (+1) for an existing incident.
    Increments community_impact_score and checks for automatic priority escalation.
    """
    repo = get_repository()
    data = await repo.get_incident(incident_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    incident = MasterIncident.model_validate(data)
    new_score = incident.community_impact_score + 1
    incident.community_impact_score = new_score

    # Check priority escalation
    new_priority, did_escalate = compute_priority_escalation(incident.priority, new_score)
    if did_escalate:
        incident.priority = new_priority
        incident.sla_deadline = compute_sla_deadline(new_priority)

    await repo.update_incident(incident.incident_id, incident.model_dump())

    return {
        "success": True,
        "incident_id": incident.incident_id,
        "community_impact_score": new_score,
        "priority": incident.priority,
        "priority_escalated": did_escalate,
        "message": f"Upvoted! Community impact score is now {new_score}.{' Priority escalated to ' + new_priority.value + '!' if did_escalate else ''}",
    }


@router.post("/{incident_id}/resolve", response_model=ResolutionSubmitResult)
async def resolve_incident_with_audit(
    incident_id: str,
    photo: UploadFile = File(..., description="Contractor completion 'After' photo"),
    contractor_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
):
    """
    Submits contractor repair photo and triggers Gemini multimodal Before/After visual comparison audit.
    If genuine, marks status RESOLVED and starts 48h citizen review window.
    If fake or incomplete, keeps status IN_PROGRESS and logs discrepancy evidence.
    """
    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Uploaded photo is empty.")

    photo_mime = photo.content_type or "image/jpeg"

    try:
        result = await process_resolution_submission(
            incident_id=incident_id,
            after_photo_bytes=photo_bytes,
            after_mime=photo_mime,
            contractor_id=contractor_id,
            closure_notes=notes,
            lat=lat,
            lng=lng,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error during resolution audit: {e}")
        raise HTTPException(status_code=500, detail=f"Resolution audit failed: {e}")


@router.post("/{incident_id}/reopen", response_model=CitizenReopenResult)
async def reopen_incident_endpoint(
    incident_id: str,
    request: CitizenReopenRequest,
):
    """
    Citizen endpoint allowing reopening of a resolved incident within 48 hours.
    """
    try:
        result = await process_citizen_reopen(
            incident_id=incident_id,
            citizen_contact=request.citizen_contact,
            reopen_reason=request.reopen_reason,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status: IncidentStatus = Body(..., embed=True),
):
    """
    Admin workflow status transition endpoint enforcing canonical state machine rules.
    """
    repo = get_repository()
    data = await repo.get_incident(incident_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    incident = MasterIncident.model_validate(data)
    if not is_valid_status_transition(incident.status, status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {incident.status.value} to {status.value}.",
        )

    incident.status = status
    await repo.update_incident(incident.incident_id, incident.model_dump())
    return {
        "success": True,
        "incident_id": incident.incident_id,
        "status": incident.status,
    }

