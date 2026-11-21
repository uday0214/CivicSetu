import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { SnapSpeakForm } from './components/citizen/SnapSpeakForm';
import { NearbyFeed } from './components/citizen/NearbyFeed';
import { MyReportsList } from './components/citizen/MyReportsList';
import { apiClient } from './services/apiClient';
import { SystemStatus, ReportSubmissionResponse } from './types/api';
import { CheckCircle2, AlertTriangle, ArrowRight, Camera, MapPin, Clock } from 'lucide-react';

export function App() {
  const [activeRole, setActiveRole] = useState<'citizen' | 'admin'>('citizen');
  const [citizenTab, setCitizenTab] = useState<'report' | 'feed' | 'my-reports'>('report');
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

  const handleReportSubmitted = (_result: ReportSubmissionResponse) => {
    // Automatically switch to My Reports tab so user sees their new ticket
    setCitizenTab('my-reports');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
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
          <div className="max-w-xl mx-auto flex flex-col min-h-[calc(100vh-56px)]">
            {/* Top Sub-Nav Tabs */}
            <div className="p-3 sticky top-14 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setCitizenTab('report')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    citizenTab === 'report'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Report</span>
                </button>

                <button
                  onClick={() => setCitizenTab('feed')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    citizenTab === 'feed'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Nearby Feed</span>
                </button>

                <button
                  onClick={() => setCitizenTab('my-reports')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    citizenTab === 'my-reports'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>My Reports</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1">
              {citizenTab === 'report' && <SnapSpeakForm onReportSubmitted={handleReportSubmitted} />}
              {citizenTab === 'feed' && <NearbyFeed />}
              {citizenTab === 'my-reports' && <MyReportsList />}
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
