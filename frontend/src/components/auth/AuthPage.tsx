import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  ArrowRight,
  Database,
  Lock,
  Layers,
  FileCheck2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { AuthUser } from '../../types/api';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'admin'>('citizen');
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Form State
  const [email, setEmail] = useState<string>('citizen@bengaluru.in');
  const [password, setPassword] = useState<string>('citizen123');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [wardId, setWardId] = useState<string>('WARD-142');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync demo credentials when switching role
  const handleRoleSelect = (role: 'citizen' | 'admin') => {
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'citizen') {
      setEmail('citizen@bengaluru.in');
      setPassword('citizen123');
      setDepartment('Resident');
      setWardId('WARD-142');
    } else {
      setEmail('admin@bbmp.gov.in');
      setPassword('bbmp2025');
      setDepartment('BBMP Road Infrastructure & Ward Command');
      setWardId('BBMP-CENTRAL');
    }
  };

  // One-click instant demo login
  const handleInstantDemoLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.demoLogin(selectedRole);
      onAuthenticated(response.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit standard form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (authMode === 'signin') {
        const response = await apiClient.login(email, password);
        onAuthenticated(response.user);
      } else {
        const response = await apiClient.register({
          email,
          password,
          role: selectedRole,
          name: name.trim() || (selectedRole === 'admin' ? 'Municipal Officer' : 'Bengaluru Resident'),
          phone: phone.trim() || undefined,
          department: department.trim() || undefined,
          ward_id: wardId.trim() || undefined,
        });
        onAuthenticated(response.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-950 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Editorial Top Identity Header */}
      <header className="h-16 border-b border-neutral-900 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-white z-50 select-none">
        <div className="flex items-center gap-3">
          <span className="font-mono text-base tracking-tight text-neutral-400 font-bold">//</span>
          <div className="flex items-baseline gap-2">
            <span className="font-black text-xl tracking-tight text-neutral-950 font-sans">
              CivicSetu
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 border border-neutral-300 rounded px-1.5 py-0.5">
              Identity & Access Management
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-wider text-neutral-600">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full border border-neutral-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SQLite Database Active</span>
          </div>
          <span className="font-bold text-neutral-900">BBMP • Bengaluru</span>
        </div>
      </header>

      {/* Main Split Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 border-b border-neutral-900">
        {/* Left Column (7 cols): Editorial Role Selection & Intro */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-2 text-neutral-900 font-mono text-xs uppercase tracking-widest font-bold">
              <span>✦</span>
              <span>Role-Based Municipal Access Matrix</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-950 leading-[1.08] mt-6 max-w-xl">
              Authorize your governance portal
            </h1>

            <p className="text-sm sm:text-base text-neutral-600 mt-5 max-w-lg leading-relaxed font-normal">
              Select your authorization role to enter CivicSetu. Public citizens report civic issues with multimodal AI triage, while municipal officers manage SLA work orders and field audits.
            </p>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-xl">
              {/* Option A: Citizen Role */}
              <button
                type="button"
                onClick={() => handleRoleSelect('citizen')}
                className={`p-5 rounded-2xl text-left transition-all border-2 flex flex-col justify-between relative ${
                  selectedRole === 'citizen'
                    ? 'border-neutral-950 bg-neutral-50 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-full bg-neutral-950 text-white flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-full ${
                        selectedRole === 'citizen'
                          ? 'bg-neutral-950 text-white'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      Public Role
                    </span>
                  </div>
                  <h3 className="text-base font-black text-neutral-950">Citizen View</h3>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    Multilingual voice & photo intake, EXIF GPS tagging, nearby feed, and 48-hour resolution audits.
                  </p>
                </div>
                {selectedRole === 'citizen' && (
                  <div className="mt-4 pt-3 border-t border-neutral-300 flex items-center gap-1.5 text-[11px] font-bold text-neutral-900 font-mono">
                    <span>Active Selection</span>
                    <span>✓</span>
                  </div>
                )}
              </button>

              {/* Option B: Admin Role */}
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`p-5 rounded-2xl text-left transition-all border-2 flex flex-col justify-between relative ${
                  selectedRole === 'admin'
                    ? 'border-neutral-950 bg-neutral-50 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-full bg-neutral-950 text-white flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-full ${
                        selectedRole === 'admin'
                          ? 'bg-neutral-950 text-white'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      Municipal Staff
                    </span>
                  </div>
                  <h3 className="text-base font-black text-neutral-950">Municipal Admin</h3>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    BBMP Command Center, SLA heatmaps, GIS hotspot cluster triage, work orders, and AI audit verification.
                  </p>
                </div>
                {selectedRole === 'admin' && (
                  <div className="mt-4 pt-3 border-t border-neutral-300 flex items-center gap-1.5 text-[11px] font-bold text-neutral-900 font-mono">
                    <span>Active Selection</span>
                    <span>✓</span>
                  </div>
                )}
              </button>
            </div>

            {/* Instant Demo Access Button */}
            <div className="mt-8 max-w-xl">
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                disabled={loading}
                className="w-full bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition px-8 py-4 rounded-full text-xs font-black tracking-widest uppercase flex items-center justify-center gap-3 shadow-sm active:translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {selectedRole === 'citizen'
                        ? 'Quick Authorize as Citizen (Aarav Sharma)'
                        : 'Quick Authorize as BBMP Admin (Ramesh Kumar)'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="mt-8 pt-4 border-t border-neutral-100 max-w-xl">
            <p className="text-xs font-medium text-neutral-600 flex items-center gap-2">
              <span className="text-rose-600 font-black text-base">*</span>
              <span>
                Pre-configured demo accounts linked to the lightweight SQLite database and Bengaluru Ward 142 live data.
              </span>
            </p>
          </div>
        </div>

        {/* Right Column (5 cols): Credential Authorization Box */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-neutral-900 bg-neutral-50/60 p-8 sm:p-12 flex flex-col justify-center">
          <div className="bg-white border border-neutral-900 rounded-3xl p-6 sm:p-8 shadow-sm">
            {/* Mode Switch: Sign In vs Register */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-neutral-950 tracking-tight">
                  {authMode === 'signin' ? 'Sign In With Credentials' : 'Create New Account'}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Authorizing as: <span className="font-bold text-neutral-900 capitalize">{selectedRole}</span>
                </p>
              </div>

              <div className="flex bg-neutral-100 p-1 rounded-full border border-neutral-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`px-3 py-1 rounded-full transition ${
                    authMode === 'signin' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`px-3 py-1 rounded-full transition ${
                    authMode === 'register' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={selectedRole === 'admin' ? 'e.g. Ramesh Kumar' : 'e.g. Aarav Sharma'}
                      className="w-full text-xs font-sans border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full text-xs font-sans border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                    />
                  </div>

                  {selectedRole === 'admin' && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. BBMP Road Infrastructure"
                        className="w-full text-xs font-sans border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin@bbmp.gov.in' : 'citizen@bengaluru.in'}
                  className="w-full text-xs font-sans border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs font-sans border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition px-6 py-3.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm active:translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {authMode === 'signin' ? `Sign In as ${selectedRole}` : `Create ${selectedRole} Account`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Helper Credentials */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <div className="text-[11px] font-mono text-neutral-600 space-y-1">
                <span className="font-bold text-neutral-900 block">Pre-Seeded Credentials:</span>
                {selectedRole === 'citizen' ? (
                  <p>Email: <code className="bg-neutral-100 px-1 py-0.5 rounded">citizen@bengaluru.in</code> / Password: <code className="bg-neutral-100 px-1 py-0.5 rounded">citizen123</code></p>
                ) : (
                  <p>Email: <code className="bg-neutral-100 px-1 py-0.5 rounded">admin@bbmp.gov.in</code> / Password: <code className="bg-neutral-100 px-1 py-0.5 rounded">bbmp2025</code></p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4-Column Feature Strip Matching Reference Image */}
      <footer className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-neutral-900 border-b border-neutral-900 text-xs font-mono uppercase bg-white select-none">
        <div className="p-5 flex items-center gap-3">
          <Database className="w-4 h-4 text-neutral-800 shrink-0" />
          <div>
            <span className="font-black text-neutral-950 block">SQLite Database</span>
            <span className="text-[10px] text-neutral-500 normal-case">Lightweight zero-dep local ACID store</span>
          </div>
        </div>

        <div className="p-5 flex items-center gap-3">
          <Lock className="w-4 h-4 text-neutral-800 shrink-0" />
          <div>
            <span className="font-black text-neutral-950 block">JWT Authentication</span>
            <span className="text-[10px] text-neutral-500 normal-case">RFC 7519 HMAC-SHA256 sessions</span>
          </div>
        </div>

        <div className="p-5 flex items-center gap-3">
          <Layers className="w-4 h-4 text-neutral-800 shrink-0" />
          <div>
            <span className="font-black text-neutral-950 block">Role Guardrails</span>
            <span className="text-[10px] text-neutral-500 normal-case">Strict Citizen vs Municipal Admin triage</span>
          </div>
        </div>

        <div className="p-5 flex items-center gap-3">
          <FileCheck2 className="w-4 h-4 text-neutral-800 shrink-0" />
          <div>
            <span className="font-black text-neutral-950 block">Media Asset Store</span>
            <span className="text-[10px] text-neutral-500 normal-case">Photos, voice notes & audit records</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
