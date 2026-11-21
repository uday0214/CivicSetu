"""CivicSetu State Machine & SLA Calculation Rules."""

from datetime import datetime, timedelta, timezone
from typing import Set, Tuple, Optional
from backend.models.enums import IncidentStatus, PriorityTier, AuditStatus


# Canonical Allowed Transitions
VALID_STATUS_TRANSITIONS: Set[Tuple[IncidentStatus, IncidentStatus]] = {
    # Initial triage
    (IncidentStatus.REPORTED, IncidentStatus.TRIAGED),
    (IncidentStatus.REPORTED, IncidentStatus.IN_PROGRESS),
    # Progression to dispatch
    (IncidentStatus.TRIAGED, IncidentStatus.IN_PROGRESS),
    # Work complete, awaiting verification
    (IncidentStatus.IN_PROGRESS, IncidentStatus.PENDING_VERIFICATION),
    # Verification audit success
    (IncidentStatus.PENDING_VERIFICATION, IncidentStatus.RESOLVED),
    # Verification audit failure (returns to in progress)
    (IncidentStatus.PENDING_VERIFICATION, IncidentStatus.IN_PROGRESS),
    # Citizen reopen within 48h
    (IncidentStatus.RESOLVED, IncidentStatus.REOPENED),
    # Reopened issue back to work
    (IncidentStatus.REOPENED, IncidentStatus.IN_PROGRESS),
}

# Standard Indian Municipal SLA Hours by Priority
SLA_HOURS_BY_PRIORITY = {
    PriorityTier.P0_CRITICAL: 12,   # 12 hours max (manholes, live wires)
    PriorityTier.P1_HIGH: 36,       # 36 hours (arterial potholes, pipe bursts)
    PriorityTier.P2_MEDIUM: 72,     # 3 days (market garbage, streetlights)
    PriorityTier.P3_LOW: 168,       # 7 days (cosmetic footpaths, signs)
}


def compute_sla_deadline(priority: PriorityTier, from_time: Optional[datetime] = None) -> str:
    """Calculate SLA deadline timestamp based on severity tier."""
    base = from_time or datetime.now(timezone.utc)
    hours = SLA_HOURS_BY_PRIORITY.get(priority, 72)
    deadline = base + timedelta(hours=hours)
    return deadline.isoformat()


def is_valid_status_transition(current_status: IncidentStatus, target_status: IncidentStatus) -> bool:
    """Validate whether status progression complies with the canonical state machine."""
    if current_status == target_status:
        return True
    return (current_status, target_status) in VALID_STATUS_TRANSITIONS


def validate_resolution_closure(target_status: IncidentStatus, audit_status: Optional[AuditStatus]) -> bool:
    """
    Ensure an incident cannot transition to RESOLVED unless Gemini's visual
    audit status is VERIFIED_FIXED.
    """
    if target_status == IncidentStatus.RESOLVED:
        return audit_status == AuditStatus.VERIFIED_FIXED
    return True
