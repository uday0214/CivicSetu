import React from 'react';
import { ArrowUpRight, RotateCcw, Sparkles, LogOut, User, Shield } from 'lucide-react';
import { AuthUser } from '../../types/api';

interface TopNavProps {
  currentUser: AuthUser | null;
  activeRole: 'citizen' | 'admin';
  onRoleChange: (role: 'citizen' | 'admin') => void;
  onLogout: () => void;
  onResetDemo: () => void;
  isFallback?: boolean;
  activeTab?: 'report' | 'feed' | 'my-reports';
  onTabChange?: (tab: 'report' | 'feed' | 'my-reports') => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentUser,
  activeRole,
  onRoleChange,
  onLogout,
  onResetDemo,
  isFallback = false,
  activeTab = 'report',
  onTabChange,
}) => {
  return (
    <header className="h-16 bg-white text-neutral-950 border-b border-neutral-900 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-50 select-none">
      {/* Left: Brand // CivicSetu */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-base tracking-tight text-neutral-400 font-bold">//</span>
        <div className="flex items-baseline gap-2">
          <span className="font-black text-xl tracking-tight text-neutral-950 font-sans">
            CivicSetu
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 border border-neutral-300 rounded px-1.5 py-0.5">
            Bengaluru • BBMP
          </span>
        </div>
      </div>

      {/* Center: Clean Uppercase Navigation Links */}
      {activeRole === 'citizen' && onTabChange ? (
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-neutral-600">
          <button
            onClick={() => onTabChange('report')}
            className={`transition hover:text-black py-1 ${
              activeTab === 'report' ? 'text-black border-b-2 border-black font-extrabold' : ''
            }`}
          >
            Report Issue
          </button>
          <button
            onClick={() => onTabChange('feed')}
            className={`transition hover:text-black py-1 ${
              activeTab === 'feed' ? 'text-black border-b-2 border-black font-extrabold' : ''
            }`}
          >
            Live Map & Feed
          </button>
          <button
            onClick={() => onTabChange('my-reports')}
            className={`transition hover:text-black py-1 ${
              activeTab === 'my-reports' ? 'text-black border-b-2 border-black font-extrabold' : ''
            }`}
          >
            Audit Tracking
          </button>
        </nav>
      ) : (
        <div className="hidden md:flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-neutral-600">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Municipal High-Signal Dispatch Matrix</span>
        </div>
      )}

      {/* Right: User Identity Badge + Reset Demo + Role Switch / Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {currentUser && (
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300">
            {currentUser.role === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="font-bold text-neutral-900 truncate max-w-[150px]">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase">
              ({currentUser.role})
            </span>
          </div>
        )}

        <button
          onClick={onResetDemo}
          title="Reset seeded Indian city dataset"
          className="flex items-center gap-1 text-[11px] font-mono uppercase font-bold text-neutral-700 hover:text-black transition px-3 py-1.5 rounded-full border border-neutral-300 hover:border-black"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{isFallback ? 'Demo Fallback' : 'Gemini 2.5 Flash'}</span>
        </div>

        {/* Portal Switch Button */}
        <button
          onClick={() => onRoleChange(activeRole === 'citizen' ? 'admin' : 'citizen')}
          className="bg-neutral-950 text-white hover:bg-neutral-800 transition px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
          title="Switch between Citizen and Municipal Admin Portal"
        >
          <span>{activeRole === 'citizen' ? 'Admin Portal' : 'Citizen View'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        {/* Logout / Switch Role Button */}
        <button
          onClick={onLogout}
          title="Sign out or switch authorization account"
          className="flex items-center gap-1 text-[11px] font-mono uppercase font-bold text-neutral-700 hover:text-rose-600 transition p-2 rounded-full border border-neutral-300 hover:border-rose-400"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
