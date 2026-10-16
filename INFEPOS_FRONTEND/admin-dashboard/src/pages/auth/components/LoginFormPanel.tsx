import React from 'react';
import { Building2, Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginFormPanelProps {
  tenantCode: string;
  setTenantCode: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export const LoginFormPanel: React.FC<LoginFormPanelProps> = ({
  tenantCode,
  setTenantCode,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  className = '',
}) => {
  return (
    <div className={`bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between font-sans ${className}`}>
      <div>
        {/* Top Header Row: Pill badge on left, version indicator on right */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Admin Portal</span>
          </div>

          <span className="text-xs font-medium text-slate-400 tracking-wide select-none">
            INFEPOS v1.0
          </span>
        </div>

        {/* Welcome Back Heading & Subtitle */}
        <div className="mb-7 sm:mb-8">
          <h1 className="text-3xl sm:text-[34px] font-bold text-slate-900 tracking-tight font-sans">
            Welcome Back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-normal">
            Log in to access your store till and INFEPOS terminal.
          </p>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Interactive Form */}
        <form onSubmit={onSubmit} className="space-y-4.5 sm:space-y-5">
          {/* Tenant Code */}
          <div>
            <label
              htmlFor="tenantCode"
              className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-0.5"
            >
              Tenant Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                id="tenantCode"
                name="tenantCode"
                type="text"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="e.g. SYNC-TEST or infynux"
                autoComplete="organization"
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-sm font-normal rounded-xl pl-10 pr-4 py-3.5 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-0.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-sm font-normal rounded-xl pl-10 pr-4 py-3.5 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-0.5"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-sm font-normal rounded-xl pl-10 pr-11 py-3.5 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button: Vibrant royal blue button */}
          <div className="pt-2 sm:pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1366F9] hover:bg-[#0e58db] active:bg-[#0b4ec2] text-white font-semibold text-sm sm:text-base py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span>Login</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Subtle Divider with "Secure Access" badge */}
      <div className="relative flex items-center justify-center mt-8 sm:mt-10 pt-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80" />
        </div>
        <div className="relative bg-white px-4 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Secure Access</span>
        </div>
      </div>
    </div>
  );
};

export default LoginFormPanel;
