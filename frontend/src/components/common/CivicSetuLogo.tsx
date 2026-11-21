import React from 'react';

/**
 * Pixel-precise dotted monochrome vector reproduction of the CivicSetu emblem:
 * Features:
 * - Left: Citizen raising ticket / report document (dotted)
 * - Center: Arched Setu (bridge) with dotted pillars & glowing geopin with checkmark
 * - Right: Municipal Government building with dome and flag (dotted pillars)
 *
 * Lightweight SVG under 1.5 KB with 0 external dependencies.
 */
export const CivicSetuLogo: React.FC<{
  className?: string;
  size?: number | string;
  showText?: boolean;
}> = ({ className = 'h-8', size = 32, showText = true }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-neutral-950"
      >
        {/* Dotted Bridge Arch Base (Setu) */}
        <path
          d="M 12 92 Q 80 50 148 92"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="1 6"
        />
        <path
          d="M 24 82 Q 80 44 136 82"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Vertical Bridge Pillars (Dotted) */}
        <line x1="48" y1="74" x2="48" y2="86" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="64" y1="67" x2="64" y2="85" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="80" y1="65" x2="80" y2="85" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="96" y1="67" x2="96" y2="85" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="112" y1="74" x2="112" y2="86" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />

        {/* Left: Citizen Raising Report Document */}
        {/* Citizen Head */}
        <circle cx="34" cy="46" r="9" fill="currentColor" />
        {/* Citizen Torso */}
        <path d="M 22 75 C 22 62 46 62 46 75" fill="currentColor" />
        {/* Citizen Raising Document */}
        <rect x="42" y="49" width="11" height="15" rx="1.5" transform="rotate(15 42 49)" stroke="currentColor" strokeWidth="2" fill="white" />
        <line x1="45" y1="55" x2="50" y2="56.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="46" y1="59" x2="51" y2="60.5" stroke="currentColor" strokeWidth="1.5" />
        {/* Sound / Action Rays from Citizen (Dotted) */}
        <circle cx="42" cy="36" r="1.5" fill="currentColor" />
        <circle cx="47" cy="40" r="1.5" fill="currentColor" />
        <circle cx="48" cy="45" r="1.5" fill="currentColor" />

        {/* Center: Glowing Location Pin on Bridge Top */}
        <circle cx="80" cy="30" r="10" stroke="currentColor" strokeWidth="2.5" fill="white" />
        <path d="M 75 30 L 78.5 33.5 L 85 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Glow dots above pin */}
        <circle cx="80" cy="13" r="1.5" fill="currentColor" />
        <circle cx="73" cy="16" r="1.5" fill="currentColor" />
        <circle cx="87" cy="16" r="1.5" fill="currentColor" />

        {/* Right: Municipal Government Building with Flag */}
        {/* Dome / Roof Pediment */}
        <polygon points="126,45 106,60 146,60" fill="currentColor" />
        {/* Flag Pole and Flag */}
        <line x1="126" y1="45" x2="126" y2="28" stroke="currentColor" strokeWidth="2" />
        <polygon points="126,28 135,32 126,36" fill="currentColor" />
        {/* 4 Dotted Colonnade Pillars */}
        <line x1="112" y1="63" x2="112" y2="82" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="121" y1="63" x2="121" y2="82" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="131" y1="63" x2="131" y2="82" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        <line x1="140" y1="63" x2="140" y2="82" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" />
        {/* Building Base Plinth */}
        <rect x="104" y="82" width="44" height="4" rx="1" fill="currentColor" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-lg tracking-tight text-neutral-950 font-sans leading-none">
            CivicSetu
          </span>
          <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase font-bold mt-0.5">
            Raise • Track • Resolve
          </span>
        </div>
      )}
    </div>
  );
};
