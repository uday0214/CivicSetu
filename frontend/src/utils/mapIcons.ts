import L from 'leaflet';
import { PriorityTier, CivicCategory } from '../types/api';

export function getCategoryColor(category: CivicCategory | string): string {
  switch (category) {
    case 'Roads & Footpaths':
    case 'ROADS_FOOTPATHS':
      return '#f97316'; // orange-500
    case 'Sanitation & Waste':
    case 'SANITATION_WASTE':
      return '#84cc16'; // lime-500
    case 'Water & Drainage':
    case 'WATER_DRAINAGE':
      return '#06b6d4'; // cyan-500
    case 'Electricity & Lighting':
    case 'ELECTRICITY_LIGHTING':
      return '#eab308'; // yellow-500
    case 'Public Safety':
    case 'PUBLIC_SAFETY':
      return '#ef4444'; // red-500
    default:
      return '#6366f1'; // indigo-500
  }
}

export function getPriorityBadgeColor(priority: PriorityTier | string): { bg: string; text: string; border: string } {
  switch (priority) {
    case 'P0_CRITICAL':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    case 'P1_HIGH':
      return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' };
    case 'P2_MEDIUM':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' };
    case 'P3_LOW':
      return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' };
    default:
      return { bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-300' };
  }
}

export function createCustomSvgPin(category: CivicCategory | string, priority: PriorityTier | string, isSelected: boolean = false): L.DivIcon {
  const pinColor = priority === 'P0_CRITICAL' ? '#ef4444' : getCategoryColor(category);
  const size = isSelected ? 40 : 32;
  const strokeColor = isSelected ? '#ffffff' : '#0f172a';
  const strokeWidth = isSelected ? 3 : 2;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%); cursor: pointer;">
      <svg viewBox="0 0 36 48" width="${size}" height="${size * 1.33}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 29.5 18 48 18 48C18 48 36 29.5 36 18C36 8.06 27.94 0 18 0Z" fill="${pinColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
        <circle cx="18" cy="18" r="8" fill="#ffffff" />
        <circle cx="18" cy="18" r="5" fill="${pinColor}" />
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'civicsetu-custom-pin',
    html,
    iconSize: [size, size * 1.33],
    iconAnchor: [size / 2, size * 1.33],
    popupAnchor: [0, -(size * 1.33)],
  });
}
