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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-white border-2 border-neutral-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-950 uppercase tracking-wide">Already Reported Nearby!</h3>
            <p className="text-xs text-neutral-600 font-mono flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
              {duplicateInfo.distance_meters ? `${duplicateInfo.distance_meters.toFixed(0)}m away` : 'Within 100m'} • Issue already tracked by municipality
            </p>
          </div>
        </div>

        {/* Existing Incident Card */}
        <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-mono font-bold text-neutral-950">{incident.incident_id}</span>
            <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
              {incident.priority}
            </span>
          </div>

          <h4 className="font-black text-neutral-950 text-sm mb-1">{incident.title}</h4>
          <p className="text-xs text-neutral-600 line-clamp-2 mb-3 leading-relaxed">{incident.description_standardized_en}</p>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-neutral-900 font-bold">
              <Users className="w-3.5 h-3.5 text-neutral-600" />
              <span>{incident.community_impact_score} citizens reported this</span>
            </div>
            <span>{incident.ward_id}</span>
          </div>
        </div>

        {duplicateInfo.similarity_reason && (
          <p className="text-xs text-neutral-700 italic mb-5 bg-neutral-100 p-2.5 rounded-lg border border-neutral-200 font-sans">
            💡 AI Match Note: {duplicateInfo.similarity_reason}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onConfirmBoost(incident.incident_id)}
            className="w-full py-3 px-5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition active:translate-y-0.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Boost Priority (+1)</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onSubmitSeparately}
              className="text-xs text-neutral-600 hover:text-black font-semibold underline underline-offset-4 transition"
            >
              No, this is a different issue — submit separately
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:text-neutral-700 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
