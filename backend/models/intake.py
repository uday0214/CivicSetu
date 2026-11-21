"""Intake and Multimodal Triage Response Schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field

from backend.models.enums import PriorityTier, IndianAgency, CivicCategory
from backend.models.schemas import ExplainableTriageTrace


class IntakeTriageResponse(BaseModel):
    """
    Unified single-roundtrip structured response schema for Gemini Multimodal Intake.
    Combines the visual sanity pre-filter gate, vernacular voice transcription,
    civic categorization, Indian agency jurisdiction routing, and explainable AI trace.
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

    # Vernacular Transcription & Extraction
    language_detected: Optional[str] = Field(
        None,
        description="Language detected from input, e.g. 'hi-Latn (Hinglish)', 'te (Telugu)', 'en (English)'"
    )
    transcription: Optional[str] = Field(
        None,
        description="Verbatim transcription of the voice note in original language"
    )

    # Standardized English Civic Fields
    title: Optional[str] = Field(
        None,
        description="Concise, formal English title summarizing the civic defect"
    )
    description_standardized_en: Optional[str] = Field(
        None,
        description="Standardized English description detailing the physical defect, dimensions, and hazard factors"
    )
    category: Optional[CivicCategory] = Field(
        None,
        description="Civic issue category"
    )
    priority: Optional[PriorityTier] = Field(
        None,
        description="Priority tier P0 (Critical/Life Threat) to P3 (Minor Maintenance)"
    )
    agency: Optional[IndianAgency] = Field(
        None,
        description="Routed Indian administrative agency (ULB_MUNICIPAL, STATE_PWD, NHAI, DISCOM_ELECTRICAL, WATER_SEWERAGE_BOARD)"
    )
    ward_id: Optional[str] = Field(
        None,
        description="Suggested Indian municipal ward, e.g. 'Ward 14 - Indiranagar'"
    )
    extracted_landmark: Optional[str] = Field(
        None,
        description="Landmarks parsed from input or image cues, e.g. 'Near Indiranagar Metro Station Pillar 42'"
    )

    # Explainable AI Trace & Vernacular Confirmation
    triage_trace: Optional[ExplainableTriageTrace] = Field(
        None,
        description="Inspectable reasoning explaining hazard factors, monsoon risks, and jurisdiction choice"
    )
    vernacular_acknowledgement: Optional[str] = Field(
        None,
        description="Warm, respectful citizen confirmation message rendered in the citizen's detected language"
    )


class IntakeSubmissionResult(BaseModel):
    """API response model including media URLs and the structured AI triage response."""
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    triage: IntakeTriageResponse
