import React from 'react';
import { ShieldAlert, User, Shield, RotateCcw, Sparkles } from 'lucide-react';

interface TopNavProps {
  activeRole: 'citizen' | 'admin';
  onRoleChange: (role: 'citizen' | 'admin') => void;
  onResetDemo: () => void;
  isFallback?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeRole,
  onRoleChange,
  onResetDemo,
  isFallback = false,
}) => {
  return (
    <header className="h-14 bg-slate-900 text-white border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-50 select-none shadow-md">
      {/* Left: Brand & City Pill */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-none">
              CivicSetu
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block leading-none mt-0.5">
              CivicResolve for Indian Cities
            </span>
          </div>
        </div>

        <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          Bengaluru • BBMP
        </span>
      </div>

      {/* Center: Segmented Pill Role Toggle */}
      <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
        <button
          onClick={() => onRoleChange('citizen')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
            activeRole === 'citizen'
              ? 'bg-orange-600 text-white shadow-sm font-semibold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Citizen Portal</span>
        </button>

        <button
          onClick={() => onRoleChange('admin')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
            activeRole === 'admin'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin Command Center</span>
        </button>
      </div>

      {/* Right: Reset Demo Data & Live AI Status */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onResetDemo}
          title="Reset seeded Indian city dataset for a clean live demo pitch"
          className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        <div className="flex items-center space-x-1.5 text-xs bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isFallback ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="text-[11px] text-slate-300 hidden sm:inline flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-emerald-400 inline mr-0.5" />
            {isFallback ? 'Demo Fallback' : 'Gemini 2.5'}
          </span>
        </div>
      </div>
    </header>
  );
};
