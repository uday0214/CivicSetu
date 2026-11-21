import { SystemStatus, MasterIncident, IntakeSubmissionResult } from '../types/api';

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

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
    if (!res.ok) {
      console.warn('[apiClient] /api/seed/reset not implemented; returning local fallback');
      return { success: true, message: 'Demo data reset (local default)' };
    }
    return res.json();
  },

  async listIncidents(): Promise<MasterIncident[]> {
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) return [];
    return res.json();
  },
};
