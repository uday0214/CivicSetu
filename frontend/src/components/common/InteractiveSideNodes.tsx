import React, { useState, useEffect } from 'react';

interface CivicNode {
  id: string;
  label: string;
  sub: string;
  state: string;
  metric: string;
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
    metric: '98% SLA',
    x: 32,
    y: 16,
    connectedTo: ['l2', 'l3'],
  },
  {
    id: 'l2',
    label: 'Ward 84',
    sub: 'Koramangala',
    state: 'KA',
    metric: '4h Dispatch',
    x: 68,
    y: 38,
    connectedTo: ['l3'],
  },
  {
    id: 'l3',
    label: 'Ward 150',
    sub: 'Bellandur ORR',
    state: 'KA',
    metric: 'Audit Verified',
    x: 36,
    y: 64,
    connectedTo: ['l4'],
  },
  {
    id: 'l4',
    label: 'Zone 4',
    sub: 'Mysuru MCC',
    state: 'KA',
    metric: 'Active',
    x: 62,
    y: 86,
    connectedTo: [],
  },
];

const RIGHT_NODES: CivicNode[] = [
  {
    id: 'r1',
    label: 'Circle 20',
    sub: 'Madhapur / Hitec',
    state: 'TG',
    metric: 'GHMC Live',
    x: 58,
    y: 15,
    connectedTo: ['r2'],
  },
  {
    id: 'r2',
    label: 'Zone 9',
    sub: 'T. Nagar / Pondy',
    state: 'TN',
    metric: 'GCC Central',
    x: 32,
    y: 40,
    connectedTo: ['r3'],
  },
  {
    id: 'r3',
    label: 'Zone 3',
    sub: 'Vizag Beach Rd',
    state: 'AP',
    metric: 'GVMC Coastal',
    x: 64,
    y: 66,
    connectedTo: ['r4'],
  },
  {
    id: 'r4',
    label: 'Circle 2',
    sub: 'Vijayawada VMC',
    state: 'AP',
    metric: 'Canal Axis',
    x: 35,
    y: 88,
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

  // Gentle periodic pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % nodes.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [nodes.length]);

  return (
    <div
      className={`hidden lg:block absolute inset-y-0 w-52 sm:w-64 pointer-events-auto select-none transition-opacity duration-300 z-0 ${
        side === 'left' ? 'left-3 xl:left-8' : 'right-3 xl:right-8'
      }`}
    >
      {/* Background Architectural Mesh & Subtle Compass Ruler */}
      <div
        className={`absolute inset-y-0 ${
          side === 'left' ? 'left-0' : 'right-0'
        } w-full opacity-60 pointer-events-none`}
      >
        {/* Subtle Vertical Coordinate Datum Line */}
        <div
          className={`absolute inset-y-8 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent ${
            side === 'left' ? 'left-4' : 'right-4'
          }`}
        />

        {/* Technical Coordinate Tick Marks */}
        <div
          className={`absolute top-10 flex flex-col gap-24 text-[8px] font-mono text-neutral-400 uppercase tracking-widest ${
            side === 'left' ? 'left-6' : 'right-6 text-right'
          }`}
        >
          <span>{side === 'left' ? 'JURISDICTION_GRID // W1' : 'JURISDICTION_GRID // E2'}</span>
          <span>{side === 'left' ? 'LAT 12.9716° N' : 'LAT 17.4483° N'}</span>
          <span>{side === 'left' ? 'LNG 77.6412° E' : 'LNG 78.3915° E'}</span>
          <span>SLA_STATUS: OPTIMAL</span>
        </div>
      </div>

      {/* SVG Connecting Vector Lines & Cross-Hairs */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`node-grad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#171717" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#171717" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* Decorative Circuit Paths */}
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
                  strokeWidth={isHighlighted ? 1.75 : 1.2}
                  strokeDasharray={isHighlighted ? 'none' : '3 4'}
                  className="transition-all duration-300"
                />
              </g>
            );
          })
        )}
      </svg>

      {/* Interactive Ward Nodes */}
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
            {/* Outer Target Cross-Hairs */}
            <div
              className={`absolute -inset-3 rounded-full border border-neutral-300 transition-all duration-300 ${
                isHovered || isPulsing
                  ? 'opacity-100 scale-110 border-neutral-800'
                  : 'opacity-40 scale-95'
              }`}
            />

            {/* Central Pin Node */}
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 border ${
                isHovered
                  ? 'bg-neutral-950 border-neutral-950 scale-125 shadow-md'
                  : isPulsing
                  ? 'bg-neutral-900 border-neutral-900 scale-110 shadow-xs'
                  : 'bg-white border-neutral-400'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isHovered || isPulsing ? 'bg-white' : 'bg-neutral-800'
                }`}
              />
            </div>

            {/* Clean Neo-Brutalist Micro Tag */}
            <div
              className={`absolute whitespace-nowrap mt-2 px-2.5 py-1 rounded-lg border text-[9.5px] font-mono transition-all duration-200 shadow-xs ${
                side === 'left' ? 'left-0' : 'right-0'
              } ${
                isHovered
                  ? 'bg-neutral-950 text-white border-neutral-950 translate-y-0.5 opacity-100 z-20 shadow-md'
                  : 'bg-white/95 text-neutral-800 border-neutral-300 backdrop-blur-xs opacity-85 group-hover:opacity-100 z-10'
              }`}
            >
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black">{node.label}</span>
                <span className="text-neutral-400 font-normal">•</span>
                <span className="font-medium text-[9px]">{node.sub}</span>
                <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
                  {node.state}
                </span>
              </div>
              <div className="text-[8px] text-neutral-400 font-mono mt-0.5">
                {node.metric}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
