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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Systemic Infrastructure Intelligence</h3>
              <p className="text-[11px] text-purple-300">
                AI Cross-Ward Pattern Synthesis • {briefing.clusters_detected} Macro Clusters Detected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Executive Markdown Analysis */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
            {briefing.systemic_analysis_markdown}
          </div>

          {/* Recommended Joint Dispatches */}
          {briefing.recommended_joint_dispatch?.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Recommended Joint-Agency Dispatches
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {briefing.recommended_joint_dispatch.map((item, idx) => (
                  <li key={idx} className="font-medium">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Priority Watchlist */}
          {briefing.priority_watchlist?.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Commissioner High-Risk Priority Watchlist
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {briefing.priority_watchlist.map((item, idx) => (
                  <li key={idx} className="font-semibold text-red-200">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Acknowledge Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
