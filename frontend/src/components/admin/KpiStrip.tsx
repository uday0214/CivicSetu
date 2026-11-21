import React from 'react';
import { KpiSummaryResponse } from '../../types/api';
import { AlertCircle, Clock, Copy, ShieldCheck, Sparkles, ShieldAlert } from 'lucide-react';

interface KpiStripProps {
  kpi: KpiSummaryResponse;
  onAnalyzePatterns: () => void;
  onFilterOverdue?: () => void;
  onFilterCritical?: () => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  kpi,
  onAnalyzePatterns,
  onFilterOverdue,
  onFilterCritical,
}) => {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
      {/* 5 KPI Metric Cards */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 1. Critical Open (P0) */}
        <button
          onClick={onFilterCritical}
          className="bg-slate-950/80 hover:bg-red-950/30 border border-red-500/30 hover:border-red-500/60 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Critical Open (P0)</div>
            <div className="text-lg font-black text-red-400 leading-tight group-hover:scale-105 transition-transform">
              {kpi.critical_open_count}
            </div>
          </div>
        </button>

        {/* 2. SLA Overdue */}
        <button
          onClick={onFilterOverdue}
          className="bg-slate-950/80 hover:bg-amber-950/30 border border-amber-500/30 hover:border-amber-500/60 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">SLA Overdue</div>
            <div className="text-lg font-black text-amber-400 leading-tight group-hover:scale-105 transition-transform">
              {kpi.sla_overdue_count}
            </div>
          </div>
        </button>

        {/* 3. Escalated to Commissioner (Level 3) */}
        <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Level 3 Escalated</div>
            <div className="text-lg font-black text-purple-300 leading-tight">
              {kpi.escalated_commissioner_count}
            </div>
          </div>
        </div>

        {/* 4. Duplicates Merged */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Duplicates Merged</div>
            <div className="text-lg font-black text-cyan-300 leading-tight">
              {kpi.duplicates_merged_count}
            </div>
          </div>
        </div>

        {/* 5. AI Verification Rate */}
        <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">AI Verified Fixes</div>
            <div className="text-lg font-black text-teal-300 leading-tight">
              {kpi.ai_verification_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Primary AI Macro Action Button */}
      <button
        onClick={onAnalyzePatterns}
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-950 flex items-center gap-2 shrink-0 transition"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span>Analyze Citywide Patterns</span>
      </button>
    </div>
  );
};
