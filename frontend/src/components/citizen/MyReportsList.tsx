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
    <div className="w-full max-w-2xl mx-auto p-4 space-y-5 animate-fade-in pb-16">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          My Tracked Reports & Verification Proofs
        </h2>
        <p className="text-xs text-slate-400">Track resolution milestones and verify contractor repairs</p>
      </div>

      {reopenFeedback && (
        <div className="p-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{reopenFeedback}</span>
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
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
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-cyan-400">{inc.incident_id}</span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                        {inc.priority}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border ${escalation.style}`}>
                        {escalation.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    isResolved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                {/* 4-Step Progress Stepper */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                    <div
                      className="absolute top-1/2 left-3 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
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
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-950'
                                : 'bg-slate-900 border-slate-700 text-slate-500'
                            }`}
                          >
                            {isComplete ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[11px] font-medium ${
                              isCurrent ? 'text-emerald-400 font-bold' : isComplete ? 'text-slate-300' : 'text-slate-600'
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
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{inc.agency} • {inc.ward_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-amber-400/90 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SLA: {new Date(inc.sla_deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Resolution Proof Card (when RESOLVED with ResolutionAudit) */}
                {isResolved && hasAudit && (
                  <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-bold text-teal-300">
                          Gemini AI Verification Seal • {inc.resolution_audit?.audit_status}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {((inc.resolution_audit?.audit_confidence || 0.95) * 100).toFixed(0)}% Match
                      </span>
                    </div>

                    {/* Side-by-Side Before / After Photos */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                          Citizen Complaint (Before)
                        </span>
                        <div className="h-28 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                          {inc.resolution_audit?.before_photo_url ? (
                            <img
                              src={inc.resolution_audit.before_photo_url}
                              alt="Before fix"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-600">No Photo</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-teal-400 block mb-1 uppercase tracking-wider">
                          Field Resolution (After)
                        </span>
                        <div className="h-28 rounded-lg overflow-hidden bg-slate-900 border border-teal-500/30 flex items-center justify-center">
                          {inc.resolution_audit?.after_photo_url ? (
                            <img
                              src={inc.resolution_audit.after_photo_url}
                              alt="After fix"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-600">No Photo</span>
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
                          className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition"
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
                          <p className="mt-2 text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 leading-relaxed animate-fade-in">
                            {inc.resolution_audit.evidence_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 48-Hour Citizen Accountability Reopen Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Is this genuinely fixed?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => alert('Thank you for confirming resolution!')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 font-semibold flex items-center gap-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Satisfied
                        </button>
                        <button
                          onClick={() => setReopeningId(inc.incident_id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border border-slate-700 font-semibold flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reopen Issue
                        </button>
                      </div>
                    </div>

                    {/* Reopen Input Box */}
                    {reopeningId === inc.incident_id && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-red-500/30 space-y-2 animate-fade-in">
                        <label className="text-xs font-semibold text-red-400">
                          Explain why the issue is still unresolved:
                        </label>
                        <textarea
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="e.g. Mud washed away after rain, pothole is back..."
                          rows={2}
                          className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-red-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReopeningId(null)}
                            className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReopenSubmit(inc.incident_id)}
                            disabled={reopenSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition"
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
