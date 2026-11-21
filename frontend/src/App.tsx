import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { apiClient } from './services/apiClient';
import { SystemStatus } from './types/api';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

export function App() {
  const [activeRole, setActiveRole] = useState<'citizen' | 'admin'>('citizen');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getHealth()
      .then(setSystemStatus)
      .catch((err) => console.warn('Could not fetch initial health status:', err));
  }, []);

  const handleResetDemo = async () => {
    try {
      const res = await apiClient.resetDemoData();
      setResetMessage(res.message);
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      setResetMessage('Demo data reset to local default.');
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        onResetDemo={handleResetDemo}
        isFallback={systemStatus?.gemini?.fallback_circuit_breaker_enabled && !systemStatus?.gemini?.configured}
      />

      {/* Temporary Toast for Reset Action */}
      {resetMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-md shadow-lg border border-slate-700 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Main Container Switch */}
      <main className="flex-1">
        {activeRole === 'citizen' ? (
          /* Mobile-First Citizen Shell Container */
          <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Citizen Reporting Portal
                </span>
                <span className="text-xs text-slate-500 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ward 14 • Indiranagar</span>
                </span>
              </div>

              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Report a Civic Issue in Under 20 Seconds
              </h1>
              <p className="text-xs text-slate-600">
                Snap a photo or speak in Hindi, Kannada, Telugu, Tamil, or English. Gemini AI classifies the defect and routes it directly to BBMP, PWD, or BESCOM.
              </p>

              <div className="pt-2">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Section 1 Scaffolding Complete
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ready for Section 2 (Data Models & Schemas) and Section 3 (Multimodal Intake).
                  </p>
                </div>
              </div>
            </div>

            {/* System Status Pill */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Backend API: <strong>{systemStatus?.status || 'Connecting...'}</strong></span>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                Storage: {systemStatus?.storage?.mode || 'memory'}
              </span>
            </div>
          </div>
        ) : (
          /* Desktop-First Admin Command Center Workspace */
          <div className="w-full h-[calc(100vh-56px)] overflow-hidden flex flex-col p-4 bg-slate-100 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Municipal Command Center
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  High-Signal GIS Triage & Dispatch
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Escalation Ladder Active</span>
                </span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-slate-700">Leaflet GIS Command Map</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Interactive map with custom L.divIcon priority pins and CircleMarker hotspot density will render here in Section 7.
                </p>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-slate-700">Incident Triage Queue</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Sortable queue with Explainable AI Triage Drawer and 1-click work orders.
                </p>
                <button
                  onClick={() => setActiveRole('citizen')}
                  className="mt-4 inline-flex items-center space-x-1 text-xs text-indigo-600 font-semibold hover:underline"
                >
                  <span>Switch back to Citizen View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
