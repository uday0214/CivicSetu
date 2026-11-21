import React, { useState, useEffect } from 'react';
import { MasterIncident, IncidentStatus, EscalationTier } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { getPriorityBadgeColor } from '../../utils/mapIcons';
import {
  Clock,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building,
  Check,
} from 'lucide-react';

export const MyReportsList: React.FC = () => {
  const [incidents, setIncidents] = useState<MasterIncident[]>([]);
  const [_loading, setLoading] = useState<boolean>(true);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Reopen prompt states
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopenSubmitting, setReopenSubmitting] = useState<boolean>(false);
  const [reopenFeedback, setReopenFeedback] = useState<string | null>(null);

  const loadIncidents = async () => {
    try {
      const data = await apiClient.listIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load citizen reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleReopenSubmit = async (incidentId: string) => {
    if (!reopenReason.trim()) return;
    setReopenSubmitting(true);
    try {
      const res = await apiClient.reopenIncident(incidentId, {
        citizen_contact: '+91-9876543210',
        reopen_reason: reopenReason.trim(),
      });
      setReopenFeedback(res.message);
      setReopeningId(null);
      setReopenReason('');
      await loadIncidents();
    } catch (err: any) {
      console.error('Reopen failed:', err);
      alert(err.message || 'Failed to reopen incident.');
    } finally {
      setReopenSubmitting(false);
    }
  };

  // Helper for 4-step stepper
  const getStepIndex = (status: IncidentStatus): number => {
    switch (status) {
      case 'REPORTED':
        return 0;
      case 'TRIAGED':
        return 1;
      case 'IN_PROGRESS':
      case 'PENDING_VERIFICATION':
      case 'REOPENED':
        return 2;
      case 'RESOLVED':
        return 3;
      default:
        return 0;
    }
  };

  const steps = ['Reported', 'Triaged', 'In Progress', 'Resolved'];

  const getEscalationBadge = (tier: EscalationTier) => {
    switch (tier) {
      case 'LEVEL_3_MUNICIPAL_COMMISSIONER':
        return {
          label: 'Level 3 • Municipal Commissioner (Escalated)',
          style: 'bg-red-500/20 text-red-300 border-red-500/40 font-bold',
        };
      case 'LEVEL_2_ZONAL_OFFICER':
        return {
          label: 'Level 2 • Zonal Officer (Past SLA)',
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold',
        };
      case 'LEVEL_1_WARD_JE':
      default:
        return {
          label: 'Level 1 • Ward Junior Engineer',
          style: 'bg-slate-800 text-slate-300 border-slate-700 font-medium',
        };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
      <div>
        <h2 className="text-sm font-black text-neutral-950 flex items-center gap-2 uppercase tracking-wide">
          <Clock className="w-4 h-4 text-neutral-900" />
          Tracked Reports & Verification Proofs
        </h2>
        <p className="text-[11px] text-neutral-500 font-mono">Real-time SLA status and AI-audited contractor repair cards</p>
      </div>

      {reopenFeedback && (
        <div className="p-3.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reopenFeedback}</span>
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-neutral-300 text-neutral-500 text-xs">
          No civic reports tracked yet. Snap a photo or record audio in the Report tab to submit your first issue!
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => {
            const currentStep = getStepIndex(inc.status);
            const priorityStyle = getPriorityBadgeColor(inc.priority);
            const escalation = getEscalationBadge(inc.escalation_tier);
            const isResolved = inc.status === 'RESOLVED';
            const hasAudit = !!inc.resolution_audit;

            return (
              <div
                key={inc.incident_id}
                className="bg-white border border-neutral-300 hover:border-black rounded-2xl p-5 shadow-sm transition space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-neutral-900">{inc.incident_id}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                        {inc.priority}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${escalation.style}`}>
                        {escalation.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-neutral-950">{inc.title}</h3>
                  </div>

                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    isResolved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                {/* 4-Step Progress Stepper */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-neutral-200 -translate-y-1/2 z-0" />
                    <div
                      className="absolute top-1/2 left-3 h-0.5 bg-neutral-900 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{ width: `${(currentStep / 3) * 100}%` }}
                    />

                    {steps.map((step, idx) => {
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step} className="flex flex-col items-center gap-1 z-10">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                              isComplete
                                ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                                : 'bg-white border-neutral-300 text-neutral-400'
                            }`}
                          >
                            {isComplete ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider ${
                              isCurrent ? 'text-neutral-950 font-bold' : isComplete ? 'text-neutral-700' : 'text-neutral-400'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Governance Metadata Strip */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{inc.agency} • {inc.ward_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end font-semibold text-neutral-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SLA: {new Date(inc.sla_deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Resolution Proof Card (when RESOLVED with ResolutionAudit) */}
                {isResolved && hasAudit && (
                  <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                          Gemini 2.5 Audit Seal • {inc.resolution_audit?.audit_status}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-300 shadow-xs">
                        {((inc.resolution_audit?.audit_confidence || 0.95) * 100).toFixed(0)}% AI Match
                      </span>
                    </div>

                    {/* Side-by-Side Before / After Photos */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-500 block mb-1 uppercase tracking-wider">
                          Before Repair
                        </span>
                        <div className="h-28 rounded-lg overflow-hidden bg-neutral-200 border border-neutral-300 flex items-center justify-center">
                          {inc.resolution_audit?.before_photo_url ? (
                            <img
                              src={inc.resolution_audit.before_photo_url}
                              alt="Before fix"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400 font-mono">No Photo</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 block mb-1 uppercase tracking-wider">
                          After Repair
                        </span>
                        <div className="h-28 rounded-lg overflow-hidden bg-neutral-200 border border-emerald-400 flex items-center justify-center">
                          {inc.resolution_audit?.after_photo_url ? (
                            <img
                              src={inc.resolution_audit.after_photo_url}
                              alt="After fix"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400 font-mono">No Photo</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Evidence Notes */}
                    {inc.resolution_audit?.evidence_notes && (
                      <div>
                        <button
                          onClick={() =>
                            setExpandedAuditId(expandedAuditId === inc.incident_id ? null : inc.incident_id)
                          }
                          className="text-xs text-neutral-700 hover:text-black font-bold flex items-center gap-1 transition"
                        >
                          {expandedAuditId === inc.incident_id ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Hide Forensic Audit Notes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> Show Forensic Audit Notes
                            </>
                          )}
                        </button>
                        {expandedAuditId === inc.incident_id && (
                          <p className="mt-2 text-xs text-neutral-700 bg-white p-3 rounded-lg border border-neutral-200 leading-relaxed font-sans animate-fade-in shadow-xs">
                            {inc.resolution_audit.evidence_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 48-Hour Citizen Accountability Reopen Bar */}
                    <div className="pt-2.5 border-t border-neutral-200 flex items-center justify-between text-xs">
                      <span className="text-neutral-600 font-semibold text-[11px]">Is this genuinely fixed?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => alert('Thank you for confirming resolution!')}
                          className="px-3.5 py-1.5 rounded-full bg-neutral-950 text-white font-bold text-[11px] tracking-wide flex items-center gap-1 transition active:translate-y-0.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Satisfied</span>
                        </button>
                        <button
                          onClick={() => setReopeningId(inc.incident_id)}
                          className="px-3 py-1.5 rounded-full bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold text-[11px] tracking-wide flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reopen Issue</span>
                        </button>
                      </div>
                    </div>

                    {/* Reopen Input Box */}
                    {reopeningId === inc.incident_id && (
                      <div className="p-3.5 rounded-xl bg-white border border-rose-300 space-y-2 animate-fade-in shadow-sm">
                        <label className="text-xs font-bold text-rose-700 block">
                          Explain why the issue is still unresolved:
                        </label>
                        <textarea
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="e.g. Loose gravel washed away in the rain, pothole opened up again..."
                          rows={2}
                          className="w-full text-xs p-2.5 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 focus:outline-none focus:border-rose-600"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setReopeningId(null)}
                            className="px-3 py-1 rounded-full text-xs text-neutral-500 hover:text-black font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReopenSubmit(inc.incident_id)}
                            disabled={reopenSubmitting}
                            className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition"
                          >
                            {reopenSubmitting ? 'Reopening...' : 'Submit Reopen'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
