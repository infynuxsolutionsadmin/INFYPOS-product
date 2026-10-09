import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { login } from '../../api/auth.api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email: email.trim(), password, tenantCode: tenantCode.trim() });
      setAuth(response.user, response.permissions, response.tokens.accessToken, response.tokens.refreshToken);
      if (response.user.roleCode === 'SUPER_ADMIN') {
        navigate('/master-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1020px] bg-[#0c1226]/90 p-3 sm:p-4 rounded-[36px] border-2 border-blue-900/40 shadow-[0_35px_90px_rgba(0,0,0,0.85)] relative z-10 my-auto backdrop-blur-xl">
      
      {/* Outer Framed Container Card */}
      <div className="bg-white rounded-[28px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl border border-slate-200">
        
        {/* Left Column: Official INFEPOS Brand Showcase Panel */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#090e20] via-[#060918] to-[#040612] p-8 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[480px] lg:min-h-[560px]">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

          {/* Top Pill Badge */}
          <div className="relative z-10 self-start">
            <span className="text-[10px] font-bold tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 uppercase">
              ENTERPRISE POS PLATFORM
            </span>
          </div>

          {/* Center Brand Showcase: Logo & Product Statement */}
          <div className="relative z-10 my-auto flex flex-col items-center max-w-xs">
            
            {/* Logo Image / Symbol Banner */}
            <div className="mb-6 p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-3 transform hover:scale-105 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="INFEPOS Logo"
                className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                onError={(e) => {
                  // Fallback styled logo text if image not found
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              
              {/* Text Logo Styling */}
              <div className="flex items-center text-3xl font-display font-light tracking-[0.15em] text-white">
                <span className="text-white font-thin">INF</span>
                <span className="text-blue-500 font-normal">E</span>
                <span className="text-blue-400 font-extralight">POS</span>
              </div>
            </div>

            {/* Simple Product Statement */}
            <p className="text-sm text-slate-300 font-display font-light tracking-wide leading-relaxed">
              All-in-one POS & Store Management solution empowering modern retail and multi-store business operations.
            </p>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 w-full pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono font-medium text-slate-400">
            <span className="text-slate-300">
              Real-time Stock Sync
            </span>
            <span>Cloud Enabled</span>
          </div>

        </div>

        {/* Right Column: Minimalist Glassmorphic Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            
            {/* Top Security Lock Badge */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-3xl sm:text-4xl font-display font-extralight text-slate-900 tracking-[0.1em] uppercase">
                Welcome Back
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
                Log in to access your store till and INFEPOS terminal.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center shadow-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Tenant Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SYNC-TEST or infynux"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm font-medium rounded-2xl px-4 py-3.5 outline-none border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all duration-200 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm font-medium rounded-2xl px-4 py-3.5 outline-none border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all duration-200 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm font-medium rounded-2xl px-4 py-3.5 outline-none border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all duration-200 placeholder:text-slate-400 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button: Premium Shining Grey Glass Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-display font-semibold text-sm tracking-wide rounded-2xl py-3.5 px-6 border border-white/25 hover:border-white/40 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_30px_-6px_rgba(15,23,42,0.7)] backdrop-blur-md transition-all duration-300 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  {/* Glossy Light Sweep Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="relative z-10">Authenticating...</span>
                    </>
                  ) : (
                    <span className="relative z-10 font-display font-bold uppercase tracking-wider text-xs">Login</span>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Encrypted Store Admin Portal
              </span>
              <span>INFEPOS v1.0</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
