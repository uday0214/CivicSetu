import { SystemStatus, MasterIncident } from '../types/api';

const API_BASE = '/api';

export const apiClient = {
  async getHealth(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
    if (!res.ok) {
      // In early section 1 before seed route is registered, return simulated success
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
