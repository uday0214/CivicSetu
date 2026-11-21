import React, { useState, useEffect } from 'react';

interface CivicNode {
  id: string;
  label: string;
  sub: string;
  state: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  connectedTo: string[];
}

const LEFT_NODES: CivicNode[] = [
  {
    id: 'l1',
    label: 'Ward 14',
    sub: 'Indiranagar',
    state: 'KA',
    x: 28,
    y: 18,
    connectedTo: ['l2', 'l3'],
  },
  {
    id: 'l2',
    label: 'Ward 84',
    sub: 'Koramangala',
    state: 'KA',
    x: 65,
    y: 42,
    connectedTo: ['l3'],
  },
  {
    id: 'l3',
    label: 'Ward 150',
    sub: 'Bellandur',
    state: 'KA',
    x: 35,
    y: 68,
    connectedTo: ['l4'],
  },
  {
    id: 'l4',
    label: 'Zone 4',
    sub: 'Mysuru MCC',
    state: 'KA',
    x: 55,
    y: 88,
    connectedTo: [],
  },
];

const RIGHT_NODES: CivicNode[] = [
  {
    id: 'r1',
    label: 'Circle 20',
    sub: 'Madhapur / Hitec',
    state: 'TG',
    x: 65,
    y: 16,
    connectedTo: ['r2'],
  },
  {
    id: 'r2',
    label: 'Zone 9',
    sub: 'T. Nagar GCC',
    state: 'TN',
    x: 32,
    y: 44,
    connectedTo: ['r3'],
  },
  {
    id: 'r3',
    label: 'Zone 3',
    sub: 'Vizag Beach Rd',
    state: 'AP',
    x: 68,
    y: 70,
    connectedTo: ['r4'],
  },
  {
    id: 'r4',
    label: 'Circle 2',
    sub: 'Vijayawada VMC',
    state: 'AP',
    x: 40,
    y: 90,
    connectedTo: [],
  },
];

interface InteractiveSideNodesProps {
  side: 'left' | 'right';
}

export const InteractiveSideNodes: React.FC<InteractiveSideNodesProps> = ({ side }) => {
  const nodes = side === 'left' ? LEFT_NODES : RIGHT_NODES;
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activePulse, setActivePulse] = useState<number>(0);

  // Gentle periodic subtle pulse among nodes
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % nodes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [nodes.length]);

  return (
    <div className="hidden xl:block absolute inset-y-0 w-64 pointer-events-auto select-none overflow-hidden transition-opacity duration-300">
      {/* SVG Connecting Vector Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`node-grad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#171717" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#171717" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {nodes.map((source) =>
          source.connectedTo.map((targetId) => {
            const target = nodes.find((n) => n.id === targetId);
            if (!target) return null;
            const isHighlighted =
              hoveredNodeId === source.id || hoveredNodeId === target.id;

            return (
              <g key={`${source.id}-${target.id}`}>
                <line
                  x1={`${source.x}%`}
                  y1={`${source.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke={isHighlighted ? '#171717' : `url(#node-grad-${side})`}
                  strokeWidth={isHighlighted ? 1.5 : 1}
                  strokeDasharray={isHighlighted ? 'none' : '3 4'}
                  className="transition-all duration-300"
                />
              </g>
            );
          })
        )}
      </svg>

      {/* Interactive Nodes */}
      {nodes.map((node, idx) => {
        const isHovered = hoveredNodeId === node.id;
        const isPulsing = activePulse === idx;

        return (
          <div
            key={node.id}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            className="absolute cursor-pointer group"
          >
            {/* Outer Subtle Pulse Ring */}
            <div
              className={`absolute -inset-2.5 rounded-full border border-neutral-400 transition-all duration-500 ${
                isHovered || isPulsing
                  ? 'opacity-80 scale-110 border-neutral-900'
                  : 'opacity-0 scale-90'
              }`}
            />

            {/* Central Dotted Geopin / Dot Node */}
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 border ${
                isHovered
                  ? 'bg-neutral-950 border-neutral-950 scale-125 shadow-sm'
                  : isPulsing
                  ? 'bg-neutral-900 border-neutral-900 scale-110'
                  : 'bg-white border-neutral-400'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isHovered || isPulsing ? 'bg-white' : 'bg-neutral-800'
                }`}
              />
            </div>

            {/* Micro Metadata Taglet */}
            <div
              className={`absolute whitespace-nowrap mt-2 px-2 py-0.5 rounded-md border text-[9px] font-mono transition-all duration-200 ${
                side === 'left' ? 'left-0' : 'right-0'
              } ${
                isHovered
                  ? 'bg-neutral-950 text-white border-neutral-950 shadow-md translate-y-0.5 opacity-100 z-20'
                  : 'bg-white/90 text-neutral-600 border-neutral-300 backdrop-blur-xs opacity-70 group-hover:opacity-100 z-10'
              }`}
            >
              <span className="font-bold">{node.label}</span>
              <span className="text-neutral-400 mx-1">•</span>
              <span className="font-medium text-[8.5px]">{node.sub}</span>
              <span className="ml-1 text-[8px] font-bold text-neutral-400 uppercase">[{node.state}]</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
