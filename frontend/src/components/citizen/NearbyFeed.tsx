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
    let isMounted = true;
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.6412], // Bengaluru Indiranagar center
        zoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (!isMounted) {
        map.remove();
        return;
      }

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

    return () => {
      isMounted = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [viewMode, filteredIncidents]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
      {/* Top Header & View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-neutral-950 flex items-center gap-2 uppercase tracking-wide">
            <MapPin className="w-4 h-4 text-neutral-900" />
            Nearby Public Feed
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono">Ward transparency & deduplicated reports</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-neutral-100 border border-neutral-300 rounded-full p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'map' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:text-black'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'list' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:text-black'
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
            className={`px-3.5 py-1.5 rounded-full font-bold text-[11px] tracking-wide shrink-0 transition ${
              selectedCategory === cat
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'bg-white text-neutral-700 border border-neutral-300 hover:border-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white border border-neutral-300 rounded-2xl overflow-hidden shadow-sm relative">
          <div ref={mapContainerRef} className="w-full h-96 z-0" />
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600 flex items-center justify-between font-mono">
            <span>Showing {filteredIncidents.length} active tickets nearby</span>
            <span className="text-[11px] text-neutral-500">Tap pin to view issue & upvote</span>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-neutral-300 text-neutral-500 text-xs font-medium">
              No civic issues matching "{selectedCategory}" in this area.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const priorityStyle = getPriorityBadgeColor(inc.priority);
              return (
                <div
                  key={inc.incident_id}
                  className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-4 shadow-sm transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-neutral-900">{inc.incident_id}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                          {inc.priority}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                          {inc.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-neutral-950">{inc.title}</h4>
                    </div>

                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {inc.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">{inc.description_standardized_en}</p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 text-xs">
                    <div className="flex items-center gap-3 text-neutral-500 font-medium text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-neutral-900">
                        <Users className="w-3.5 h-3.5 text-neutral-700" />
                        {inc.community_impact_score} citizens impacted
                      </span>
                      <span>•</span>
                      <span>{inc.ward_id}</span>
                    </div>

                    <button
                      onClick={() => handleUpvote(inc.incident_id)}
                      disabled={upvotingId === inc.incident_id}
                      className="px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold tracking-wide flex items-center gap-1.5 transition active:translate-y-0.5"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Me Too (+1)</span>
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
