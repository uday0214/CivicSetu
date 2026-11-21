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
  Send,
  CheckCircle2,
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
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  // Resolution Audit states
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [contractorId, setContractorId] = useState<string>('CONTRACTOR-ULB-42');
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

  // One-click dispatch to department (moves status to IN_PROGRESS)
  const handleDispatchToDepartment = async () => {
    setIsDispatching(true);
    try {
      const updated = await apiClient.overrideIncident(incident.incident_id, {
        status: 'IN_PROGRESS',
        agency: overrideAgency,
        priority: overridePriority,
        notes: `Work order dispatched to ${overrideAgency} field crew. Recommended: ${workOrder?.recommended_crew_size || 'Zonal Response Unit'}.`,
      });
      setDispatchSuccess(true);
      setOverrideStatus('IN_PROGRESS');
      onIncidentUpdated(updated);
      setTimeout(() => setDispatchSuccess(false), 3500);
    } catch (err: any) {
      console.error('Dispatch failed:', err);
      alert(err.message || 'Dispatch failed');
    } finally {
      setIsDispatching(false);
    }
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
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-white border-l border-neutral-900 shadow-2xl flex flex-col overflow-hidden animate-slide-left font-sans">
      {/* 1. Header & Escalation Banner */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-neutral-950">{incident.incident_id}</span>
            <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
              {incident.priority}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-bold uppercase">
              {incident.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-500 hover:text-black hover:bg-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-base font-black text-neutral-950 leading-tight">{incident.title}</h2>

        {/* Escalation Ladder Banner */}
        {isLevel3 ? (
          <div className="p-2.5 rounded-xl bg-rose-600 text-white text-xs font-black flex items-center gap-2 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-white shrink-0" />
            <span>LEVEL 3 • ESCALATED TO MUNICIPAL COMMISSIONER (Overdue Risk)</span>
          </div>
        ) : isLevel2 ? (
          <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>LEVEL 2 • ESCALATED TO ZONAL OFFICER (Past SLA Deadline)</span>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-medium flex items-center gap-2">
            <span>Level 1 • Ward Junior Engineer (Within Standard SLA)</span>
          </div>
        )}
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 divide-y divide-neutral-200">
        {/* 2. Explainable AI Triage Trace Card */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Explainable AI Triage Trace
            </h3>
            {incident.triage_trace?.confidence_score != null && (
              <span className="text-xs font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                {(incident.triage_trace.confidence_score * 100).toFixed(0)}% AI Confidence
              </span>
            )}
          </div>

          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-300 space-y-2.5 text-xs">
            {/* Visual Hazards */}
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Detected Visual Hazards:</span>
              <div className="flex flex-wrap gap-1.5">
                {incident.triage_trace?.visual_hazard_factors?.length ? (
                  incident.triage_trace.visual_hazard_factors.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white text-neutral-900 border border-neutral-300 font-medium">
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500">Hazard assessment standard</span>
                )}
              </div>
            </div>

            {/* Monsoon Multiplier */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-200 text-neutral-700">
              <span className="text-neutral-500 font-semibold">Monsoon Risk Multiplier:</span>
              <span className={incident.triage_trace?.monsoon_multiplier ? 'text-rose-600 font-bold' : 'text-neutral-500'}>
                {incident.triage_trace?.monsoon_multiplier ? 'Active (Precipitation / Submergence)' : 'None'}
              </span>
            </div>

            {/* Jurisdiction Rationale */}
            {incident.triage_trace?.jurisdiction_rationale && (
              <div className="pt-1 border-t border-neutral-200">
                <span className="text-neutral-500 font-semibold block mb-0.5">Jurisdiction Rationale:</span>
                <p className="text-neutral-700 italic">{incident.triage_trace.jurisdiction_rationale}</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Consolidated Citizen Reports & Merged Crowd Count */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
              Consolidated Citizen Reports
            </h3>
            <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
              👥 {incident.community_impact_score} Citizens Merged
            </span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-300 text-xs space-y-2">
            <p className="text-neutral-800 leading-relaxed">{incident.description_standardized_en}</p>
            {incident.location?.landmark && (
              <p className="text-neutral-500 font-mono">📍 Landmark: {incident.location.landmark}</p>
            )}
            <p className="text-[11px] text-neutral-400 font-mono">
              Created: {new Date(incident.created_at).toLocaleString()} • SLA Target: {new Date(incident.sla_deadline).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 4. Human-in-the-Loop Override & Status Controls */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-neutral-700" />
            Supervisor Administrative Override
          </h3>

          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-300 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Department</label>
                <select
                  value={overrideAgency}
                  onChange={(e) => setOverrideAgency(e.target.value as IndianAgency)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                >
                  {INDIAN_AGENCIES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Priority</label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as PriorityTier)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                >
                  {PRIORITY_TIERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                >
                  {['REPORTED', 'TRIAGED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'REOPENED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ward ID</label>
                <input
                  type="text"
                  value={overrideWard}
                  onChange={(e) => setOverrideWard(e.target.value)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Supervisor Override Reason</label>
              <input
                type="text"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="e.g. Reassigned to PWD as 100ft road is state arterial corridor"
                className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
              />
            </div>

            <button
              onClick={handleSaveOverride}
              disabled={isSavingOverride}
              className="w-full py-2.5 px-4 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:translate-y-0.5"
            >
              {isSavingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Administrative Override</span>
            </button>

            {overrideSuccess && (
              <p className="text-emerald-700 text-center font-bold text-[11px]">
                ✓ Override saved successfully!
              </p>
            )}
          </div>
        </div>

        {/* 5. One-Click AI Field Work Order Generator */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-neutral-700" />
              1-Click AI Field Work Order
            </h3>

            {workOrder && (
              <button
                onClick={handleCopyWorkOrder}
                className="text-xs text-neutral-700 hover:text-black flex items-center gap-1 font-bold"
              >
                {copiedWorkOrder ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedWorkOrder ? 'Copied!' : 'Copy Brief'}</span>
              </button>
            )}
          </div>

          {!workOrder ? (
            <button
              onClick={handleGenerateWorkOrder}
              disabled={isGeneratingWorkOrder}
              className="w-full py-3 px-5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition active:translate-y-0.5"
            >
              {isGeneratingWorkOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating technical dispatch brief with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Field Work Order</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-300 text-xs space-y-3 animate-fade-in">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-0.5">Probable Root Cause:</span>
                <p className="text-neutral-900 font-medium">{workOrder.probable_root_cause}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-0.5">Recommended Crew Size:</span>
                <p className="text-neutral-950 font-bold">{workOrder.recommended_crew_size}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Equipment Required:</span>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-800 font-medium">
                  {workOrder.required_equipment.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Safety & Hazard Precautions:</span>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-800 font-medium">
                  {workOrder.safety_precautions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* 1-Click Dispatch to Respective Team */}
              <div className="pt-3 border-t border-neutral-200 space-y-2">
                <button
                  type="button"
                  onClick={handleDispatchToDepartment}
                  disabled={isDispatching || incident.status === 'IN_PROGRESS'}
                  className={`w-full py-3 px-5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition active:translate-y-0.5 ${
                    incident.status === 'IN_PROGRESS'
                      ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmitting order to {overrideAgency}...</span>
                    </>
                  ) : incident.status === 'IN_PROGRESS' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Dispatched to {incident.agency} (In Progress)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>1-Click Dispatch to {overrideAgency}</span>
                    </>
                  )}
                </button>

                {dispatchSuccess && (
                  <p className="text-emerald-700 text-center font-bold text-[11px] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Order successfully transmitted! Ticket status is now IN PROGRESS.</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 6. Closed-Loop Resolution Audit Module */}
        <div className="space-y-3 pt-4 pb-8">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-neutral-700" />
            Closed-Loop Resolution Audit
          </h3>

          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-300 space-y-3 text-xs">
            <p className="text-neutral-600">
              Upload contractor completion "After" photo. Gemini will conduct a dual-image forensic comparison to prevent fake closures.
            </p>

            {/* Photo dropzone */}
            {afterPhotoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-neutral-300 h-36 bg-neutral-200">
                <img src={afterPhotoPreview} alt="After repair preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setAfterPhotoFile(null);
                    setAfterPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-neutral-950/80 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-300 hover:border-black rounded-xl cursor-pointer bg-white transition text-center">
                <Upload className="w-6 h-6 text-neutral-500 mb-1" />
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">Upload Contractor "After" Photo</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Dual-image AI forensic validation</span>
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
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Contractor ID</label>
                <input
                  type="text"
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Closure Notes</label>
                <input
                  type="text"
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="e.g. Asphalting completed"
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 mt-1 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <button
              onClick={handleAuditSubmit}
              disabled={!afterPhotoFile || isAuditing}
              className="w-full py-2.5 px-4 rounded-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:translate-y-0.5"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running Gemini Dual-Image Forensic Audit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Submit for AI Verification</span>
                </>
              )}
            </button>

            {/* Audit Verdict Inline Card */}
            {auditResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                auditResult.audit_status === 'VERIFIED_FIXED'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>Audit Verdict: {auditResult.audit_status}</span>
                  <span>{(auditResult.audit_confidence * 100).toFixed(0)}% Confidence</span>
                </div>
                <p>{auditResult.evidence_notes}</p>
                {auditResult.citizen_reopen_window_expires && (
                  <p className="text-emerald-800 font-mono text-[11px]">
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
