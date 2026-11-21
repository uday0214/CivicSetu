"""CivicSetu Canonical Pydantic v2 Models & Schemas."""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, computed_field, model_validator

from backend.models.enums import (
    PriorityTier,
    IncidentStatus,
    IndianAgency,
    EscalationTier,
    AuditStatus,
    CivicCategory,
)
from backend.models.state_machine import compute_sla_deadline


class LocationData(BaseModel):
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    landmark: Optional[str] = Field(None, description="Key Indian landmark, e.g. near metro pillar or temple")
    formatted_address: Optional[str] = Field(None, description="Human-readable street or ward address")


class ExplainableTriageTrace(BaseModel):
    visual_hazard_factors: Optional[List[str]] = Field(
        default_factory=list,
        description="List of detected physical safety risks (e.g. water depth, live wire)"
    )
    vulnerable_proximity: Optional[str] = Field(
        None,
        description="Proximity to sensitive public locations (e.g. school gate, hospital entrance)"
    )
    monsoon_multiplier: Optional[bool] = Field(
        False,
        description="True if seasonal rain exacerbates risk (drowning in manhole, electrocution)"
    )
    jurisdiction_rationale: Optional[str] = Field(
        "",
        description="Explicit explanation of why this Indian agency was assigned over alternatives"
    )
    confidence_score: Optional[float] = Field(
        1.0,
        ge=0.0,
        le=1.0,
        description="Model confidence score between 0.0 and 1.0"
    )


class ResolutionAudit(BaseModel):
    before_photo_url: str = Field(..., description="Original citizen complaint photo URL")
    after_photo_url: str = Field(..., description="Contractor repair photo URL")
    contractor_id: Optional[str] = Field(None, description="Identifier of dispatch contractor")
    submitted_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of resolution upload"
    )
    audit_status: AuditStatus = Field(
        default=AuditStatus.PENDING,
        description="Result of Gemini visual comparison audit"
    )
    audit_confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence percentage of the audit verdict"
    )
    evidence_notes: Optional[str] = Field(
        None,
        description="Detailed observations noting site landmarks matched and defect fix authenticity"
    )
    citizen_reopen_window_expires: Optional[str] = Field(
        None,
        description="ISO 8601 timestamp 48 hours post-resolution allowing citizen reopen"
    )

    @model_validator(mode="after")
    def validate_resolved_fields(self):
        if self.audit_status == AuditStatus.VERIFIED_FIXED:
            if not self.citizen_reopen_window_expires:
                raise ValueError("citizen_reopen_window_expires is required when audit_status is VERIFIED_FIXED")
            if self.audit_confidence < 0.8:
                raise ValueError("audit_confidence must be >= 0.8 for VERIFIED_FIXED")
        return self


class RawCitizenInput(BaseModel):
    language_detected: Optional[str] = Field(None, description="Detected citizen input language, e.g. hi-Latn (Hinglish)")
    transcription: Optional[str] = Field(None, description="Verbatim voice note transcription")
    photo_url: Optional[str] = Field(None, description="Uploaded image URL")
    audio_url: Optional[str] = Field(None, description="Uploaded voice note URL")
    raw_text: Optional[str] = Field(None, description="Optional raw text note provided by citizen")


class CitizenReport(BaseModel):
    report_id: str = Field(..., description="Unique report identifier")
    master_incident_id: Optional[str] = Field(None, description="ID of associated Master Incident")
    citizen_contact: Optional[str] = Field("+91-9876543210", description="Citizen phone or masked ID")
    raw_input: RawCitizenInput = Field(default_factory=RawCitizenInput)
    location: LocationData
    vernacular_response: Optional[str] = Field(
        None,
        description="Friendly acknowledgement in the citizen's detected vernacular language"
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 submission timestamp"
    )


class MasterIncident(BaseModel):
    incident_id: str = Field(..., description="Canonical ticket ID, e.g. CS-BLR-1042")
    title: str = Field(..., description="Concise English title of the civic issue")
    description_standardized_en: str = Field(
        ...,
        description="Standardized English description synthesized from citizen input"
    )
    category: CivicCategory = Field(..., description="Civic category, e.g. Roads & Footpaths")
    priority: PriorityTier = Field(..., description="Severity tier P0 to P3")
    agency: IndianAgency = Field(..., description="Routed Indian administrative agency")
    ward_id: str = Field(..., description="Indian ward identifier, e.g. Ward 14 - Indiranagar")
    location: LocationData
    status: IncidentStatus = Field(
        default=IncidentStatus.REPORTED,
        description="Canonical ticket status (one of 6 allowed values)"
    )
    community_impact_score: int = Field(
        default=1,
        ge=1,
        description="Total community support: count of merged reports + upvotes"
    )
    citizen_report_ids: List[str] = Field(
        default_factory=list,
        description="List of individual citizen report IDs merged into this incident"
    )
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 creation timestamp"
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 last modified timestamp"
    )
    sla_deadline: str = Field(
        default="",
        description="ISO 8601 SLA deadline for municipal resolution"
    )
    triage_trace: Optional[ExplainableTriageTrace] = None
    resolution_audit: Optional[ResolutionAudit] = None

    @model_validator(mode="after")
    def set_sla_deadline(self) -> "MasterIncident":
        if not self.sla_deadline:
            self.sla_deadline = compute_sla_deadline(self.priority)
        return self

    @property
    def id(self) -> str:
        """Convenience property for incident_id."""
        return self.incident_id

    @computed_field
    @property
    def escalation_tier(self) -> EscalationTier:
        """
        Deterministic Indian Municipal Escalation Ladder:
        - Within SLA: LEVEL_1_WARD_JE (Junior Engineer)
        - Past SLA: LEVEL_2_ZONAL_OFFICER (Zonal Officer)
        - Overdue by >24h OR any overdue P0_CRITICAL: LEVEL_3_MUNICIPAL_COMMISSIONER
        Requires zero extra LLM calls.
        """
        try:
            deadline = datetime.fromisoformat(self.sla_deadline.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            overdue_seconds = (now - deadline).total_seconds()
            
            if overdue_seconds <= 0:
                return EscalationTier.LEVEL_1_WARD_JE

            # Any overdue critical issue or any issue overdue by > 24 hours
            if self.priority == PriorityTier.P0_CRITICAL or overdue_seconds > 86400:
                return EscalationTier.LEVEL_3_MUNICIPAL_COMMISSIONER

            return EscalationTier.LEVEL_2_ZONAL_OFFICER
        except Exception:
            return EscalationTier.LEVEL_1_WARD_JE
