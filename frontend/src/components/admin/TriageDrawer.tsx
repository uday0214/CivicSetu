import React, { useState } from 'react';
import {
  MasterIncident,
  PriorityTier,
  IndianAgency,
  IncidentStatus,
  WorkOrderResponse,
  ResolutionSubmitResult,
  INDIAN_AGENCIES,
  PRIORITY_TIERS,
} from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { getPriorityBadgeColor } from '../../utils/mapIcons';
import {
  X,
  ShieldAlert,
  Sparkles,
  Wrench,
  Copy,
  Check,
  Camera,
  AlertTriangle,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';

interface TriageDrawerProps {
  incident: MasterIncident;
  onClose: () => void;
  onIncidentUpdated: (updated: MasterIncident) => void;
}

export const TriageDrawer: React.FC<TriageDrawerProps> = ({
  incident,
  onClose,
  onIncidentUpdated,
}) => {
  // Override form states
  const [overrideAgency, setOverrideAgency] = useState<IndianAgency>(incident.agency);
  const [overridePriority, setOverridePriority] = useState<PriorityTier>(incident.priority);
  const [overrideStatus, setOverrideStatus] = useState<IncidentStatus>(incident.status);
  const [overrideWard, setOverrideWard] = useState<string>(incident.ward_id);
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [isSavingOverride, setIsSavingOverride] = useState<boolean>(false);
  const [overrideSuccess, setOverrideSuccess] = useState<boolean>(false);

  // Work Order states
  const [workOrder, setWorkOrder] = useState<WorkOrderResponse | null>(null);
  const [isGeneratingWorkOrder, setIsGeneratingWorkOrder] = useState<boolean>(false);
  const [copiedWorkOrder, setCopiedWorkOrder] = useState<boolean>(false);

  // Resolution Audit states
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [contractorId, setContractorId] = useState<string>('CONTRACTOR-BBMP-42');
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<ResolutionSubmitResult | null>(null);

  const priorityStyle = getPriorityBadgeColor(incident.priority);
  const isLevel3 = incident.escalation_tier === 'LEVEL_3_MUNICIPAL_COMMISSIONER';
  const isLevel2 = incident.escalation_tier === 'LEVEL_2_ZONAL_OFFICER';

  // Save Administrative Override
  const handleSaveOverride = async () => {
    setIsSavingOverride(true);
    setOverrideSuccess(false);
    try {
      const updated = await apiClient.overrideIncident(incident.incident_id, {
        agency: overrideAgency,
        priority: overridePriority,
        status: overrideStatus,
        ward_id: overrideWard,
        notes: overrideNotes || 'Supervisor manual adjustment',
      });
      setOverrideSuccess(true);
      onIncidentUpdated(updated);
      setTimeout(() => setOverrideSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save override:', err);
      alert(err.message || 'Override failed');
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Generate Field Work Order with Gemini
  const handleGenerateWorkOrder = async () => {
    setIsGeneratingWorkOrder(true);
    try {
      const res = await apiClient.generateWorkOrder(incident.incident_id);
      setWorkOrder(res);
    } catch (err: any) {
      console.error('Work order generation failed:', err);
      alert(err.message || 'Failed to generate work order');
    } finally {
      setIsGeneratingWorkOrder(false);
    }
  };

  const handleCopyWorkOrder = () => {
    if (!workOrder) return;
    navigator.clipboard.writeText(workOrder.work_order_markdown);
    setCopiedWorkOrder(true);
    setTimeout(() => setCopiedWorkOrder(false), 2000);
  };

  // Handle Resolution Audit Submission
  const handleAuditSubmit = async () => {
    if (!afterPhotoFile) return;
    setIsAuditing(true);
    setAuditResult(null);

    const formData = new FormData();
    formData.append('photo', afterPhotoFile);
    formData.append('contractor_id', contractorId);
    formData.append('notes', closureNotes || 'Contractor repair completed on site');
    if (incident.location?.lat && incident.location?.lng) {
      formData.append('lat', incident.location.lat.toString());
      formData.append('lng', incident.location.lng.toString());
    }

    try {
      const res = await apiClient.resolveIncident(incident.incident_id, formData);
      setAuditResult(res);
      // Fetch refreshed incident
      const refreshed = await apiClient.getIncident(incident.incident_id);
      onIncidentUpdated(refreshed);
    } catch (err: any) {
      console.error('Resolution audit submission failed:', err);
      alert(err.message || 'Audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
      {/* 1. Header & Escalation Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-cyan-400">{incident.incident_id}</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
              {incident.priority}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase">
              {incident.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-base font-bold text-white leading-tight">{incident.title}</h2>

        {/* Escalation Ladder Banner */}
        {isLevel3 ? (
          <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>LEVEL 3 • ESCALATED TO MUNICIPAL COMMISSIONER (Overdue P0 Risk)</span>
          </div>
        ) : isLevel2 ? (
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>LEVEL 2 • ESCALATED TO ZONAL OFFICER (Past SLA Deadline)</span>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 text-xs font-medium flex items-center gap-2">
            <span>Level 1 • Ward Junior Engineer (Within SLA)</span>
          </div>
        )}
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 divide-y divide-slate-800/80">
        {/* 2. Explainable AI Triage Trace Card */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Explainable AI Triage Trace
            </h3>
            {incident.triage_trace?.confidence_score != null && (
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {(incident.triage_trace.confidence_score * 100).toFixed(0)}% AI Confidence
              </span>
            )}
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            {/* Visual Hazards */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Detected Visual Hazards:</span>
              <div className="flex flex-wrap gap-1.5">
                {incident.triage_trace?.visual_hazard_factors?.length ? (
                  incident.triage_trace.visual_hazard_factors.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Hazard assessment standard</span>
                )}
              </div>
            </div>

            {/* Monsoon Multiplier */}
            <div className="flex items-center justify-between py-1 border-t border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Monsoon Risk Multiplier:</span>
              <span className={incident.triage_trace?.monsoon_multiplier ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                {incident.triage_trace?.monsoon_multiplier ? 'Active (Precipitation / Submergence)' : 'None'}
              </span>
            </div>

            {/* Jurisdiction Rationale */}
            {incident.triage_trace?.jurisdiction_rationale && (
              <div className="pt-1 border-t border-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Jurisdiction Rationale:</span>
                <p className="text-slate-300 italic">{incident.triage_trace.jurisdiction_rationale}</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Consolidated Citizen Reports & Merged Crowd Count */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Consolidated Citizen Reports
            </h3>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              👥 {incident.community_impact_score} Citizens Merged
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
            <p className="text-slate-200">{incident.description_standardized_en}</p>
            {incident.location?.landmark && (
              <p className="text-slate-400">📍 Landmark: {incident.location.landmark}</p>
            )}
            <p className="text-[11px] text-slate-500 font-mono">
              Created: {new Date(incident.created_at).toLocaleString()} • SLA Target: {new Date(incident.sla_deadline).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 4. Human-in-the-Loop Override & Status Controls */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-indigo-400" />
            Human-in-the-Loop Administrative Override
          </h3>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Department / Agency</label>
                <select
                  value={overrideAgency}
                  onChange={(e) => setOverrideAgency(e.target.value as IndianAgency)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                >
                  {INDIAN_AGENCIES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Priority Severity</label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as PriorityTier)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                >
                  {PRIORITY_TIERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Ticket Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                >
                  {['REPORTED', 'TRIAGED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'REOPENED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Ward ID</label>
                <input
                  type="text"
                  value={overrideWard}
                  onChange={(e) => setOverrideWard(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-semibold">Supervisor Audit Log / Override Reason</label>
              <input
                type="text"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="e.g. Reassigned to PWD as 100ft road is state corridor"
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSaveOverride}
              disabled={isSavingOverride}
              className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {isSavingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Administrative Override
            </button>

            {overrideSuccess && (
              <p className="text-emerald-400 text-center font-bold text-[11px]">
                ✓ Override saved successfully!
              </p>
            )}
          </div>
        </div>

        {/* 5. One-Click AI Field Work Order Generator */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              1-Click AI Field Work Order
            </h3>

            {workOrder && (
              <button
                onClick={handleCopyWorkOrder}
                className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                {copiedWorkOrder ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedWorkOrder ? 'Copied!' : 'Copy Brief'}
              </button>
            )}
          </div>

          {!workOrder ? (
            <button
              onClick={handleGenerateWorkOrder}
              disabled={isGeneratingWorkOrder}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950 transition"
            >
              {isGeneratingWorkOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating technical dispatch brief with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Generate Field Work Order
                </>
              )}
            </button>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-xs space-y-3 animate-fade-in">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Probable Root Cause:</span>
                <p className="text-slate-200">{workOrder.probable_root_cause}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Recommended Crew Composition:</span>
                <p className="text-emerald-300 font-semibold">{workOrder.recommended_crew_size}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Equipment & Heavy Machinery:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  {workOrder.required_equipment.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-400 block mb-1">Safety & Hazard Precautions:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  {workOrder.safety_precautions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 6. Closed-Loop Resolution Audit Module */}
        <div className="space-y-3 pt-4 pb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-teal-400" />
            Closed-Loop Resolution Audit
          </h3>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
            <p className="text-slate-400">
              Upload contractor completion "After" photo. Gemini will conduct a dual-image forensic comparison to prevent fake closures.
            </p>

            {/* Photo dropzone */}
            {afterPhotoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-700 h-36">
                <img src={afterPhotoPreview} alt="After repair preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setAfterPhotoFile(null);
                    setAfterPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl cursor-pointer bg-slate-900/60 transition text-center">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-200">Upload Contractor "After" Photo</span>
                <span className="text-[10px] text-slate-500 mt-0.5">GPS auto-defaults to incident coordinates</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAfterPhotoFile(f);
                      setAfterPhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Contractor ID</label>
                <input
                  type="text"
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Closure Notes</label>
                <input
                  type="text"
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="e.g. Asphalting completed"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 mt-1 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleAuditSubmit}
              disabled={!afterPhotoFile || isAuditing}
              className="w-full py-2.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running Gemini Dual-Image Forensic Audit...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Submit for AI Verification
                </>
              )}
            </button>

            {/* Audit Verdict Inline Card */}
            {auditResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                auditResult.audit_status === 'VERIFIED_FIXED'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>Audit Verdict: {auditResult.audit_status}</span>
                  <span>{(auditResult.audit_confidence * 100).toFixed(0)}% Confidence</span>
                </div>
                <p>{auditResult.evidence_notes}</p>
                {auditResult.citizen_reopen_window_expires && (
                  <p className="text-teal-200/80 font-mono text-[11px]">
                    48h Citizen Reopen Window Active until: {new Date(auditResult.citizen_reopen_window_expires).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
