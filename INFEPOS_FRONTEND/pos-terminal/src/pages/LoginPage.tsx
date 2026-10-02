import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { login } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    storeCode: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeCode || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login(form);
      setAuth(result.user, result.permissions, result.tokens.accessToken, result.tokens.refreshToken);
      navigate('/open-shift', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Login failed. Check your credentials and try again.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pos-bg)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(34,197,94,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            }}
          >
            <Monitor size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--pos-text)', letterSpacing: '-0.02em' }}>
            INFYPOS
          </h1>
          <p style={{ color: 'var(--pos-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Point of Sale Terminal
          </p>
        </div>

        {/* Card */}
        <div
          className="pos-card"
          style={{
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--pos-text)' }}>
            Cashier Sign In
          </h2>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                background: 'var(--pos-danger-light)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: '#fca5a5',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tenant Code */}
            <div>
              <label
                htmlFor="storeCode"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Store Code
              </label>
              <input
                id="storeCode"
                name="storeCode"
                type="text"
                className="pos-input"
                placeholder="Enter your store code"
                value={form.storeCode}
                onChange={handleChange}
                autoComplete="organization"
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="pos-input"
                placeholder="cashier@store.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pos-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--pos-text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="btn-pos-login"
              type="submit"
              className="btn-pos btn-primary"
              disabled={loading}
              style={{ marginTop: '0.5rem', padding: '0.9rem', fontSize: '1rem' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--pos-text-dim)', fontSize: '0.78rem', marginTop: '1.5rem' }}>
          INFYPOS POS Terminal · Secure Login
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
