import React, { useState } from 'react';
import {
  UserCheck,
  Building2,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { AuthUser } from '../../types/api';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
  onClose?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'admin'>('citizen');
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Form State
  const [email, setEmail] = useState<string>('citizen@bengaluru.in');
  const [password, setPassword] = useState<string>('citizen123');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [department, setDepartment] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Switch roles and prefill demo accounts
  const handleRoleSelect = (role: 'citizen' | 'admin') => {
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'citizen') {
      setEmail('citizen@bengaluru.in');
      setPassword('citizen123');
      setDepartment('Resident');
    } else {
      setEmail('admin@bbmp.gov.in');
      setPassword('bbmp2025');
      setDepartment('BBMP Road Infrastructure');
    }
  };

  // One-click instant login
  const handleInstantDemoLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.demoLogin(selectedRole);
      onAuthenticated(response.user);
      if (onClose) onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit credentials form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (authMode === 'signin') {
        const response = await apiClient.login(email, password);
        onAuthenticated(response.user);
        if (onClose) onClose();
      } else {
        const response = await apiClient.register({
          email,
          password,
          role: selectedRole,
          name: name.trim() || (selectedRole === 'admin' ? 'Municipal Officer' : 'Bengaluru Resident'),
          phone: phone.trim() || undefined,
          department: department.trim() || undefined,
        });
        onAuthenticated(response.user);
        if (onClose) onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-neutral-400 hover:text-black p-1.5 rounded-full hover:bg-neutral-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Clean Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-neutral-900 font-mono text-xs uppercase tracking-widest font-bold mb-2">
            <span>✦</span>
            <span>CivicSetu Authorization</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Select Your Role
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            Choose whether you are reporting issues as a citizen or logging in as municipal staff.
          </p>
        </div>

        {/* Top-to-Bottom Role Selection Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleRoleSelect('citizen')}
            className={`p-4 rounded-2xl text-left transition border-2 flex flex-col justify-between ${
              selectedRole === 'citizen'
                ? 'border-neutral-950 bg-neutral-50 shadow-sm'
                : 'border-neutral-200 bg-white hover:border-neutral-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center mb-2">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-neutral-950 block">Citizen</span>
              <span className="text-[10px] text-neutral-500 leading-tight block mt-0.5">
                Report civic issues & track repairs
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('admin')}
            className={`p-4 rounded-2xl text-left transition border-2 flex flex-col justify-between ${
              selectedRole === 'admin'
                ? 'border-neutral-950 bg-neutral-50 shadow-sm'
                : 'border-neutral-200 bg-white hover:border-neutral-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center mb-2">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-neutral-950 block">Municipal Staff</span>
              <span className="text-[10px] text-neutral-500 leading-tight block mt-0.5">
                BBMP Command & work orders
              </span>
            </div>
          </button>
        </div>

        {/* One-Click Quick Login Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleInstantDemoLogin}
            disabled={loading}
            className="w-full bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition px-6 py-3.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm active:translate-y-0.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {selectedRole === 'citizen'
                    ? 'Continue as Citizen (Aarav Sharma)'
                    : 'Continue as BBMP Officer (Ramesh Kumar)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-mono uppercase text-neutral-500">
            or use credentials
          </span>
          <div className="border-t border-neutral-200 w-full" />
        </div>

        {/* Sign In vs Register Toggle */}
        <div className="flex bg-neutral-100 p-1 rounded-full border border-neutral-200 text-xs font-bold mb-5">
          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`flex-1 py-1.5 rounded-full transition ${
              authMode === 'signin' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-1.5 rounded-full transition ${
              authMode === 'register' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-800 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'e.g. Ramesh Kumar' : 'e.g. Aarav Sharma'}
                  className="w-full text-xs border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-800 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full text-xs border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-800 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={selectedRole === 'admin' ? 'admin@bbmp.gov.in' : 'citizen@bengaluru.in'}
              className="w-full text-xs border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-800 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs border border-neutral-300 focus:border-neutral-950 focus:ring-0 rounded-xl px-3.5 py-2.5 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm active:translate-y-0.5"
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

        {/* Demo Credentials Hint */}
        <div className="mt-5 pt-3 border-t border-neutral-200 text-[11px] font-mono text-neutral-500 text-center">
          Default demo password: <code className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded font-bold">{selectedRole === 'citizen' ? 'citizen123' : 'bbmp2025'}</code>
        </div>
      </div>
    </div>
  );
};
