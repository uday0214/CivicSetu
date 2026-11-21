import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MasterIncident, PriorityTier } from '../../types/api';
import { getCategoryColor } from '../../utils/mapIcons';
import { Flame, MapPin } from 'lucide-react';

interface CommandMapProps {
  incidents: MasterIncident[];
  selectedIncident: MasterIncident | null;
  onSelectIncident: (incident: MasterIncident) => void;
}

export const CommandMap: React.FC<CommandMapProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
}) => {
  const [mapMode, setMapMode] = useState<'pins' | 'hotspots'>('pins');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Helper to create custom admin priority SVG pin with community impact score badge inside
  const createAdminSvgPin = (inc: MasterIncident, isSelected: boolean): L.DivIcon => {
    const isP0 = inc.priority === 'P0_CRITICAL';
    const pinColor = isP0 ? '#ef4444' : getCategoryColor(inc.category);
    const size = isSelected ? 42 : 34;
    const score = inc.community_impact_score;
    const stroke = isSelected ? '#ffffff' : '#0f172a';
    const strokeWidth = isSelected ? 3 : 2;

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%); cursor: pointer;">
        <svg viewBox="0 0 36 48" width="${size}" height="${size * 1.33}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
          <path d="M18 0C8.06 0 0 8.06 0 18C0 29.5 18 48 18 48C18 48 36 29.5 36 18C36 8.06 27.94 0 18 0Z" fill="${pinColor}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <circle cx="18" cy="18" r="10" fill="#ffffff" />
          <text x="18" y="22" font-size="11" font-weight="900" font-family="sans-serif" fill="${pinColor}" text-anchor="middle">${score}</text>
        </svg>
        ${isP0 ? '<span style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background-color: #ef4444; border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>' : ''}
      </div>
    `;

    return L.divIcon({
      className: 'civicsetu-admin-pin',
      html,
      iconSize: [size, size * 1.33],
      iconAnchor: [size / 2, size * 1.33],
      popupAnchor: [0, -(size * 1.33)],
    });
  };

  // Helper for priority color hex
  const getPriorityColorHex = (priority: PriorityTier): string => {
    switch (priority) {
      case 'P0_CRITICAL':
        return '#ef4444';
      case 'P1_HIGH':
        return '#f97316';
      case 'P2_MEDIUM':
        return '#eab308';
      case 'P3_LOW':
      default:
        return '#3b82f6';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.6412], // Bengaluru center
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Render Pins or Hotspot CircleMarkers
  useEffect(() => {
    const map = leafletMapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const boundsPoints: L.LatLngExpression[] = [];

    incidents.forEach((inc) => {
      if (!inc.location || inc.location.lat == null || inc.location.lng == null) return;
      const latLng: [number, number] = [inc.location.lat, inc.location.lng];
      boundsPoints.push(latLng);

      const isSelected = selectedIncident?.incident_id === inc.incident_id;

      if (mapMode === 'pins') {
        const pinIcon = createAdminSvgPin(inc, isSelected);
        const marker = L.marker(latLng, { icon: pinIcon }).addTo(layerGroup);
        marker.on('click', () => onSelectIncident(inc));
      } else {
        // Hotspot mode: translucent radius-scaled CircleMarkers (no leaflet.heat dependency)
        const radius = Math.min(60, 20 + inc.community_impact_score * 8);
        const color = getPriorityColorHex(inc.priority);

        const circle = L.circleMarker(latLng, {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(layerGroup);

        circle.bindTooltip(`
          <div style="font-size: 11px; font-weight: bold; color: #0f172a;">
            ${inc.title}<br/>
            <span style="color: #ea580c;">👥 ${inc.community_impact_score} citizens</span>
          </div>
        `);
        circle.on('click', () => onSelectIncident(inc));
      }
    });

    if (boundsPoints.length > 0 && !selectedIncident) {
      map.fitBounds(L.latLngBounds(boundsPoints).pad(0.1));
    }
  }, [incidents, selectedIncident, mapMode]);

  // Pan to selected incident
  useEffect(() => {
    if (leafletMapRef.current && selectedIncident?.location) {
      leafletMapRef.current.panTo([selectedIncident.location.lat, selectedIncident.location.lng], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedIncident]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-neutral-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-neutral-300 p-1 rounded-full shadow-sm">
        <button
          onClick={() => setMapMode('pins')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
            mapMode === 'pins'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Incident Pins</span>
        </button>

        <button
          onClick={() => setMapMode('hotspots')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
            mapMode === 'hotspots'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Impact Hotspots</span>
        </button>
      </div>

      {/* Map Legend Overlay (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-xs border border-neutral-300 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold text-neutral-700 flex items-center gap-3 shadow-sm">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> P0
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> P1
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> P2
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> P3
        </span>
      </div>
    </div>
  );
};
