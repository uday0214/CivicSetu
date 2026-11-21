import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { SnapSpeakForm, NearbyFeed, MyReportsList } from './components/citizen';
import { KpiStrip } from './components/admin/KpiStrip';
import { CommandMap } from './components/admin/CommandMap';
import { TicketQueue } from './components/admin/TicketQueue';
import { TriageDrawer } from './components/admin/TriageDrawer';
import { SystemicBriefingModal } from './components/admin/SystemicBriefingModal';
import { apiClient } from './services/apiClient';
import {
  SystemStatus,
  ReportSubmissionResponse,
  MasterIncident,
  KpiSummaryResponse,
  SystemicBriefingResponse,
} from './types/api';
import { CheckCircle2, Camera, MapPin, Clock, Loader2 } from 'lucide-react';

export function App() {
  const [activeRole, setActiveRole] = useState<'citizen' | 'admin'>('citizen');
  const [citizenTab, setCitizenTab] = useState<'report' | 'feed' | 'my-reports'>('report');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Admin Portal State
  const [adminIncidents, setAdminIncidents] = useState<MasterIncident[]>([]);
  const [adminKpi, setAdminKpi] = useState<KpiSummaryResponse | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<MasterIncident | null>(null);
  const [briefing, setBriefing] = useState<SystemicBriefingResponse | null>(null);
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);

  useEffect(() => {
    apiClient.getHealth()
      .then(setSystemStatus)
      .catch((err) => console.warn('Could not fetch initial health status:', err));
  }, []);

  // Fetch Admin Data when role switches to Admin
  useEffect(() => {
    if (activeRole === 'admin') {
      fetchAdminData();
    }
  }, [activeRole]);

  const fetchAdminData = async () => {
    setIsLoadingAdmin(true);
    try {
      const [incList, kpiData] = await Promise.all([
        apiClient.listIncidents(),
        apiClient.getKpiSummary(),
      ]);
      setAdminIncidents(incList);
      setAdminKpi(kpiData);
      if (incList.length > 0 && !selectedIncident) {
        setSelectedIncident(incList[0]);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleOpenBriefing = async () => {
    try {
      const data = await apiClient.getSystemicBriefing();
      setBriefing(data);
      setIsBriefingOpen(true);
    } catch (err) {
      console.error('Failed to load systemic briefing:', err);
      alert('Could not generate systemic briefing at this moment.');
    }
  };

  const handleAdminIncidentUpdated = (updated: MasterIncident) => {
    setAdminIncidents((prev) =>
      prev.map((inc) => (inc.incident_id === updated.incident_id ? updated : inc))
    );
    setSelectedIncident(updated);
    apiClient.getKpiSummary().then(setAdminKpi).catch(() => {});
  };

  const handleResetDemo = async () => {
    try {
      const res = await apiClient.resetDemoData();
      setResetMessage(res.message);
      if (activeRole === 'admin') {
        fetchAdminData();
      }
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      setResetMessage('Demo data reset to local default.');
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const handleReportSubmitted = (_result: ReportSubmissionResponse) => {
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
      <main className="flex-1 min-h-0 flex flex-col">
        {activeRole === 'citizen' ? (
          /* Mobile-First Citizen Shell Container */
          <div className="max-w-xl w-full mx-auto flex flex-col min-h-[calc(100vh-56px)]">
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
          <div className="w-full h-[calc(100vh-56px)] overflow-hidden flex flex-col bg-slate-950">
            {/* Top Operational KPI Strip */}
            {adminKpi && (
              <KpiStrip
                kpi={adminKpi}
                onAnalyzePatterns={handleOpenBriefing}
                onFilterOverdue={() => {
                  setFilterOverdueOnly((prev) => !prev);
                  setFilterCriticalOnly(false);
                }}
                onFilterCritical={() => {
                  setFilterCriticalOnly((prev) => !prev);
                  setFilterOverdueOnly(false);
                }}
              />
            )}

            {/* Split Screen Workspace: Map + Queue */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 relative">
              {isLoadingAdmin && (
                <div className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center gap-2 text-indigo-400 text-xs font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading Municipal Command Data...</span>
                </div>
              )}

              {/* Left Column (7 cols): GIS Command Map */}
              <div className="lg:col-span-7 h-full relative">
                <CommandMap
                  incidents={adminIncidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                />
              </div>

              {/* Right Column (5 cols): Triage Ticket Queue */}
              <div className="lg:col-span-5 h-full min-h-0 overflow-hidden">
                <TicketQueue
                  incidents={adminIncidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  filterOverdueOnly={filterOverdueOnly}
                  filterCriticalOnly={filterCriticalOnly}
                />
              </div>

              {/* Slide-over Triage Drawer */}
              {selectedIncident && (
                <TriageDrawer
                  incident={selectedIncident}
                  onClose={() => setSelectedIncident(null)}
                  onIncidentUpdated={handleAdminIncidentUpdated}
                />
              )}
            </div>

            {/* Systemic Infrastructure Briefing Modal */}
            {isBriefingOpen && briefing && (
              <SystemicBriefingModal
                briefing={briefing}
                onClose={() => setIsBriefingOpen(false)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
