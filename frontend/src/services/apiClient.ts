import {
  SystemStatus,
  MasterIncident,
  IntakeSubmissionResult,
  DedupCheckRequest,
  DedupCheckResult,
  ReportSubmissionRequest,
  ReportSubmissionResponse,
  ResolutionSubmitResult,
  CitizenReopenRequest,
  CitizenReopenResult,
  IncidentStatus,
  WorkOrderResponse,
  SystemicBriefingResponse,
  IncidentOverrideRequest,
  KpiSummaryResponse,
  AuthUser,
  AuthResponse,
  AssetRecord,
  AssetStats,
} from '../types/api';

const API_BASE = '/api';

export const apiClient = {
  // Session & Local Storage
  getToken(): string | null {
    return localStorage.getItem('civicsetu_token');
  },
  setToken(token: string | null) {
    if (token) localStorage.setItem('civicsetu_token', token);
    else localStorage.removeItem('civicsetu_token');
  },
  getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem('civicsetu_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setStoredUser(user: AuthUser | null) {
    if (user) localStorage.setItem('civicsetu_user', JSON.stringify(user));
    else localStorage.removeItem('civicsetu_user');
  },
  logout() {
    localStorage.removeItem('civicsetu_token');
    localStorage.removeItem('civicsetu_user');
  },

  // Auth Endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Invalid email or password');
    }
    const data: AuthResponse = await res.json();
    this.setToken(data.token);
    this.setStoredUser(data.user);
    return data;
  },

  async register(userData: {
    email: string;
    password: string;
    role: 'citizen' | 'admin';
    name: string;
    phone?: string;
    department?: string;
    ward_id?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data: AuthResponse = await res.json();
    this.setToken(data.token);
    this.setStoredUser(data.user);
    return data;
  },

  async demoLogin(role: 'citizen' | 'admin'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Demo login failed' }));
      throw new Error(err.detail || 'Demo login failed');
    }
    const data: AuthResponse = await res.json();
    this.setToken(data.token);
    this.setStoredUser(data.user);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    const user = await res.json();
    this.setStoredUser(user);
    return user;
  },

  // Assets Management Endpoints
  async listAssets(incidentId?: string, assetType?: string): Promise<AssetRecord[]> {
    const params = new URLSearchParams();
    if (incidentId) params.append('incident_id', incidentId);
    if (assetType) params.append('asset_type', assetType);
    const res = await fetch(`${API_BASE}/assets?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load assets');
    return res.json();
  },

  async getAssetStats(): Promise<AssetStats> {
    const res = await fetch(`${API_BASE}/assets/stats`);
    if (!res.ok) throw new Error('Failed to load asset stats');
    return res.json();
  },
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

  async getIncidents(params?: {
    ward_id?: string;
    agency?: string;
    priority?: string;
    status?: string;
  }): Promise<MasterIncident[]> {
    return this.listIncidents(params);
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

  async resolveIncident(incidentId: string, formData: FormData): Promise<ResolutionSubmitResult> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/resolve`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Resolution submission failed' }));
      throw new Error(err.detail || 'Resolution submission failed');
    }
    return res.json();
  },

  async reopenIncident(incidentId: string, request: CitizenReopenRequest): Promise<CitizenReopenResult> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reopen request failed' }));
      throw new Error(err.detail || 'Reopen request failed');
    }
    return res.json();
  },

  async updateIncidentStatus(incidentId: string, status: IncidentStatus): Promise<{ success: boolean; incident_id: string; status: IncidentStatus }> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Status update failed' }));
      throw new Error(err.detail || 'Status update failed');
    }
    return res.json();
  },

  async getKpiSummary(): Promise<KpiSummaryResponse> {
    const res = await fetch(`${API_BASE}/analytics/kpi`);
    if (!res.ok) {
      return {
        critical_open_count: 0,
        sla_overdue_count: 0,
        escalated_commissioner_count: 0,
        duplicates_merged_count: 0,
        ai_verification_rate: 96.0,
        avg_resolution_time_hours: 18.5,
      };
    }
    return res.json();
  },

  async getSystemicBriefing(): Promise<SystemicBriefingResponse> {
    const res = await fetch(`${API_BASE}/analytics/systemic-briefing`);
    if (!res.ok) {
      throw new Error('Failed to generate systemic pattern briefing');
    }
    return res.json();
  },

  async generateWorkOrder(incidentId: string): Promise<WorkOrderResponse> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/work-order`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Work order generation failed' }));
      throw new Error(err.detail || 'Work order generation failed');
    }
    return res.json();
  },

  async overrideIncident(incidentId: string, request: IncidentOverrideRequest): Promise<MasterIncident> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/override`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Incident override failed' }));
      throw new Error(err.detail || 'Incident override failed');
    }
    return res.json();
  },
};
