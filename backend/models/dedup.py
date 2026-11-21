"""CivicSetu Deduplication & Incident Submission Schemas."""

from typing import List, Optional
from pydantic import BaseModel, Field

from backend.models.enums import PriorityTier, IndianAgency, CivicCategory, IncidentStatus
from backend.models.schemas import MasterIncident, CitizenReport, ExplainableTriageTrace
from backend.services.geo_office_service import GoverningOfficeInfo
from backend.services.responsible_ward_service import ResponsibleWardInfo


class DedupCandidateSummary(BaseModel):
    incident_id: str
    title: str
    category: CivicCategory
    priority: PriorityTier
    description: str
    landmark: Optional[str] = None
    distance_meters: float
    community_impact_score: int
    created_at: str


class DedupComparisonResponse(BaseModel):
    is_duplicate: bool = Field(..., description="True if the new report describes the same physical civic issue as an existing incident")
    matched_incident_id: Optional[str] = Field(None, description="The incident_id of the matching MasterIncident, or null if unique")
    similarity_reason: str = Field(..., description="Explanation of why this is or isn't a duplicate")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Optional confidence in match verdict")


class DedupCheckRequest(BaseModel):
    lat: float
    lng: float
    category: Optional[CivicCategory] = None
    title: Optional[str] = None
    description: Optional[str] = None
    text: Optional[str] = None
    landmark: Optional[str] = None


class DedupCheckResult(BaseModel):
    has_duplicate: bool
    matched_incident_id: Optional[str] = None
    distance_meters: Optional[float] = None
    similarity_reason: Optional[str] = None
    matched_incident: Optional[MasterIncident] = None


class ReportSubmissionRequest(BaseModel):
    title: str
    description_standardized_en: str
    category: CivicCategory
    priority: PriorityTier
    agency: IndianAgency
    ward_id: str
    lat: float
    lng: float
    landmark: Optional[str] = None
    formatted_address: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    raw_text: Optional[str] = None
    transcription: Optional[str] = None
    language_detected: Optional[str] = None
    vernacular_response: Optional[str] = None
    citizen_contact: Optional[str] = "+91-9876543210"
    triage_trace: Optional[ExplainableTriageTrace] = None
    force_new: bool = False
    matched_incident_id: Optional[str] = None


class ReportSubmissionResponse(BaseModel):
    is_duplicate: bool
    master_incident_id: str
    report_id: str
    community_impact_score: int
    supporter_number: Optional[int] = None
    priority: PriorityTier
    priority_escalated: bool = False
    message_to_citizen: str
    master_incident: MasterIncident
    nearest_governing_office: Optional[GoverningOfficeInfo] = None
    responsible_ward: Optional[ResponsibleWardInfo] = None
