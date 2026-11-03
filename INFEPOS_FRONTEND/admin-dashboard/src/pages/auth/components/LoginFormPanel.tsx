import React from 'react';
import { Building2, Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

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
  onOpenSubscribe?: () => void;
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
  onOpenSubscribe,
  className = '',
}) => {
  return (
    <div className={`bg-white p-5 sm:p-7 lg:p-8 flex flex-col justify-between font-sans ${className}`}>
      <div>
        {/* Top Header Row: Pill badge on left, version indicator on right */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-[11px] font-semibold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Admin Portal</span>
          </div>

          <span className="text-[11px] font-medium text-slate-400 tracking-wide select-none">
            INFEPOS v1.0
          </span>
        </div>

        {/* Welcome Back Heading & Subtitle */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans">
            Welcome Back
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-normal">
            Log in to access your store till and INFEPOS terminal.
          </p>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Interactive Form */}
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-3.5">
          {/* Tenant Code */}
          <div>
            <label
              htmlFor="tenantCode"
              className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5"
            >
              Store or Tenant Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                id="tenantCode"
                name="tenantCode"
                type="text"
                required
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="e.g. STORE-01 or INFYNUX"
                autoComplete="organization"
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-xs sm:text-sm font-normal rounded-xl pl-9 pr-3.5 py-2.5 sm:py-3 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-xs sm:text-sm font-normal rounded-xl pl-9 pr-3.5 py-2.5 sm:py-3 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                className="w-full bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white text-slate-800 text-xs sm:text-sm font-normal rounded-xl pl-9 pr-10 py-2.5 sm:py-3 border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-1 sm:pt-1.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1366F9] hover:bg-[#0e58db] active:bg-[#0b4ec2] text-white font-semibold text-xs sm:text-sm py-2.5 sm:py-3 px-5 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer group"
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

        {/* Subscribe / Choose Plan Link (clean, compact, no giant black button, no sparkle icon) */}
        {onOpenSubscribe && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center flex-wrap">
            <span className="text-xs text-slate-500 font-normal">
              Don't have a store account?
            </span>
            <button
              type="button"
              onClick={onOpenSubscribe}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Choose Plan & Activate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Subtle Security Badge */}
      <div className="flex items-center justify-center pt-2 text-[11px] text-slate-400 gap-1.5 font-medium select-none">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>256-bit Encrypted Secure Session</span>
      </div>
    </div>
  );
};

export default LoginFormPanel;
