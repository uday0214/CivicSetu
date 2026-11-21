"""Unit Tests for CivicSetu Data Models, State Machine & Indian Hierarchy."""

from datetime import datetime, timedelta, timezone
import pytest
from backend.models.enums import (
    PriorityTier,
    IncidentStatus,
    IndianAgency,
    EscalationTier,
    AuditStatus,
    AGENCY_METADATA,
    MUNICIPAL_WARDS,
)
from backend.models.schemas import (
    LocationData,
    ExplainableTriageTrace,
    MasterIncident,
    CitizenReport,
)
from backend.models.state_machine import (
    is_valid_status_transition,
    validate_resolution_closure,
    compute_sla_deadline,
)


def test_indian_agency_hierarchy():
    """Verify all 5 canonical agencies are defined with proper metadata."""
    assert len(AGENCY_METADATA) == 5
    for agency in IndianAgency:
        meta = AGENCY_METADATA[agency]
        assert "name" in meta
        assert "scope" in meta
        assert "level_1_officer" in meta
        assert "level_2_officer" in meta
        assert "level_3_officer" in meta

    # Check PWD specific routing
    pwd = AGENCY_METADATA[IndianAgency.STATE_PWD]
    assert "arterial roads" in pwd["scope"].lower()


def test_municipal_wards():
    """Verify seed municipal wards have coordinates and landmarks."""
    assert "Ward 14 - Indiranagar" in MUNICIPAL_WARDS
    ward14 = MUNICIPAL_WARDS["Ward 14 - Indiranagar"]
    assert ward14["zone"] == "East Zone"
    assert len(ward14["primary_landmarks"]) > 0


def test_master_incident_serialization():
    """Verify MasterIncident serializes with strict snake_case wire format."""
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=12)

    incident = MasterIncident(
        id="CS-BLR-1001",
        title="Deep Pothole Submerged in Water",
        description_standardized_en="Deep pothole (~2x1m) on 100 Feet Road creating two-wheeler hazard.",
        category="Roads & Footpaths",
        priority=PriorityTier.P0_CRITICAL,
        agency=IndianAgency.STATE_PWD,
        ward_id="Ward 14 - Indiranagar",
        location=LocationData(lat=12.9716, lng=77.6412, landmark="Near Indiranagar Metro"),
        status=IncidentStatus.REPORTED,
        community_impact_score=3,
        citizen_report_ids=["rep-1", "rep-2", "rep-3"],
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
        sla_deadline=future.isoformat(),
        triage_trace=ExplainableTriageTrace(
            visual_hazard_factors=["Water depth obscures edge"],
            vulnerable_proximity="40m from metro station",
            monsoon_risk_multiplier=True,
            jurisdiction_rationale="100 Feet Road is a state arterial road under PWD",
            confidence_score=0.95,
        ),
    )

    dumped = incident.model_dump()
    assert dumped["id"] == "CS-BLR-1001"
    assert "description_standardized_en" in dumped
    assert "community_impact_score" in dumped
    assert "escalation_tier" in dumped
    assert dumped["escalation_tier"] == EscalationTier.LEVEL_1_WARD_JE


def test_escalation_ladder_computation():
    """Verify deterministic Indian Escalation Ladder calculation without LLM calls."""
    now = datetime.now(timezone.utc)

    # 1. Within SLA -> Level 1 Ward Junior Engineer
    inc_within_sla = MasterIncident(
        id="CS-1",
        title="Test",
        description_standardized_en="Test desc",
        category="Roads",
        priority=PriorityTier.P2_MEDIUM,
        agency=IndianAgency.ULB_MUNICIPAL,
        ward_id="Ward 14 - Indiranagar",
        location=LocationData(lat=12.97, lng=77.64),
        sla_deadline=(now + timedelta(hours=5)).isoformat(),
    )
    assert inc_within_sla.escalation_tier == EscalationTier.LEVEL_1_WARD_JE

    # 2. Overdue P2 (past deadline by 2 hours) -> Level 2 Zonal Officer
    inc_overdue_p2 = MasterIncident(
        id="CS-2",
        title="Test Overdue P2",
        description_standardized_en="Test desc",
        category="Sanitation",
        priority=PriorityTier.P2_MEDIUM,
        agency=IndianAgency.ULB_MUNICIPAL,
        ward_id="Ward 14 - Indiranagar",
        location=LocationData(lat=12.97, lng=77.64),
        sla_deadline=(now - timedelta(hours=2)).isoformat(),
    )
    assert inc_overdue_p2.escalation_tier == EscalationTier.LEVEL_2_ZONAL_OFFICER

    # 3. Any overdue P0_CRITICAL (even 5 minutes past deadline) -> Level 3 Municipal Commissioner
    inc_overdue_p0 = MasterIncident(
        id="CS-3",
        title="Critical Live Wire Overdue",
        description_standardized_en="Live wire hanging into rainwater puddle",
        category="Electricity",
        priority=PriorityTier.P0_CRITICAL,
        agency=IndianAgency.DISCOM_ELECTRICAL,
        ward_id="Ward 14 - Indiranagar",
        location=LocationData(lat=12.97, lng=77.64),
        sla_deadline=(now - timedelta(minutes=5)).isoformat(),
    )
    assert inc_overdue_p0.escalation_tier == EscalationTier.LEVEL_3_MUNICIPAL_COMMISSIONER

    # 4. Overdue by > 24 hours (even for P2) -> Level 3 Municipal Commissioner
    inc_severely_overdue = MasterIncident(
        id="CS-4",
        title="Stalled Garbage Dump",
        description_standardized_en="Garbage uncollected for 5 days",
        category="Sanitation",
        priority=PriorityTier.P2_MEDIUM,
        agency=IndianAgency.ULB_MUNICIPAL,
        ward_id="Ward 14 - Indiranagar",
        location=LocationData(lat=12.97, lng=77.64),
        sla_deadline=(now - timedelta(hours=26)).isoformat(),
    )
    assert inc_severely_overdue.escalation_tier == EscalationTier.LEVEL_3_MUNICIPAL_COMMISSIONER


def test_state_machine_transitions():
    """Verify canonical allowed and forbidden state transitions."""
    # Valid transitions
    assert is_valid_status_transition(IncidentStatus.REPORTED, IncidentStatus.TRIAGED) is True
    assert is_valid_status_transition(IncidentStatus.TRIAGED, IncidentStatus.IN_PROGRESS) is True
    assert is_valid_status_transition(IncidentStatus.IN_PROGRESS, IncidentStatus.PENDING_VERIFICATION) is True
    assert is_valid_status_transition(IncidentStatus.PENDING_VERIFICATION, IncidentStatus.RESOLVED) is True
    assert is_valid_status_transition(IncidentStatus.RESOLVED, IncidentStatus.REOPENED) is True
    assert is_valid_status_transition(IncidentStatus.REOPENED, IncidentStatus.IN_PROGRESS) is True

    # Same state is valid (no-op)
    assert is_valid_status_transition(IncidentStatus.IN_PROGRESS, IncidentStatus.IN_PROGRESS) is True

    # Invalid transitions
    assert is_valid_status_transition(IncidentStatus.REPORTED, IncidentStatus.RESOLVED) is False
    assert is_valid_status_transition(IncidentStatus.TRIAGED, IncidentStatus.RESOLVED) is False
    assert is_valid_status_transition(IncidentStatus.RESOLVED, IncidentStatus.TRIAGED) is False


def test_resolution_closure_validation():
    """Verify an incident cannot transition to RESOLVED without VERIFIED_FIXED audit status."""
    # Attempting to resolve with no audit -> False
    assert validate_resolution_closure(IncidentStatus.RESOLVED, None) is False

    # Attempting to resolve with REJECTED_MISMATCH -> False
    assert validate_resolution_closure(IncidentStatus.RESOLVED, AuditStatus.REJECTED_MISMATCH) is False

    # Attempting to resolve with PARTIAL_FIX -> False
    assert validate_resolution_closure(IncidentStatus.RESOLVED, AuditStatus.PARTIAL_FIX) is False

    # Resolving with VERIFIED_FIXED -> True
    assert validate_resolution_closure(IncidentStatus.RESOLVED, AuditStatus.VERIFIED_FIXED) is True

    # Other statuses do not require audit
    assert validate_resolution_closure(IncidentStatus.IN_PROGRESS, None) is True
