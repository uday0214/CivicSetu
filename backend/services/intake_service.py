"""CivicSetu Multimodal Intake & AI Triage Engine using official google-genai."""

import logging
from typing import Optional, List, Any
from google.genai import types

from backend.config import settings
from backend.services.gemini_client import gemini_client
from backend.models.enums import PriorityTier, IndianAgency, CivicCategory
from backend.models.schemas import ExplainableTriageTrace
from backend.models.intake import IntakeTriageResponse

logger = logging.getLogger("civicsetu.intake")

GEMINI_INTAKE_SYSTEM_INSTRUCTION = """
You are CivicSetu, an expert AI municipal triage officer for Indian municipal corporations (ULBs) and infrastructure authorities.
Analyze the provided multimodal citizen input (photo, voice note audio, or text description) and output a strict JSON conforming to IntakeTriageResponse.

CRITICAL INSTRUCTIONS:

1. PRE-SUBMISSION VISUAL SANITY GATE:
   - Carefully inspect the image if provided.
   - If the image is completely blurry, pitch black, a selfie, a meme, unrelated nature, indoor furniture, or not related to municipal civic infrastructure:
     - Set "is_valid_civic_issue": false
     - Set "rejection_reason": A polite, precise reason (e.g. "The photo is too blurry or does not show public infrastructure")
     - Set "suggested_user_prompt": Guidance for the citizen (e.g. "Please upload a clear daylight photo of the pothole, garbage, or drain")
     - Leave all other triage fields null.
   - If the image or description depicts legitimate civic infrastructure defects (potholes, garbage dumps, broken streetlights, water leaks, open manholes, dangling wires):
     - Set "is_valid_civic_issue": true, "rejection_reason": null, "suggested_user_prompt": null. Proceed with full triage below.

2. VERNACULAR & CODE-MIXED TRANSCRIPTION:
   - If voice audio is provided (in Hindi, Telugu, Tamil, Kannada, Hinglish, or English):
     - Transcribe verbatim in "transcription".
     - Detect language in "language_detected" (e.g., "hi-Latn (Hinglish)", "te (Telugu)", "kn (Kannada)", "en (English)").
   - Translate and standardize the issue into formal, high-quality municipal English in "title" and "description_standardized_en".

3. CATEGORY CLASSIFICATION:
   - Must be strictly one of:
     * "Roads & Footpaths"
     * "Sanitation & Waste"
     * "Water & Drainage"
     * "Electricity & Lighting"
     * "Public Safety"

4. INDIAN AGENCY JURISDICTION ROUTING:
   - Assign the correct Indian governance layer based on the defect type and location:
     * "ULB_MUNICIPAL": Colony interior roads, solid waste dumps, uncollected garbage, stray cattle, parks, footpath encroachments (BBMP / GHMC / BMC / MCD).
     * "STATE_PWD": Major arterial roads, notified bus routes, flyovers, state highways, pedestrian underpasses.
     * "NHAI": Elevated expressway corridors, ring roads, highway bypasses.
     * "DISCOM_ELECTRICAL": Non-functioning streetlights, fallen electric poles, open transformer boxes, dangling live power cables (BESCOM / TSSPDCL / Tata Power).
     * "WATER_SEWERAGE_BOARD": Drinking water pipe bursts, sewer line blockages, open or missing stormwater manhole covers, storm drainage (BWSSB / HMWSSB / Delhi Jal Board).

5. PRIORITY TIER & INDIA-SPECIFIC MONSOON MULTIPLIERS:
   - "P0_CRITICAL": Immediate threat to life or physical safety.
     * MULTIPLIER: Open manholes submerged in waterlogged roads (drowning risk) -> ALWAYS P0_CRITICAL.
     * MULTIPLIER: Sagging or exposed live electric wire near rainwater puddles or pedestrian paths -> ALWAYS P0_CRITICAL.
     * Deep potholes on fast arterial corridors causing two-wheeler skid danger.
   - "P1_HIGH": Significant disruption to public mobility or severe health hazard (overflowing sewage near markets, major water main burst).
   - "P2_MEDIUM": Standard municipal defect (colony garbage dump, isolated streetlight out, broken footpath slab).
   - "P3_LOW": Minor cosmetic defect (faded road signs, minor foliage encroachment not blocking lines).

6. EXPLAINABLE AI TRIAGE TRACE:
   - Provide "visual_hazard_factors": list of specific physical risks observed.
   - Provide "vulnerable_proximity": proximity to schools, hospitals, or high-traffic junctions if visible or stated.
   - Provide "monsoon_multiplier": boolean indicating whether seasonal rain significantly magnifies the danger.
   - Provide "jurisdiction_rationale": 1-2 clear sentences explaining why this specific agency was assigned over others.
   - Provide "confidence_score": float between 0.0 and 1.0.

7. WARM VERNACULAR ACKNOWLEDGEMENT:
   - In "vernacular_acknowledgement", output a reassuring, respectful confirmation message addressed to the citizen in their detected native language (e.g. Hindi, Telugu, or Kannada), confirming that their complaint has been registered and routed to the assigned agency.
"""


def get_default_demo_triage_fallback(
    text_prompt: Optional[str] = None,
    landmark: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> IntakeTriageResponse:
    """Deterministic fallback fixture for live pitch demo resilience (P0 Monsoon Hazard)."""
    is_live_wire = text_prompt and any(w in text_prompt.lower() for w in ["wire", "current", "bijli", "shock", "pole", "bescom"])
    is_garbage = text_prompt and any(w in text_prompt.lower() for w in ["kachra", "garbage", "trash", "dump", "smell"])

    if is_live_wire:
        return IntakeTriageResponse(
            is_valid_civic_issue=True,
            detected_language="hi-Latn (Hinglish)",
            transcription=text_prompt or "School ke paas electric wire latak raha hai paani me",
            title="Dangling High-Tension Electrical Wire Near School Gate",
            description_standardized_en="Exposed electrical wire hanging dangerously close to a rainwater puddle near the school entrance, presenting an acute electrocution risk.",
            category=CivicCategory.ELECTRICITY_LIGHTING,
            priority=PriorityTier.P0_CRITICAL,
            agency=IndianAgency.DISCOM_ELECTRICAL,
            ward_id="Ward 14 - Indiranagar",
            landmark_clues=landmark or "Near Indiranagar Primary School Gate",
            visual_hazard_factors=["Dangling live cable", "Proximity to rainwater puddle", "Pedestrian footfall"],
            monsoon_multiplier_applied=True,
            jurisdiction_rationale="Power distribution infrastructure and exposed live lines fall strictly under the jurisdiction of the State Electricity Distribution Company (BESCOM).",
            confidence_score=0.98,
            triage_trace=ExplainableTriageTrace(
                visual_hazard_factors=["Dangling live cable", "Proximity to rainwater puddle", "Pedestrian footfall"],
                vulnerable_proximity="Adjacent to primary school gate",
                monsoon_multiplier=True,
                jurisdiction_rationale="Power distribution infrastructure and exposed live lines fall strictly under the jurisdiction of the State Electricity Distribution Company (BESCOM).",
                confidence_score=0.98,
            ),
            vernacular_acknowledgement="आपकी शिकायत तत्काल दर्ज कर ली गई है। बिजली विभाग (BESCOM) के आपातकालीन दल को तुरंत रवाना किया जा रहा है।",
        )

    if is_garbage:
        return IntakeTriageResponse(
            is_valid_civic_issue=True,
            detected_language="hi-Latn (Hinglish)",
            transcription=text_prompt or "Market road pe bohot sara kachra jama hai",
            title="Commercial Market Solid Waste Dump Blocking Footpath",
            description_standardized_en="Overflowing municipal garbage heap encroaching onto the pedestrian footpath, attracting stray animals and creating public health risks.",
            category=CivicCategory.SANITATION_WASTE,
            priority=PriorityTier.P2_MEDIUM,
            agency=IndianAgency.ULB_MUNICIPAL,
            ward_id="Ward 84 - Koramangala",
            landmark_clues=landmark or "Opposite Koramangala Market Complex",
            visual_hazard_factors=["Footpath blockage", "Attracting stray animals", "Foul odor"],
            monsoon_multiplier_applied=False,
            jurisdiction_rationale="Solid waste management and commercial market sanitation are the direct statutory responsibility of the Urban Local Body (ULB).",
            confidence_score=0.94,
            triage_trace=ExplainableTriageTrace(
                visual_hazard_factors=["Footpath blockage", "Attracting stray animals", "Foul odor"],
                vulnerable_proximity="Commercial market pedestrian walkway",
                monsoon_multiplier=False,
                jurisdiction_rationale="Solid waste management and commercial market sanitation are the direct statutory responsibility of the Urban Local Body (ULB).",
                confidence_score=0.94,
            ),
            vernacular_acknowledgement="आपकी शिकायत दर्ज कर ली गई है। नगर निगम (Municipal Corporation) के स्वच्छता निरीक्षक को कचरा उठाने के लिए सूचित कर दिया गया है।",
        )

    # Resolve geographical ward and landmark if coordinates are provided
    resolved_ward_id = "Ward 14 - Indiranagar"
    resolved_landmark = landmark or "Near Indiranagar Metro Station Pillar 42"
    resolved_rationale = "100 Feet Road is a notified State Bus Route and arterial corridor maintained by the State Public Works Department (PWD)."

    if lat is not None and lng is not None:
        try:
            from backend.services.responsible_ward_service import find_responsible_ward_for_location
            r_ward = find_responsible_ward_for_location(lat, lng)
            if r_ward:
                resolved_ward_id = r_ward.ward_id
                resolved_landmark = landmark or f"Near {r_ward.ward_name}, {r_ward.city}"
                resolved_rationale = f"Civic corridor falls under statutory jurisdiction of {r_ward.zone}, {r_ward.city} ({r_ward.state})."
        except Exception:
            pass

    # Default: Submerged Pothole (P0 Monsoon Hazard)
    return IntakeTriageResponse(
        is_valid_civic_issue=True,
        detected_language="hi-Latn (Hinglish)",
        transcription=text_prompt or "Metro station ke theek samne road pe bada gaddha hai aur barish ka paani bhara hua hai",
        title="Submerged Pothole with Severe Waterlogging",
        description_standardized_en="Deep pothole (~2x1.5m) completely submerged in standing rainwater on a busy arterial corridor, posing severe skidding hazards for two-wheelers.",
        category=CivicCategory.ROADS_FOOTPATHS,
        priority=PriorityTier.P0_CRITICAL,
        agency=IndianAgency.STATE_PWD,
        ward_id=resolved_ward_id,
        landmark_clues=resolved_landmark,
        visual_hazard_factors=["Water depth obscures pothole edges", "Heavy vehicular traffic", "Two-wheeler skidding risk"],
        monsoon_multiplier_applied=True,
        jurisdiction_rationale=resolved_rationale,
        confidence_score=0.96,
        triage_trace=ExplainableTriageTrace(
            visual_hazard_factors=["Water depth obscures pothole edges", "Heavy vehicular traffic", "Two-wheeler skidding risk"],
            vulnerable_proximity="Arterial transit road corridor",
            monsoon_multiplier=True,
            jurisdiction_rationale=resolved_rationale,
            confidence_score=0.96,
        ),
        vernacular_acknowledgement="आपकी शिकायत दर्ज कर ली गई है। लोक निर्माण विभाग (PWD) को तत्काल मरम्मत के लिए सूचित किया गया है।",
    )


async def triage_intake(
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = "image/jpeg",
    audio_bytes: Optional[bytes] = None,
    audio_mime: Optional[str] = "audio/webm",
    text_prompt: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    landmark: Optional[str] = None,
) -> IntakeTriageResponse:
    """
    Executes a single-roundtrip multimodal analysis with Gemini using native response_schema.
    Evaluates visual sanity and civic classification in one step.
    """
    fallback = get_default_demo_triage_fallback(text_prompt=text_prompt, landmark=landmark, lat=lat, lng=lng)

    # Assemble multimodal content parts
    contents: List[Any] = []

    # 1. Image part
    if image_bytes:
        contents.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=image_mime or "image/jpeg"
            )
        )

    # 2. Audio part
    if audio_bytes:
        contents.append(
            types.Part.from_bytes(
                data=audio_bytes,
                mime_type=audio_mime or "audio/webm"
            )
        )

    # 3. Text contextual prompt
    context_lines = ["Analyze this citizen civic report."]
    if text_prompt:
        context_lines.append(f"Citizen Text/Notes: {text_prompt}")
    if landmark:
        context_lines.append(f"Reported Landmark: {landmark}")
    if lat is not None and lng is not None:
        context_lines.append(f"GPS Coordinates: Latitude {lat:.5f}, Longitude {lng:.5f}")

    contents.append("\n".join(context_lines))

    # Invoke Gemini with native structured schema
    try:
        result = await gemini_client.generate_structured(
            contents=contents,
            response_schema=IntakeTriageResponse,
            system_instruction=GEMINI_INTAKE_SYSTEM_INSTRUCTION,
            fallback_data=fallback,
        )
        return result
    except Exception as e:
        logger.error(f"Error during Gemini intake triage: {e}")
        if settings.DEMO_FALLBACK_ON_QUOTA:
            logger.info("Serving demo fallback due to triage exception.")
            return fallback
        raise e
