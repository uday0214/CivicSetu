import React, { useState, useMemo } from 'react';
import { MasterIncident, INDIAN_AGENCIES, PRIORITY_TIERS } from '../../types/api';
import { getPriorityBadgeColor } from '../../utils/mapIcons';
import { Users, ShieldAlert, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface TicketQueueProps {
  incidents: MasterIncident[];
  selectedIncident: MasterIncident | null;
  onSelectIncident: (incident: MasterIncident) => void;
  filterOverdueOnly?: boolean;
  filterCriticalOnly?: boolean;
}

export const TicketQueue: React.FC<TicketQueueProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  filterOverdueOnly = false,
  filterCriticalOnly = false,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<string>(filterCriticalOnly ? 'P0_CRITICAL' : 'All');
  const [selectedAgency, setSelectedAgency] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'urgency' | 'newest'>('priority');

  // Filter & Sort
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (selectedPriority !== 'All' && inc.priority !== selectedPriority) return false;
        if (selectedAgency !== 'All' && inc.agency !== selectedAgency) return false;
        if (selectedStatus !== 'All' && inc.status !== selectedStatus) return false;
        if (filterOverdueOnly) {
          try {
            const deadline = new Date(inc.sla_deadline).getTime();
            if (Date.now() <= deadline || inc.status === 'RESOLVED') return false;
          } catch {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const rank = { P0_CRITICAL: 0, P1_HIGH: 1, P2_MEDIUM: 2, P3_LOW: 3 };
          return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
        }
        if (sortBy === 'impact') {
          return b.community_impact_score - a.community_impact_score;
        }
        if (sortBy === 'urgency') {
          return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [incidents, selectedPriority, selectedAgency, selectedStatus, sortBy, filterOverdueOnly]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Top Filter Bar */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-950/60 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Triage Queue ({filteredIncidents.length})
          </span>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="priority">Sort: Priority</option>
              <option value="impact">Sort: Most Impact</option>
              <option value="urgency">Sort: SLA Urgency</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-1.5 focus:outline-none"
          >
            <option value="All">All Priority</option>
            {PRIORITY_TIERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-1.5 focus:outline-none"
          >
            <option value="All">All Agencies</option>
            {INDIAN_AGENCIES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-1.5 focus:outline-none"
          >
            <option value="All">All Status</option>
            {['REPORTED', 'TRIAGED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'REOPENED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident List Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No tickets matching selected filters.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.incident_id === inc.incident_id;
            const priorityStyle = getPriorityBadgeColor(inc.priority);
            const isLevel3 = inc.escalation_tier === 'LEVEL_3_MUNICIPAL_COMMISSIONER';
            const isLevel2 = inc.escalation_tier === 'LEVEL_2_ZONAL_OFFICER';
            const hasRejectedAudit = inc.resolution_audit?.audit_status === 'REJECTED_MISMATCH';

            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 rounded-xl cursor-pointer transition flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-slate-800 border border-cyan-500/50 shadow-lg'
                    : 'bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{inc.incident_id}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                      {inc.priority}
                    </span>
                    {isLevel3 && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-sm shadow-red-950">
                        <ShieldAlert className="w-3 h-3" />
                        Level 3 Commissioner
                      </span>
                    )}
                    {isLevel2 && !isLevel3 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Level 2 Zonal
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {inc.status}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white line-clamp-1">{inc.title}</h4>

                {inc.location?.landmark && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">📍 {inc.location.landmark}</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>{inc.agency} • {inc.ward_id}</span>

                  <div className="flex items-center gap-2">
                    {hasRejectedAudit && (
                      <span className="text-red-400 font-bold flex items-center gap-0.5" title="Prior contractor resolution was rejected by AI">
                        <AlertTriangle className="w-3 h-3" /> Fake Fix Rejected
                      </span>
                    )}
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {inc.community_impact_score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
