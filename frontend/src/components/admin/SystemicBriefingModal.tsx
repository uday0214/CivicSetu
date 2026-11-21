import React from 'react';
import { SystemicBriefingResponse } from '../../types/api';
import { Sparkles, X, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';

interface SystemicBriefingModalProps {
  briefing: SystemicBriefingResponse;
  onClose: () => void;
}

export const SystemicBriefingModal: React.FC<SystemicBriefingModalProps> = ({
  briefing,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-white border-2 border-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-950 uppercase tracking-wide">
                Systemic Infrastructure Intelligence
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                AI Cross-Ward Pattern Synthesis • {briefing.clusters_detected} Macro Clusters Detected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-500 hover:text-black hover:bg-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Executive Markdown Analysis */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 leading-relaxed text-neutral-800 whitespace-pre-wrap font-sans">
            {briefing.systemic_analysis_markdown}
          </div>

          {/* Recommended Joint Dispatches */}
          {briefing.recommended_joint_dispatch?.length > 0 && (
            <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-neutral-700" />
                Recommended Joint-Agency Dispatches
              </span>
              <ul className="list-disc list-inside space-y-1 text-neutral-800">
                {briefing.recommended_joint_dispatch.map((item, idx) => (
                  <li key={idx} className="font-semibold">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Priority Watchlist */}
          {briefing.priority_watchlist?.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Commissioner High-Risk Priority Watchlist
              </span>
              <ul className="list-disc list-inside space-y-1 text-rose-900">
                {briefing.priority_watchlist.map((item, idx) => (
                  <li key={idx} className="font-bold">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acknowledge Briefing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
