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
    <div className="w-full h-full flex flex-col bg-white border-l border-neutral-900">
      {/* Top Filter Bar */}
      <div className="p-3 border-b border-neutral-200 space-y-2.5 bg-neutral-50 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-neutral-950 uppercase tracking-wider">
            Triage Queue ({filteredIncidents.length})
          </span>

          <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-neutral-300 text-neutral-800 text-[11px] font-bold rounded-md px-2 py-1 focus:outline-none focus:border-black"
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
            className="bg-white border border-neutral-300 text-neutral-800 font-medium text-[11px] rounded-md p-1.5 focus:outline-none focus:border-black"
          >
            <option value="All">All Priority</option>
            {PRIORITY_TIERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="bg-white border border-neutral-300 text-neutral-800 font-medium text-[11px] rounded-md p-1.5 focus:outline-none focus:border-black"
          >
            <option value="All">All Agencies</option>
            {INDIAN_AGENCIES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-neutral-300 text-neutral-800 font-medium text-[11px] rounded-md p-1.5 focus:outline-none focus:border-black"
          >
            <option value="All">All Status</option>
            {['REPORTED', 'TRIAGED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'REOPENED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident List Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-transparent">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-mono">
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
                className={`p-3 rounded-xl cursor-pointer transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-neutral-100 border-2 border-black shadow-sm'
                    : 'bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-neutral-900">{inc.incident_id}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                      {inc.priority}
                    </span>
                    {isLevel3 && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                        <ShieldAlert className="w-3 h-3" />
                        Level 3 Commissioner
                      </span>
                    )}
                    {isLevel2 && !isLevel3 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                        Level 2 Zonal
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {inc.status}
                  </span>
                </div>

                <h4 className="text-xs font-black text-neutral-950 line-clamp-1">{inc.title}</h4>

                {inc.location?.landmark && (
                  <p className="text-[11px] text-neutral-500 line-clamp-1 font-mono">📍 {inc.location.landmark}</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 font-mono">
                  <span>{inc.agency} • {inc.ward_id}</span>

                  <div className="flex items-center gap-2">
                    {hasRejectedAudit && (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5" title="Prior contractor resolution was rejected by AI">
                        <AlertTriangle className="w-3 h-3" /> Fake Fix Rejected
                      </span>
                    )}
                    <span className="text-neutral-900 font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-neutral-500" />
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
