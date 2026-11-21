import React, { useState } from 'react';
import { ShieldAlert, X, Eye, EyeOff, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import client from '../../api/client';

interface ManagerReauthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManagerReauthModal: React.FC<ManagerReauthModalProps> = ({ onClose, onSuccess }) => {
  const { pairedTenantCode, pairedStoreId, reauthorizeDevice } = useAuthStore();

  const [tenantCode, setTenantCode] = useState(pairedTenantCode || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter manager email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Direct call to /auth/login using fresh axios to bypass token interceptor
      const payload: any = {
        email: email.trim(),
        password,
      };

      if (tenantCode.trim()) {
        payload.tenantCode = tenantCode.trim();
      }

      const res = await client.post('/auth/login', payload);
      const data = res.data?.data || res.data;
      const accessToken = data?.accessToken;
      const refreshToken = data?.refreshToken;
      const user = data?.user;

      if (!accessToken || !refreshToken) {
        throw new Error('Authentication succeeded but tokens were not returned.');
      }

      // Check that the user is actually a manager/admin or authorized staff
      const roleCode = user?.role?.code || user?.roleCode || '';
      if (roleCode === 'CASHIER') {
        throw new Error('Cashier accounts cannot re-authorize terminal device pairing. Please use a Manager or Admin account.');
      }

      // Optional check for store alignment
      if (pairedStoreId && user?.storeId && user.storeId !== pairedStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN') {
        throw new Error('The authorizing manager must belong to this specific retail store.');
      }

      // Store tokens and notify system
      reauthorizeDevice(accessToken, refreshToken);
      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Manager re-authorization failed:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Re-authorization failed. Please check manager credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          color: '#1E293B',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          maxWidth: 440,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #FEF08A',
            background: '#FEFCE8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#FEF08A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                Manager Re-Authorization
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>
                Cloud Synchronization Paused
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 8,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '0.82rem',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#1E3A8A' }}>Zero Downtime Guarantee:</strong> Your active shift and pending offline transactions are completely safe. Enter Manager credentials to re-link this terminal and resume cloud sync.
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '0.82rem',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#166534',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} color="#16a34a" />
              Re-authorization successful! Resuming cloud sync...
            </div>
          )}

          {!pairedTenantCode && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: 6, fontWeight: 600 }}>
                Store / Tenant Code
              </label>
              <input
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="e.g. INFYPOS"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: 6, fontWeight: 600 }}>
              Manager Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@store.com"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: 6, fontWeight: 600 }}>
              Manager Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  borderRadius: 8,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Work Offline
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={{
                flex: 1.5,
                padding: '0.75rem',
                borderRadius: 8,
                border: 'none',
                background: success ? '#16A34A' : '#2563EB',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading || success ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Authorizing...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={16} /> Authorized
                </>
              ) : (
                <>
                  <Lock size={15} /> Re-authorize Terminal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagerReauthModal;
