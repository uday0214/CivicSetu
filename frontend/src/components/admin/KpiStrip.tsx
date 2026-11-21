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
    <div className="w-full bg-white border-b border-neutral-900 px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none select-none">
      {/* 5 KPI Metric Cards */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 1. Critical Open (P0) */}
        <button
          onClick={onFilterCritical}
          className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 hover:border-black rounded-xl px-4 py-2 flex items-center gap-3 transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Critical Open (P0)</div>
            <div className="text-lg font-black text-rose-600 leading-tight group-hover:scale-105 transition-transform">
              {kpi.critical_open_count}
            </div>
          </div>
        </button>

        {/* 2. SLA Overdue */}
        <button
          onClick={onFilterOverdue}
          className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 hover:border-black rounded-xl px-4 py-2 flex items-center gap-3 transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">SLA Overdue</div>
            <div className="text-lg font-black text-amber-700 leading-tight group-hover:scale-105 transition-transform">
              {kpi.sla_overdue_count}
            </div>
          </div>
        </button>

        {/* 3. Escalated to Commissioner (Level 3) */}
        <div className="bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Level 3 Escalated</div>
            <div className="text-lg font-black text-purple-900 leading-tight">
              {kpi.escalated_commissioner_count}
            </div>
          </div>
        </div>

        {/* 4. Duplicates Merged */}
        <div className="bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Duplicates Merged</div>
            <div className="text-lg font-black text-neutral-900 leading-tight">
              {kpi.duplicates_merged_count}
            </div>
          </div>
        </div>

        {/* 5. AI Verification Rate */}
        <div className="bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">AI Verified Fixes</div>
            <div className="text-lg font-black text-emerald-700 leading-tight">
              {kpi.ai_verification_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Primary AI Macro Action Button */}
      <button
        onClick={onAnalyzePatterns}
        className="px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition shadow-sm active:translate-y-0.5"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Analyze Citywide Patterns</span>
      </button>
    </div>
  );
};
