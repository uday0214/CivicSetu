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

export type CivicCategory = 
  | 'Roads & Footpaths'
  | 'Sanitation & Waste'
  | 'Water & Drainage'
  | 'Electricity & Lighting'
  | 'Public Safety';

export interface LocationData {
  lat: number;
  lng: number;
  landmark?: string;
  formatted_address?: string;
}

export interface ExplainableTriageTrace {
  visual_hazard_factors?: string[];
  vulnerable_proximity?: string;
  monsoon_multiplier?: boolean;
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

export interface RawCitizenInput {
  language_detected?: string;
  transcription?: string;
  photo_url?: string;
  audio_url?: string;
  raw_text?: string;
}

export interface MasterIncident {
  incident_id: string;
  title: string;
  description_standardized_en: string;
  category: CivicCategory;
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
  raw_input: RawCitizenInput;
  location: LocationData;
  vernacular_response?: string;
  timestamp: string;
}

export interface IntakeTriageResponse {
  is_valid_civic_issue: boolean;
  rejection_reason?: string | null;
  suggested_user_prompt?: string | null;
  language_detected?: string | null;
  transcription?: string | null;
  title?: string | null;
  description_standardized_en?: string | null;
  category?: CivicCategory | null;
  priority?: PriorityTier | null;
  agency?: IndianAgency | null;
  ward_id?: string | null;
  extracted_landmark?: string | null;
  triage_trace?: ExplainableTriageTrace | null;
  vernacular_acknowledgement?: string | null;
}

export interface IntakeSubmissionResult {
  photo_url?: string | null;
  audio_url?: string | null;
  triage: IntakeTriageResponse;
}

export interface DedupCheckRequest {
  lat: number;
  lng: number;
  category?: CivicCategory | null;
  title?: string | null;
  description?: string | null;
  landmark?: string | null;
}

export interface DedupCheckResult {
  has_duplicate: boolean;
  matched_incident_id?: string | null;
  distance_meters?: number | null;
  similarity_reason?: string | null;
  matched_incident?: MasterIncident | null;
}

export interface ReportSubmissionRequest {
  title: string;
  description_standardized_en: string;
  category: CivicCategory;
  priority: PriorityTier;
  agency: IndianAgency;
  ward_id: string;
  lat: number;
  lng: number;
  landmark?: string | null;
  formatted_address?: string | null;
  photo_url?: string | null;
  audio_url?: string | null;
  raw_text?: string | null;
  transcription?: string | null;
  language_detected?: string | null;
  vernacular_response?: string | null;
  citizen_contact?: string | null;
  triage_trace?: ExplainableTriageTrace | null;
  force_new?: boolean;
  matched_incident_id?: string | null;
}

export interface ReportSubmissionResponse {
  is_duplicate: boolean;
  master_incident_id: string;
  report_id: string;
  community_impact_score: number;
  supporter_number?: number | null;
  priority: PriorityTier;
  priority_escalated: boolean;
  message_to_citizen: string;
  master_incident: MasterIncident;
}

export interface SystemStatus {
  status: string;
  service: string;
  gemini: {
    configured: boolean;
    model: string;
    fallback_circuit_breaker_enabled: boolean;
    reachable: boolean;
  };
  storage: {
    mode: string;
    project: string;
  };
}
