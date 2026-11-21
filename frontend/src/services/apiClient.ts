import {
  SystemStatus,
  MasterIncident,
  IntakeSubmissionResult,
  DedupCheckRequest,
  DedupCheckResult,
  ReportSubmissionRequest,
  ReportSubmissionResponse,
} from '../types/api';

const API_BASE = '/api';

export const apiClient = {
  async getHealth(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async triageReport(formData: FormData): Promise<IntakeSubmissionResult> {
    const res = await fetch(`${API_BASE}/intake/triage`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Triage request failed' }));
      throw new Error(err.detail || 'Triage request failed');
    }
    return res.json();
  },

  async checkDuplicate(request: DedupCheckRequest): Promise<DedupCheckResult> {
    const res = await fetch(`${API_BASE}/intake/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Duplicate check failed' }));
      throw new Error(err.detail || 'Duplicate check failed');
    }
    return res.json();
  },

  async submitReport(request: ReportSubmissionRequest): Promise<ReportSubmissionResponse> {
    const res = await fetch(`${API_BASE}/intake/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Report submission failed' }));
      throw new Error(err.detail || 'Report submission failed');
    }
    return res.json();
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
    if (!res.ok) {
      console.warn('[apiClient] /api/seed/reset not implemented; returning local fallback');
      return { success: true, message: 'Demo data reset (local default)' };
    }
    return res.json();
  },

  async listIncidents(params?: {
    ward_id?: string;
    agency?: string;
    priority?: string;
    status?: string;
  }): Promise<MasterIncident[]> {
    const searchParams = new URLSearchParams();
    if (params?.ward_id) searchParams.set('ward_id', params.ward_id);
    if (params?.agency) searchParams.set('agency', params.agency);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.status) searchParams.set('status', params.status);
    const url = `${API_BASE}/incidents${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getIncident(incidentId: string): Promise<MasterIncident> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}`);
    if (!res.ok) throw new Error(`Incident ${incidentId} not found`);
    return res.json();
  },

  async upvoteIncident(incidentId: string): Promise<{
    success: boolean;
    incident_id: string;
    community_impact_score: number;
    priority: string;
    priority_escalated: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/upvote`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Upvote failed');
    return res.json();
  },
};
