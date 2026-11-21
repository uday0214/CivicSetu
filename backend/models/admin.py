"""CivicSetu Admin Command Center & Dispatch Models."""

from typing import List, Optional
from pydantic import BaseModel, Field

from backend.models.enums import PriorityTier, IndianAgency, IncidentStatus


class WorkOrderResponse(BaseModel):
    incident_id: str
    probable_root_cause: str = Field(..., description="Probable civil/infrastructure root cause")
    recommended_crew_size: str = Field(..., description="Suggested field crew composition (e.g. '3-man road crew')")
    required_equipment: List[str] = Field(default_factory=list, description="Heavy machinery, tools, and materials required")
    safety_precautions: List[str] = Field(default_factory=list, description="On-site pedestrian & traffic hazard precautions")
    work_order_markdown: str = Field(..., description="Complete structured work order dispatch brief in markdown")


class SystemicBriefingResponse(BaseModel):
    clusters_detected: int = Field(..., description="Count of multi-incident infrastructure defect clusters identified")
    systemic_analysis_markdown: str = Field(..., description="Executive briefing highlighting macro infrastructure patterns")
    recommended_joint_dispatch: List[str] = Field(default_factory=list, description="Agencies recommended for coordinated joint action")
    priority_watchlist: List[str] = Field(default_factory=list, description="Top critical or overdue incidents requiring immediate commissioner sign-off")


class IncidentOverrideRequest(BaseModel):
    agency: Optional[IndianAgency] = None
    priority: Optional[PriorityTier] = None
    status: Optional[IncidentStatus] = None
    ward_id: Optional[str] = None
    notes: str = Field(..., min_length=2, description="Reason for administrative human-in-the-loop override")


class KpiSummaryResponse(BaseModel):
    critical_open_count: int
    sla_overdue_count: int
    escalated_commissioner_count: int
    duplicates_merged_count: int
    ai_verification_rate: float
    avg_resolution_time_hours: float
