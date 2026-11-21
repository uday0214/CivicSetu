import React from 'react';
import { MasterIncident, DedupCheckResult } from '../../types/api';
import { getPriorityBadgeColor } from '../../utils/mapIcons';
import { AlertTriangle, Users, MapPin, Check } from 'lucide-react';

interface DuplicateModalProps {
  duplicateInfo: DedupCheckResult;
  onConfirmBoost: (matchedIncidentId: string) => void;
  onSubmitSeparately: () => void;
  onCancel: () => void;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  duplicateInfo,
  onConfirmBoost,
  onSubmitSeparately,
  onCancel,
}) => {
  const incident: MasterIncident | undefined = duplicateInfo.matched_incident || undefined;
  if (!incident) return null;

  const priorityStyle = getPriorityBadgeColor(incident.priority);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Amber accent glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Already Reported Nearby!</h3>
            <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {duplicateInfo.distance_meters ? `${duplicateInfo.distance_meters.toFixed(0)}m away` : 'Within 100m'} • Issue already tracked by municipality
            </p>
          </div>
        </div>

        {/* Existing Incident Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-mono text-cyan-400">{incident.incident_id}</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
              {incident.priority}
            </span>
          </div>

          <h4 className="font-semibold text-white text-sm mb-1">{incident.title}</h4>
          <p className="text-xs text-slate-300 line-clamp-2 mb-3">{incident.description_standardized_en}</p>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>{incident.community_impact_score} citizens reported this</span>
            </div>
            <span className="text-slate-400">{incident.ward_id}</span>
          </div>
        </div>

        {duplicateInfo.similarity_reason && (
          <p className="text-xs text-slate-400 italic mb-5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            💡 AI Match Note: {duplicateInfo.similarity_reason}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onConfirmBoost(incident.incident_id)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            Confirm & Boost Priority (+1)
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onSubmitSeparately}
              className="text-xs text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-4 transition"
            >
              No, this is a different issue — submit separately
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
