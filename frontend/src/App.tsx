import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { AuthPage } from './components/auth/AuthPage';
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
  AuthUser,
} from './types/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => apiClient.getStoredUser());
  const [activeRole, setActiveRole] = useState<'citizen' | 'admin'>(() => currentUser?.role || 'citizen');
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

    if (apiClient.getToken() && !currentUser) {
      apiClient.getMe()
        .then((user) => {
          setCurrentUser(user);
          setActiveRole(user.role);
        })
        .catch(() => {
          apiClient.logout();
          setCurrentUser(null);
        });
    }
  }, []);

  // Sync role with logged in user if changed
  useEffect(() => {
    if (currentUser) {
      setActiveRole(currentUser.role);
    }
  }, [currentUser]);

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveRole(user.role);
  };

  const handleLogout = () => {
    apiClient.logout();
    setCurrentUser(null);
  };

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

  if (!currentUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-950 font-sans selection:bg-neutral-900 selection:text-white">
      <TopNav
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        onLogout={handleLogout}
        onResetDemo={handleResetDemo}
        isFallback={systemStatus?.gemini?.fallback_circuit_breaker_enabled && !systemStatus?.gemini?.configured}
        activeTab={citizenTab}
        onTabChange={setCitizenTab}
      />

      {/* Temporary Toast for Reset Action */}
      {resetMessage && (
        <div className="fixed top-20 right-6 z-50 bg-neutral-950 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl border border-neutral-800 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">{resetMessage}</span>
        </div>
      )}

      {/* Main Container Switch */}
      <main className="flex-1 min-h-0 flex flex-col">
        {activeRole === 'citizen' ? (
          /* Editorial Split-Layout Matching Reference Image */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Grid: Hero (Left) + Interactive Console (Right) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 border-b border-neutral-900">
              {/* Left Column (7 cols): Editorial Typography & Actions */}
              <div className="lg:col-span-6 xl:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-white">
                <div>
                  <div className="flex items-center gap-2 text-neutral-900 font-mono text-sm uppercase tracking-widest font-bold">
                    <span>✦</span>
                    <span>AI-Powered Urban Governance</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-neutral-950 leading-[1.06] mt-6 max-w-xl">
                    Civic issue reporting for modern cities
                  </h1>

                  <p className="text-sm sm:text-base text-neutral-600 mt-6 max-w-lg leading-relaxed font-normal">
                    Report potholes, garbage overflow, or waterlogging in seconds. Snap a photo or speak naturally in <strong>Hindi, Kannada, Hinglish, or English</strong>. Gemini 2.5 extracts landmarks, deduplicates tickets, and dispatches field teams.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-8 sm:mt-10">
                    <button
                      onClick={() => setCitizenTab('report')}
                      className={`px-8 py-3.5 rounded-full text-xs font-black tracking-widest uppercase transition-all shadow-sm active:translate-y-0.5 ${
                        citizenTab === 'report'
                          ? 'bg-black text-white hover:bg-neutral-800'
                          : 'bg-neutral-100 text-neutral-900 border border-neutral-300 hover:border-black'
                      }`}
                    >
                      Report An Issue
                    </button>

                    <button
                      onClick={() => setCitizenTab(citizenTab === 'feed' ? 'report' : 'feed')}
                      className="flex items-center gap-2.5 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase text-neutral-900 hover:text-black border border-neutral-300 hover:border-black transition active:translate-y-0.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[9px]">
                        ▶
                      </div>
                      <span>{citizenTab === 'feed' ? 'Intake Form' : 'Explore Live Map'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t border-neutral-100">
                  <p className="text-xs font-medium text-neutral-600 flex items-center gap-2">
                    <span className="text-rose-600 font-black text-base">*</span>
                    <span>
                      48-hour citizen review guarantee with automated Gemini Before/After verification audit.
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Column (5-6 cols): Interactive Workspace Framed by 1px Vertical Border */}
              <div className="lg:col-span-6 xl:col-span-5 border-t lg:border-t-0 lg:border-l border-neutral-900 bg-neutral-50/70 flex flex-col min-h-0 overflow-y-auto">
                {/* Clean Tab Segment Switcher */}
                <div className="p-3 bg-white border-b border-neutral-200 sticky top-0 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200 text-xs font-bold w-full sm:w-auto">
                    <button
                      onClick={() => setCitizenTab('report')}
                      className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-full transition ${
                        citizenTab === 'report'
                          ? 'bg-neutral-950 text-white shadow-sm'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      1. Snap & Speak
                    </button>

                    <button
                      onClick={() => setCitizenTab('feed')}
                      className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-full transition ${
                        citizenTab === 'feed'
                          ? 'bg-neutral-950 text-white shadow-sm'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      2. Live Map
                    </button>

                    <button
                      onClick={() => setCitizenTab('my-reports')}
                      className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-full transition ${
                        citizenTab === 'my-reports'
                          ? 'bg-neutral-950 text-white shadow-sm'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      3. Audit Log
                    </button>
                  </div>
                </div>

                {/* Workspace Dynamic Content */}
                <div className="flex-1 p-4 sm:p-6">
                  {citizenTab === 'report' && <SnapSpeakForm onReportSubmitted={handleReportSubmitted} />}
                  {citizenTab === 'feed' && <NearbyFeed />}
                  {citizenTab === 'my-reports' && <MyReportsList />}
                </div>
              </div>
            </div>

            {/* Bottom 4-Column Metric Strip Matching Reference Image */}
            <div className="grid grid-cols-2 lg:grid-cols-4 bg-white divide-y lg:divide-y-0 divide-x divide-neutral-900 border-b border-neutral-900 select-none">
              {/* Metric 1 */}
              <div className="p-5 sm:p-6 flex items-center gap-4">
                <div className="flex -space-x-2 overflow-hidden">
                  <span className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-neutral-800 text-white font-bold text-[10px] flex items-center justify-center">
                    KA
                  </span>
                  <span className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-neutral-600 text-white font-bold text-[10px] flex items-center justify-center">
                    DL
                  </span>
                  <span className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-neutral-400 text-white font-bold text-[10px] flex items-center justify-center">
                    MH
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-neutral-950 leading-none">34k+</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                    Verified Resolutions
                  </div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-5 sm:p-6">
                <div className="text-xl sm:text-2xl font-black text-neutral-950 leading-none">18.5h</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                  Avg SLA Closure Time
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-5 sm:p-6">
                <div className="text-xl sm:text-2xl font-black text-neutral-950 leading-none">96.4%</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                  AI Audit Accuracy
                </div>
              </div>

              {/* Metric 4: Agency Logos / Badges */}
              <div className="p-5 sm:p-6 flex items-center justify-around gap-2 text-xs font-mono font-bold uppercase tracking-wider text-neutral-600">
                <span className="hover:text-black transition">BBMP</span>
                <span className="text-neutral-300">•</span>
                <span className="hover:text-black transition">BESCOM</span>
                <span className="text-neutral-300">•</span>
                <span className="hover:text-black transition">BWSSB</span>
                <span className="text-neutral-300">•</span>
                <span className="hover:text-black transition">NHAI</span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop-First Admin Command Center Workspace in Light Theme */
          <div className="w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-neutral-50">
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
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 relative border-b border-neutral-900">
              {isLoadingAdmin && (
                <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center gap-2 text-neutral-900 text-xs font-bold">
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
              <div className="lg:col-span-5 h-full min-h-0 overflow-hidden border-l border-neutral-900 bg-white">
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
