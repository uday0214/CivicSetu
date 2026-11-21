import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import { MasterIncident, CIVIC_CATEGORIES } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { getPriorityBadgeColor, createCustomSvgPin } from '../../utils/mapIcons';
import { MapPin, ThumbsUp, Map as MapIcon, List, Users } from 'lucide-react';

interface NearbyFeedProps {
  onUpvoteSuccess?: (incidentId: string) => void;
}

export const NearbyFeed: React.FC<NearbyFeedProps> = ({ onUpvoteSuccess }) => {
  const [incidents, setIncidents] = useState<MasterIncident[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [_loading, setLoading] = useState<boolean>(true);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  // Map references
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const leafletMapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<L.Marker[]>([]);

  const loadIncidents = async () => {
    try {
      const data = await apiClient.listIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Filter incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedCategory === 'All') return true;
    return inc.category === selectedCategory;
  });

  // Handle Upvote / Me Too (+1)
  const handleUpvote = async (incidentId: string) => {
    setUpvotingId(incidentId);
    try {
      const res = await apiClient.upvoteIncident(incidentId);
      // Optimistically update incident in local state
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.incident_id === incidentId
            ? { ...inc, community_impact_score: res.community_impact_score, priority: res.priority as any }
            : inc
        )
      );
      if (onUpvoteSuccess) onUpvoteSuccess(incidentId);
    } catch (err) {
      console.error('Upvote failed:', err);
    } finally {
      setUpvotingId(null);
    }
  };

  // Initialize and update Leaflet map
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.6412], // Bengaluru Indiranagar center
        zoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for filtered incidents
    filteredIncidents.forEach((inc) => {
      if (!inc.location || !inc.location.lat || !inc.location.lng) return;

      const pin = createCustomSvgPin(inc.category, inc.priority);
      const marker = L.marker([inc.location.lat, inc.location.lng], { icon: pin }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; max-width: 220px;">
          <b style="color: #0284c7;">${inc.incident_id}</b>
          <h4 style="margin: 4px 0; font-size: 13px;">${inc.title}</h4>
          <p style="margin: 4px 0; color: #475569;">${inc.category} • ${inc.priority}</p>
          <div style="font-size: 11px; color: #ea580c; font-weight: bold;">👥 ${inc.community_impact_score} citizens reported</div>
        </div>
      `);

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [viewMode, filteredIncidents]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4 animate-fade-in pb-16">
      {/* Top Header & View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Nearby Civic Issues & Public Feed
          </h2>
          <p className="text-xs text-slate-400">Real-time public transparency for your ward</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'map' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List ({filteredIncidents.length})
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        {['All', ...CIVIC_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div ref={mapContainerRef} className="w-full h-96 z-0" />
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Showing {filteredIncidents.length} active tickets nearby</span>
            <span className="text-[11px] text-slate-500">Tap pin to view issue & upvote</span>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No civic issues matching "{selectedCategory}" in this area.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const priorityStyle = getPriorityBadgeColor(inc.priority);
              return (
                <div
                  key={inc.incident_id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-xl transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cyan-400">{inc.incident_id}</span>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                          {inc.priority}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                          {inc.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{inc.title}</h4>
                    </div>

                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {inc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{inc.description_standardized_en}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        {inc.community_impact_score} supporters
                      </span>
                      <span>•</span>
                      <span>{inc.ward_id}</span>
                    </div>

                    <button
                      onClick={() => handleUpvote(inc.incident_id)}
                      disabled={upvotingId === inc.incident_id}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-300 text-slate-200 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Me Too (+1)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
