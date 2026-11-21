"""CivicSetu Closed-Loop Resolution Audit Models & Schemas."""

from typing import Optional
from pydantic import BaseModel, Field

from backend.models.enums import AuditStatus, IncidentStatus


class ResolutionAuditResponse(BaseModel):
    audit_status: AuditStatus = Field(..., description="Verdict: VERIFIED_FIXED, PARTIAL_FIX, or REJECTED_MISMATCH")
    audit_confidence: float = Field(default=0.95, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    site_match: bool = Field(..., description="True if background buildings, curbs, poles, and landmarks are consistent")
    defect_resolved: bool = Field(..., description="True if physical defect has been durably fixed")
    evidence_notes: str = Field(..., description="Detailed visual observations explaining the audit conclusion")


class ResolutionSubmitResult(BaseModel):
    incident_id: str
    status: IncidentStatus
    audit_status: AuditStatus
    audit_confidence: float
    evidence_notes: str
    before_photo_url: str
    after_photo_url: str
    citizen_reopen_window_expires: Optional[str] = None
    message: str


class CitizenReopenRequest(BaseModel):
    citizen_contact: Optional[str] = "+91-9876543210"
    reopen_reason: str = Field(..., min_length=3, description="Citizen feedback explaining why the issue is still unresolved")


class CitizenReopenResult(BaseModel):
    incident_id: str
    status: IncidentStatus
    reopened_at: str
    message: str
