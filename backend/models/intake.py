"""Intake and Multimodal Triage Response Schemas conforming strictly to CONTEXT.md §5.3."""

from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, model_validator

from backend.models.enums import PriorityTier, IndianAgency, CivicCategory
from backend.models.schemas import ExplainableTriageTrace
from backend.services.geo_office_service import GoverningOfficeInfo


class IntakeTriageResponse(BaseModel):
    """
    Unified single-roundtrip structured response schema for Gemini Multimodal Intake.
    Conforms to the authoritative CONTEXT.md §5.3 canonical specification.
    Combines visual sanity gate, vernacular detection, civic categorization,
    jurisdiction routing, and explainable AI hazard traces.
    """
    # Pre-Submission Visual Sanity Gate
    is_valid_civic_issue: bool = Field(
        ...,
        description="True if image/description represents a legitimate civic infrastructure defect. False if blurry, selfie, meme, or non-civic."
    )
    rejection_reason: Optional[str] = Field(
        None,
        description="Clear reason explaining why submission was rejected (e.g. 'Image too dark/blurry to identify defect')"
    )
    suggested_user_prompt: Optional[str] = Field(
        None,
        description="Helpful guidance for the citizen to recapture (e.g. 'Please capture a clear daylight photo of the pothole or drain')"
    )

    # Standardized English Civic Fields
    title: Optional[str] = Field(
        None,
        description="Concise, standardized English title of the civic defect."
    )
    description_standardized_en: Optional[str] = Field(
        None,
        description="Detailed standardized English description translating vernacular idioms."
    )
    category: Optional[CivicCategory] = Field(
        None,
        description="Roads & Footpaths | Sanitation & Waste | Water & Drainage | Electricity & Lighting | Public Safety"
    )
    priority: Optional[PriorityTier] = Field(
        None,
        description="P0_CRITICAL | P1_HIGH | P2_MEDIUM | P3_LOW"
    )
    agency: Optional[IndianAgency] = Field(
        None,
        description="ULB_MUNICIPAL | STATE_PWD | NHAI | DISCOM_ELECTRICAL | WATER_SEWERAGE_BOARD"
    )
    ward_id: Optional[str] = Field(
        None,
        description="Identified or suggested ward (e.g., 'Ward 14 - Indiranagar')"
    )
    landmark_clues: Optional[str] = Field(
        None,
        description="Extracted physical landmarks (e.g., 'Opposite Metro Pillar 42')"
    )

    # Top-Level Explainable AI Trace (CONTEXT.md §5.3)
    visual_hazard_factors: List[str] = Field(
        default_factory=list,
        description="Specific visual hazards observed."
    )
    monsoon_multiplier_applied: bool = Field(
        False,
        description="Whether monsoon hazard multiplier escalated priority."
    )
    jurisdiction_rationale: Optional[str] = Field(
        None,
        description="Statutory/administrative rationale for agency assignment."
    )
    confidence_score: float = Field(
        0.0,
        description="Overall AI confidence score from 0.0 to 1.0."
    )

    # Vernacular Language & Confirmation
    detected_language: Optional[str] = Field(
        None,
        description="Language/dialect detected (e.g., 'Hindi', 'Hinglish', 'Kannada', 'English')."
    )
    vernacular_acknowledgement: Optional[str] = Field(
        None,
        description="Warm, reassuring citizen acknowledgement in the detected language."
    )

    # Optional Voice Transcription & Backward-Compatible Aliases
    transcription: Optional[str] = Field(
        None,
        description="Verbatim voice note transcription."
    )
    triage_trace: Optional[ExplainableTriageTrace] = Field(
        None,
        description="Backward-compatible triage trace container"
    )

    @model_validator(mode="before")
    @classmethod
    def reconcile_wire_aliases(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # 1. Alias: extracted_landmark <-> landmark_clues
        if "extracted_landmark" in data and not data.get("landmark_clues"):
            data["landmark_clues"] = data["extracted_landmark"]
        elif "landmark_clues" in data and not data.get("extracted_landmark"):
            data["extracted_landmark"] = data["landmark_clues"]

        # 2. Alias: language_detected <-> detected_language
        if "language_detected" in data and not data.get("detected_language"):
            data["detected_language"] = data["language_detected"]
        elif "detected_language" in data and not data.get("language_detected"):
            data["language_detected"] = data["detected_language"]

        # 3. Synchronize triage_trace and top-level trace fields
        trace = data.get("triage_trace")
        if isinstance(trace, dict):
            if "visual_hazard_factors" not in data and "visual_hazard_factors" in trace:
                data["visual_hazard_factors"] = trace["visual_hazard_factors"]
            if "monsoon_multiplier_applied" not in data and "monsoon_multiplier" in trace:
                data["monsoon_multiplier_applied"] = trace["monsoon_multiplier"]
            if "jurisdiction_rationale" not in data and "jurisdiction_rationale" in trace:
                data["jurisdiction_rationale"] = trace["jurisdiction_rationale"]
            if "confidence_score" not in data and "confidence_score" in trace:
                data["confidence_score"] = trace["confidence_score"]
        elif trace is None and (data.get("visual_hazard_factors") or data.get("jurisdiction_rationale")):
            data["triage_trace"] = {
                "visual_hazard_factors": data.get("visual_hazard_factors", []),
                "monsoon_multiplier": data.get("monsoon_multiplier_applied", False),
                "jurisdiction_rationale": data.get("jurisdiction_rationale", ""),
                "confidence_score": data.get("confidence_score", 0.0),
            }

        return data

    @property
    def extracted_landmark(self) -> Optional[str]:
        return self.landmark_clues

    @property
    def language_detected(self) -> Optional[str]:
        return self.detected_language


class IntakeSubmissionResult(BaseModel):
    """API response model including media URLs, echoed input parameters, and structured AI triage."""
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    triage: IntakeTriageResponse
    text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    landmark: Optional[str] = None
    nearest_governing_office: Optional[GoverningOfficeInfo] = None
