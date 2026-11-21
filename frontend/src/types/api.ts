/**
 * Strict snake_case TypeScript interfaces matching FastAPI Pydantic models verbatim.
 * Forbids camelCase wire translation to prevent silent undefined UI bugs.
 */

export type PriorityTier = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type IncidentStatus = 
  | 'REPORTED'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'PENDING_VERIFICATION'
  | 'RESOLVED'
  | 'REOPENED';

export type IndianAgency = 
  | 'ULB_MUNICIPAL'
  | 'STATE_PWD'
  | 'NHAI'
  | 'DISCOM_ELECTRICAL'
  | 'WATER_SEWERAGE_BOARD';

export type EscalationTier = 
  | 'LEVEL_1_WARD_JE'
  | 'LEVEL_2_ZONAL_OFFICER'
  | 'LEVEL_3_MUNICIPAL_COMMISSIONER';

export type AuditStatus = 
  | 'PENDING'
  | 'VERIFIED_FIXED'
  | 'PARTIAL_FIX'
  | 'REJECTED_MISMATCH';

export interface LocationData {
  lat: number;
  lng: number;
  landmark?: string;
  formatted_address?: string;
}

export interface ExplainableTriageTrace {
  visual_hazard_factors?: string[];
  vulnerable_proximity?: string;
  monsoon_risk_multiplier?: boolean;
  jurisdiction_rationale?: string;
  confidence_score?: number;
}

export interface ResolutionAudit {
  before_photo_url: string;
  after_photo_url: string;
  contractor_id?: string;
  submitted_at: string;
  audit_status: AuditStatus;
  audit_confidence: number;
  evidence_notes?: string;
  citizen_reopen_window_expires?: string;
}

export interface MasterIncident {
  id: string;
  title: string;
  description_standardized_en: string;
  category: string;
  priority: PriorityTier;
  agency: IndianAgency;
  ward_id: string;
  location: LocationData;
  status: IncidentStatus;
  community_impact_score: number;
  citizen_report_ids: string[];
  created_at: string;
  updated_at: string;
  sla_deadline: string;
  escalation_tier: EscalationTier;
  triage_trace?: ExplainableTriageTrace;
  resolution_audit?: ResolutionAudit | null;
}

export interface CitizenReport {
  report_id: string;
  master_incident_id?: string;
  citizen_contact?: string;
  raw_input: {
    language_detected?: string;
    transcription?: string;
    photo_url?: string;
    audio_url?: string;
    raw_text?: string;
  };
  location: LocationData;
  vernacular_response?: string;
  timestamp: string;
}

export interface SystemStatus {
  status: string;
  service: string;
  gemini: {
    configured: boolean;
    model: string;
    fallback_circuit_breaker_enabled: boolean;
  };
  storage: {
    mode: string;
    project: string;
  };
}
