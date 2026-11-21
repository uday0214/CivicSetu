"""CivicSetu Spatial-Semantic Deduplication & Crowd Impact Service."""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.config import settings
from backend.models.enums import PriorityTier, IncidentStatus, CivicCategory
from backend.models.schemas import MasterIncident, CitizenReport, LocationData, RawCitizenInput
from backend.models.state_machine import compute_sla_deadline
from backend.models.dedup import (
    DedupCandidateSummary,
    DedupComparisonResponse,
    DedupCheckResult,
    ReportSubmissionRequest,
    ReportSubmissionResponse,
)
from backend.services.gemini_client import gemini_client
from backend.storage.json_store import get_repository

logger = logging.getLogger("civicsetu.dedup")


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters using the Haversine formula.
    """
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


GEMINI_DEDUP_SYSTEM_INSTRUCTION = """
You are CivicSetu's Spatial-Semantic Deduplication Engine for Indian municipal corporations (BBMP, PWD, DISCOMs).
Your mission is to determine whether a newly submitted civic complaint refers to the EXACT SAME physical hazard or defect as one of the candidate incidents situated within 100 meters.

Deduplication Rules:
1. Physical Asset Matching:
   - Two complaints reporting a broken sodium streetlight, missing manhole cover, or deep pothole on the same road/cross within 100m are DUPLICATES of the same physical incident.
   - Distinct hazards (e.g. a pothole vs a garbage heap vs an overflowing drain) at the same corner or crossroad are NOT duplicates.
2. Output Contract:
   - If an existing candidate matches:
     - is_duplicate: true
     - matched_incident_id: <incident_id of the matching candidate>
     - similarity_reason: Concise explanation of why they describe the same asset/hazard failure.
   - If no existing candidate matches:
     - is_duplicate: false
     - matched_incident_id: null
     - similarity_reason: Brief explanation of why the new report is distinct from nearby tickets.
"""


def get_default_demo_dedup_fallback(
    new_report: Dict[str, Any],
    candidates: List[DedupCandidateSummary],
) -> DedupComparisonResponse:
    """
    Deterministic rule-based fallback comparator for offline demos or quota exhaustion.
    Matches if category matches and distance <= 75m or descriptions share common civic defect tokens.
    """
    new_cat = str(new_report.get("category", "")).lower()
    new_desc = (new_report.get("description", "") + " " + new_report.get("title", "")).lower()

    for cand in candidates:
        cand_cat = str(cand.category.value if hasattr(cand.category, "value") else cand.category).lower()
        cand_desc = (cand.description + " " + cand.title).lower()

        # Same category and within 75 meters is an automatic candidate match
        if new_cat == cand_cat and cand.distance_meters <= 75.0:
            return DedupComparisonResponse(
                is_duplicate=True,
                matched_incident_id=cand.incident_id,
                similarity_reason=(
                    f"Candidate incident {cand.incident_id} is located only {cand.distance_meters:.1f}m away "
                    f"and reports the same {cand.category} defect."
                ),
                confidence=0.92,
            )

        # Keyword token overlap (e.g., 'pothole', 'streetlight', 'garbage', 'sewage')
        keywords = ["pothole", "gaddha", "streetlight", "light", "garbage", "kachra", "drainage", "water", "wire"]
        shared_keywords = [kw for kw in keywords if kw in new_desc and kw in cand_desc]
        if shared_keywords and cand.distance_meters <= 100.0:
            return DedupComparisonResponse(
                is_duplicate=True,
                matched_incident_id=cand.incident_id,
                similarity_reason=(
                    f"Candidate incident {cand.incident_id} ({cand.distance_meters:.1f}m away) refers to "
                    f"the same physical hazard keywords: {', '.join(shared_keywords)}."
                ),
                confidence=0.88,
            )

    return DedupComparisonResponse(
        is_duplicate=False,
        matched_incident_id=None,
        similarity_reason="No matching physical civic defect found within 100 meters.",
        confidence=0.90,
    )


async def find_nearby_candidates(
    lat: float,
    lng: float,
    radius_meters: float = 100.0,
) -> List[Tuple[Dict[str, Any], float]]:
    """
    Finds all active non-resolved MasterIncidents within radius_meters using Haversine formula.
    """
    repo = get_repository()
    all_incidents = await repo.list_incidents(limit=200)
    candidates: List[Tuple[Dict[str, Any], float]] = []

    for inc in all_incidents:
        # Ignore closed/resolved tickets for deduplication
        status = inc.get("status")
        if status in [IncidentStatus.RESOLVED.value, "RESOLVED"]:
            continue

        loc = inc.get("location")
        if not loc:
            continue

        cand_lat = loc.get("lat")
        cand_lng = loc.get("lng")
        if cand_lat is None or cand_lng is None:
            continue

        dist = haversine_distance_meters(lat, lng, float(cand_lat), float(cand_lng))
        if dist <= radius_meters:
            candidates.append((inc, dist))

    # Sort candidates by nearest distance first
    candidates.sort(key=lambda x: x[1])
    return candidates


async def compare_semantic_duplicate(
    new_report: Dict[str, Any],
    candidate_summaries: List[DedupCandidateSummary],
) -> DedupComparisonResponse:
    """
    Executes Gemini semantic match comparator between the new report and nearby candidates.
    """
    if not candidate_summaries:
        return DedupComparisonResponse(
            is_duplicate=False,
            matched_incident_id=None,
            similarity_reason="No active incidents found within 100 meters radius.",
            confidence=1.0,
        )

    fallback = get_default_demo_dedup_fallback(new_report, candidate_summaries)

    prompt = (
        f"NEW CIVIC REPORT:\n"
        f"Title: {new_report.get('title')}\n"
        f"Category: {new_report.get('category')}\n"
        f"Description: {new_report.get('description')}\n"
        f"Landmark: {new_report.get('landmark', 'N/A')}\n\n"
        f"NEARBY CANDIDATE INCIDENTS (within 100m):\n"
    )
    for idx, cand in enumerate(candidate_summaries, 1):
        prompt += (
            f"Candidate #{idx}:\n"
            f"  Incident ID: {cand.incident_id}\n"
            f"  Distance: {cand.distance_meters:.1f} meters\n"
            f"  Title: {cand.title}\n"
            f"  Category: {cand.category}\n"
            f"  Description: {cand.description}\n"
            f"  Landmark: {cand.landmark or 'N/A'}\n\n"
        )
    prompt += "Analyze whether the new report is a duplicate of any candidate above."

    try:
        result = await gemini_client.generate_structured(
            contents=prompt,
            response_schema=DedupComparisonResponse,
            system_instruction=GEMINI_DEDUP_SYSTEM_INSTRUCTION,
            fallback_data=fallback,
        )
        return result
    except Exception as e:
        logger.error(f"Error during Gemini deduplication comparison: {e}")
        if settings.DEMO_FALLBACK_ON_QUOTA:
            return fallback
        raise e


async def check_for_duplicates(
    lat: float,
    lng: float,
    category: Optional[CivicCategory] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    landmark: Optional[str] = None,
) -> DedupCheckResult:
    """
    Performs spatial candidate search and semantic comparison to check if duplicate exists.
    """
    nearby = await find_nearby_candidates(lat, lng, radius_meters=100.0)
    if not nearby:
        return DedupCheckResult(has_duplicate=False)

    candidate_summaries = [
        DedupCandidateSummary(
            incident_id=inc.get("incident_id") or inc.get("id"),
            title=inc.get("title", "Civic Issue"),
            category=inc.get("category") or CivicCategory.ROADS_FOOTPATHS,
            priority=inc.get("priority", PriorityTier.P2_MEDIUM),
            description=inc.get("description_standardized_en") or inc.get("description", ""),
            landmark=(inc.get("location") or {}).get("landmark"),
            distance_meters=dist,
            community_impact_score=inc.get("community_impact_score", 1),
            created_at=inc.get("created_at", ""),
        )
        for inc, dist in nearby
    ]

    new_report_payload = {
        "title": title or "",
        "category": category.value if category else "",
        "description": description or "",
        "landmark": landmark or "",
    }

    comparison = await compare_semantic_duplicate(new_report_payload, candidate_summaries)

    if comparison.is_duplicate and comparison.matched_incident_id:
        # Locate matching incident
        matched_tuple = next(
            (item for item in nearby if (item[0].get("incident_id") or item[0].get("id")) == comparison.matched_incident_id),
            None,
        )
        if matched_tuple:
            inc_dict, dist = matched_tuple
            matched_incident = MasterIncident.model_validate(inc_dict)
            return DedupCheckResult(
                has_duplicate=True,
                matched_incident_id=comparison.matched_incident_id,
                distance_meters=dist,
                similarity_reason=comparison.similarity_reason,
                matched_incident=matched_incident,
            )

    return DedupCheckResult(
        has_duplicate=False,
        similarity_reason=comparison.similarity_reason,
    )


def compute_priority_escalation(current_priority: PriorityTier, impact_score: int) -> Tuple[PriorityTier, bool]:
    """
    Computes priority escalation thresholds based on crowd community impact score:
    - Score >= 5: P3_LOW -> P1_HIGH, P2_MEDIUM -> P0_CRITICAL, P1_HIGH -> P0_CRITICAL
    - Score >= 3: P3_LOW -> P2_MEDIUM, P2_MEDIUM -> P1_HIGH
    Returns: (new_priority, did_escalate)
    """
    new_priority = current_priority
    if impact_score >= 5:
        if current_priority == PriorityTier.P3_LOW:
            new_priority = PriorityTier.P1_HIGH
        elif current_priority in [PriorityTier.P2_MEDIUM, PriorityTier.P1_HIGH]:
            new_priority = PriorityTier.P0_CRITICAL
    elif impact_score >= 3:
        if current_priority == PriorityTier.P3_LOW:
            new_priority = PriorityTier.P2_MEDIUM
        elif current_priority == PriorityTier.P2_MEDIUM:
            new_priority = PriorityTier.P1_HIGH

    did_escalate = (new_priority != current_priority)
    return new_priority, did_escalate


async def process_report_submission(req: ReportSubmissionRequest) -> ReportSubmissionResponse:
    """
    Handles report submission with spatial-semantic deduplication, Master Incident linking,
    and automatic community priority escalation.
    """
    repo = get_repository()
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"

    matched_incident_dict: Optional[Dict[str, Any]] = None
    dist_to_matched: Optional[float] = None

    # Step 1: Check if an explicit matched incident ID was confirmed by citizen
    if req.matched_incident_id and not req.force_new:
        matched_incident_dict = await repo.get_incident(req.matched_incident_id)

    # Step 2: If not explicitly provided and not forced new, run automated deduplication
    if not matched_incident_dict and not req.force_new:
        check = await check_for_duplicates(
            lat=req.lat,
            lng=req.lng,
            category=req.category,
            title=req.title,
            description=req.description_standardized_en,
            landmark=req.landmark,
        )
        if check.has_duplicate and check.matched_incident_id:
            matched_incident_dict = await repo.get_incident(check.matched_incident_id)
            dist_to_matched = check.distance_meters

    # Step 3: Branch - Duplicate Merged vs New Master Incident
    if matched_incident_dict:
        # Case A: Duplicate Found -> Merge and Boost (+1)
        incident = MasterIncident.model_validate(matched_incident_dict)
        new_score = incident.community_impact_score + 1
        incident.community_impact_score = new_score
        incident.citizen_report_ids.append(report_id)
        incident.updated_at = now_iso

        # Evaluate priority escalation
        new_priority, did_escalate = compute_priority_escalation(incident.priority, new_score)
        if did_escalate:
            incident.priority = new_priority
            incident.sla_deadline = compute_sla_deadline(new_priority)

        # Save CitizenReport
        citizen_report = CitizenReport(
            report_id=report_id,
            master_incident_id=incident.incident_id,
            citizen_contact=req.citizen_contact or "+91-9876543210",
            raw_input=RawCitizenInput(
                language_detected=req.language_detected,
                transcription=req.transcription,
                photo_url=req.photo_url,
                audio_url=req.audio_url,
                raw_text=req.raw_text,
            ),
            location=LocationData(
                lat=req.lat,
                lng=req.lng,
                landmark=req.landmark,
                formatted_address=req.formatted_address,
            ),
            vernacular_response=req.vernacular_response,
            timestamp=now_iso,
        )
        await repo.add_citizen_report(citizen_report.model_dump())

        # Update Master Incident in repository
        await repo.update_incident(incident.incident_id, incident.model_dump())

        escalation_notice = f" Priority escalated to {new_priority.value}!" if did_escalate else ""
        msg = f"Issue already tracked! You are supporter #{new_score}.{escalation_notice}"

        return ReportSubmissionResponse(
            is_duplicate=True,
            master_incident_id=incident.incident_id,
            report_id=report_id,
            community_impact_score=new_score,
            supporter_number=new_score,
            priority=incident.priority,
            priority_escalated=did_escalate,
            message_to_citizen=msg,
            master_incident=incident,
        )

    else:
        # Case B: No Duplicate -> Create New Master Incident
        incident_id = f"CS-BLR-{uuid.uuid4().hex[:4].upper()}"
        initial_deadline = compute_sla_deadline(req.priority)

        new_incident = MasterIncident(
            incident_id=incident_id,
            title=req.title,
            description_standardized_en=req.description_standardized_en,
            category=req.category,
            priority=req.priority,
            agency=req.agency,
            ward_id=req.ward_id,
            location=LocationData(
                lat=req.lat,
                lng=req.lng,
                landmark=req.landmark,
                formatted_address=req.formatted_address,
            ),
            status=IncidentStatus.REPORTED,
            community_impact_score=1,
            citizen_report_ids=[report_id],
            created_at=now_iso,
            updated_at=now_iso,
            sla_deadline=initial_deadline,
            triage_trace=req.triage_trace,
        )

        citizen_report = CitizenReport(
            report_id=report_id,
            master_incident_id=incident_id,
            citizen_contact=req.citizen_contact or "+91-9876543210",
            raw_input=RawCitizenInput(
                language_detected=req.language_detected,
                transcription=req.transcription,
                photo_url=req.photo_url,
                audio_url=req.audio_url,
                raw_text=req.raw_text,
            ),
            location=LocationData(
                lat=req.lat,
                lng=req.lng,
                landmark=req.landmark,
                formatted_address=req.formatted_address,
            ),
            vernacular_response=req.vernacular_response,
            timestamp=now_iso,
        )

        await repo.create_incident(new_incident.model_dump())
        await repo.add_citizen_report(citizen_report.model_dump())

        return ReportSubmissionResponse(
            is_duplicate=False,
            master_incident_id=incident_id,
            report_id=report_id,
            community_impact_score=1,
            supporter_number=1,
            priority=new_incident.priority,
            priority_escalated=False,
            message_to_citizen="Your report has been registered as a new Master Incident.",
            master_incident=new_incident,
        )
