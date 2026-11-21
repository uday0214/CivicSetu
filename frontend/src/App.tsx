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
  ReportSubmissionResponse,
  MasterIncident,
  KpiSummaryResponse,
  SystemicBriefingResponse,
  AuthUser,
} from './types/api';
import { CheckCircle2, Loader2, Camera, MapPin, ClipboardList } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => apiClient.getStoredUser());
  const [activeRole, setActiveRole] = useState<'citizen' | 'admin'>('citizen');
  const [citizenTab, setCitizenTab] = useState<'report' | 'feed' | 'my-reports'>('report');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Admin Portal State
  const [adminIncidents, setAdminIncidents] = useState<MasterIncident[]>([]);
  const [adminKpi, setAdminKpi] = useState<KpiSummaryResponse | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<MasterIncident | null>(null);
  const [briefing, setBriefing] = useState<SystemicBriefingResponse | null>(null);
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);

  // Validate stored session on mount
  useEffect(() => {
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

  const handleRoleChange = (newRole: 'citizen' | 'admin') => {
    if (newRole === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
      // Prompt admin login if trying to access admin portal without admin credentials
      setIsAuthModalOpen(true);
      return;
    }
    setActiveRole(newRole);
  };

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    apiClient.logout();
    setCurrentUser(null);
    setActiveRole('citizen');
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
      setResetMessage('City demo incidents reset to defaults.');
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const handleReportSubmitted = (_result: ReportSubmissionResponse) => {
    // Keep citizen on report page so they can view the assigned office details card
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-950 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Top Navigation Bar */}
      <TopNav
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onResetDemo={handleResetDemo}
        activeTab={citizenTab}
        onTabChange={setCitizenTab}
      />

      {/* Temporary Toast Notification for Demo Reset */}
      {resetMessage && (
        <div className="fixed top-20 right-6 z-50 bg-neutral-950 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl border border-neutral-800 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">{resetMessage}</span>
        </div>
      )}

      {/* Main Content Area - Strictly Top to Bottom Flow */}
      <main className="flex-1 flex flex-col min-h-0">
        {activeRole === 'citizen' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Centered Editorial Header Section */}
            <div className="border-b border-neutral-900 bg-white py-10 sm:py-14 px-6 text-center">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 text-neutral-900 font-mono text-xs uppercase tracking-widest font-bold bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full">
                  <span>✦</span>
                  <span>Karnataka • Telangana • Andhra Pradesh • Tamil Nadu</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950 leading-[1.1]">
                  Civic issue reporting across South India
                </h1>

                <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed">
                  Report potholes, overflowing sewage, or broken streetlights in seconds. Snap a photo or speak naturally in <strong>Kannada, Telugu, Tamil, Hindi, or English</strong>. Verified tickets are routed directly to your nearest municipal authority.
                </p>

                {/* Centered Flow Tab Switcher */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setCitizenTab('report')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                      citizenTab === 'report'
                        ? 'bg-neutral-950 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200 border border-neutral-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Report An Issue</span>
                  </button>

                  <button
                    onClick={() => setCitizenTab('feed')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                      citizenTab === 'feed'
                        ? 'bg-neutral-950 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200 border border-neutral-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Live City Map</span>
                  </button>

                  <button
                    onClick={() => setCitizenTab('my-reports')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                      citizenTab === 'my-reports'
                        ? 'bg-neutral-950 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200 border border-neutral-200'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Track Reports</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Centered Details Pane - Flowing Strictly Top-to-Bottom */}
            <div className="flex-1 bg-neutral-50/70 py-8 sm:py-12 px-4 sm:px-6">
              <div className="max-w-2xl sm:max-w-3xl mx-auto">
                {citizenTab === 'report' && (
                  <SnapSpeakForm onReportSubmitted={handleReportSubmitted} />
                )}

                {citizenTab === 'feed' && (
                  <NearbyFeed />
                )}

                {citizenTab === 'my-reports' && (
                  <MyReportsList />
                )}
              </div>
            </div>

            {/* 4-Column Metric Strip (User-Friendly, Clean Civic Terms) */}
            <footer className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-neutral-900 border-t border-b border-neutral-900 text-xs font-mono uppercase bg-white select-none">
              <div className="p-5 flex items-center gap-3">
                <span className="font-mono text-xl text-neutral-400 font-bold">01</span>
                <div>
                  <span className="font-black text-neutral-950 block">4 States Covered</span>
                  <span className="text-[10px] text-neutral-500 normal-case">KA • TG • AP • TN municipal corporations</span>
                </div>
              </div>

              <div className="p-5 flex items-center gap-3">
                <span className="font-mono text-xl text-neutral-400 font-bold">02</span>
                <div>
                  <span className="font-black text-neutral-950 block">GPS Office Mapping</span>
                  <span className="text-[10px] text-neutral-500 normal-case">Instant closest governing authority dispatch</span>
                </div>
              </div>

              <div className="p-5 flex items-center gap-3">
                <span className="font-mono text-xl text-neutral-400 font-bold">03</span>
                <div>
                  <span className="font-black text-neutral-950 block">Multilingual</span>
                  <span className="text-[10px] text-neutral-500 normal-case">Kannada, Telugu, Tamil, Hindi & English</span>
                </div>
              </div>

              <div className="p-5 flex items-center gap-3">
                <span className="font-mono text-xl text-neutral-400 font-bold">04</span>
                <div>
                  <span className="font-black text-neutral-950 block">Verified Repairs</span>
                  <span className="text-[10px] text-neutral-500 normal-case">Visual photo audit before closure</span>
                </div>
              </div>
            </footer>
          </div>
        ) : (
          /* Municipal Admin Command Center Workspace */
          <div className="w-full flex-1 flex flex-col bg-neutral-50">
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

            {/* Admin Command Workspace */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[600px] relative border-b border-neutral-900">
              {isLoadingAdmin && (
                <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center gap-2 text-neutral-900 text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading Municipal Command Data...</span>
                </div>
              )}

              {/* GIS Command Map */}
              <div className="lg:col-span-7 h-[450px] lg:h-auto relative">
                <CommandMap
                  incidents={adminIncidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                />
              </div>

              {/* Ticket Queue */}
              <div className="lg:col-span-5 h-[500px] lg:h-auto min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-l border-neutral-900 bg-white">
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

      {/* Authorization Modal (Kept "on the side", opened via Log In or Portal Switch) */}
      {isAuthModalOpen && (
        <AuthPage
          onAuthenticated={handleAuthenticated}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
