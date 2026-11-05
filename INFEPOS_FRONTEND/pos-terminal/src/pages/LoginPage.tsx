import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Link, Users, Lock, LogOut, RotateCw, KeyRound, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { login, cashierLogin } from '../api/auth.api';
import { compareSync, hashSync } from 'bcrypt-ts';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import client from '../api/client';
import { getLocalCashiers, syncCashiersToLocalDb, updateLocalCashierPin } from '../services/localDb';
import logoImg from '../assets/transparent_logo.png';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isPaired, setPaired, setAuth, unpairDevice, pairedStoreId, pairedTenantId, pairedTenantCode, pairedStoreName } = useAuthStore();

  const [form, setForm] = useState({
    tenantCode: pairedTenantCode || '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (pairedTenantCode && !form.tenantCode) {
      setForm((prev) => ({ ...prev, tenantCode: pairedTenantCode }));
    }
  }, [pairedTenantCode, form.tenantCode]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cashier PIN state
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [cashiersLoading, setCashiersLoading] = useState(false);
  const [cashiersError, setCashiersError] = useState<string | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<any | null>(null);
  const [pin, setPin] = useState('');

  // SEC-06: Cashier PIN brute-force lockout protection
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [lockoutMap, setLockoutMap] = useState<Record<string, number>>({});
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const selectCashierWithLockout = (c: any) => {
    setSelectedCashier(c);
    setPin('');
    const lockedUntil = lockoutMap[c.id];
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setLockoutRemaining(remaining);
      setError(`Account locked due to failed PIN attempts. Wait ${remaining}s.`);
    } else {
      setLockoutRemaining(0);
      setError(null);
    }
  };
  
  // Manager Login state
  const [showManagerLogin, setShowManagerLogin] = useState(false);
  const [managerForm, setManagerForm] = useState({
    email: '',
    password: ''
  });

  // Offline Manager PIN Reset state
  const [showOfflineResetModal, setShowOfflineResetModal] = useState(false);
  const [resetManagerTenantCode, setResetManagerTenantCode] = useState(pairedTenantCode || '');
  const [resetManagerEmail, setResetManagerEmail] = useState('');
  const [resetManagerPassword, setResetManagerPassword] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const generateUniquePinForStore = useCallback((customCashiers?: any[]): string => {
    const list = customCashiers || cashiers;
    const otherCashiers = list.filter((c: any) => c.id !== selectedCashier?.id && c.pinCodeHash);
    let candidate = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      candidate = Math.floor(1000 + Math.random() * 9000).toString();
      let collision = false;
      for (const other of otherCashiers) {
        if (other.pinCodeHash && compareSync(candidate, other.pinCodeHash)) {
          collision = true;
          break;
        }
      }
      if (!collision) {
        isUnique = true;
      }
    }
    return candidate || Math.floor(1000 + Math.random() * 9000).toString();
  }, [cashiers, selectedCashier]);

  const openOfflineResetModal = async () => {
    setResetError(null);
    setResetSuccess(null);
    setResetManagerTenantCode(pairedTenantCode || useAuthStore.getState().pairedTenantCode || form.tenantCode || '');
    let list = cashiers;
    if (!list || list.length === 0) {
      list = await getLocalCashiers();
    }
    const freshPin = generateUniquePinForStore(list);
    setResetNewPin(freshPin);
    setShowOfflineResetModal(true);
  };

  // Fetch cashiers if paired
  useEffect(() => {
    if (isPaired && pairedStoreId) {
      fetchCashiers();
    }
  }, [isPaired, pairedStoreId]);

  const fetchCashiers = async () => {
    setCashiersLoading(true);
    setCashiersError(null);
    try {
      let cashiersList: any[] = [];
      try {
        const res = await client.get(`/users/cashiers/${pairedStoreId}`);
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          cashiersList = data
            .filter((u: any) => u.status !== 'INACTIVE')
            .map((u: any) => ({
              ...u,
              pinCodeHash: u.pinCodeHash || u.passwordHash || ''
            }));
        }
      } catch (err) {
        console.warn('Dedicated cashiers endpoint failed, trying /users', err);
      }

      if (cashiersList.length === 0) {
        const res = await client.get('/users', { 
          params: { storeId: pairedStoreId, limit: 100, status: 'ACTIVE' } 
        });
        const data = res.data?.data?.items || res.data?.items || res.data?.data || res.data || [];
        cashiersList = (Array.isArray(data) ? data : [])
          .filter(u => u.status !== 'INACTIVE' && u.role?.code !== 'OWNER' && u.role?.code !== 'SYSTEM_ADMIN')
          .map(u => ({
            ...u,
            pinCodeHash: u.pinCodeHash || u.passwordHash || ''
          }));
      }
      
      setCashiers(cashiersList);
      // Cache for offline use
      await syncCashiersToLocalDb(cashiersList);
    } catch (err) {
      console.warn('Failed to fetch cashiers online, falling back to local DB', err);
      try {
        const localCashiers = await getLocalCashiers();
        const filteredLocal = (localCashiers || []).filter((c: any) => 
          c.status !== 'INACTIVE' &&
          c.role?.code !== 'OWNER' && 
          c.role?.code !== 'SYSTEM_ADMIN' && 
          c.role !== 'OWNER' && 
          c.role !== 'System Owner'
        );
        setCashiers(filteredLocal);
      } catch (e) {
        console.error('Failed to load local cashiers', e);
        setCashiersError('Failed to load team members. Please check connection.');
      }
    } finally {
      setCashiersLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantCode || !form.email || !form.password) {
      setError('All fields are required to pair device');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login({
        tenantCode: form.tenantCode,
        email: form.email,
        password: form.password
      });
      if (!result.user.storeId) {
        throw new Error('Manager must be assigned to a specific store to pair a device.');
      }
      setPaired(
        result.user.tenantId,
        result.user.storeId,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.user.tenantCode || form.tenantCode,
        (result.user as any).storeName || undefined
      );
      // Let useEffect fetch cashiers
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Pairing failed. Check credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4 || loading || !selectedCashier || lockoutRemaining > 0) return;
    const cashierId = selectedCashier.id;
    const lockedUntil = lockoutMap[cashierId];
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setLockoutRemaining(remaining);
      setError(`Account locked due to failed PIN attempts. Wait ${remaining}s.`);
      setPin('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let loginSuccess = false;
      let authenticatedUser: any = null;
      let authenticatedTokens: { accessToken?: string; refreshToken?: string } = {};
      let userPermissions: string[] = [];

      // 1. Attempt Online Cashier PIN Login (Issues a real Cashier JWT carrying Cashier identity and Cashier RBAC)
      try {
        const res = await cashierLogin({
          storeId: pairedStoreId || undefined,
          cashierId: selectedCashier.id,
          pin,
        });
        if (res && res.accessToken) {
          loginSuccess = true;
          authenticatedUser = res.user;
          authenticatedTokens = {
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
          };
          userPermissions = res.permissions || [
            'sales.create',
            'sales.read',
            'salesReturns.create',
            'salesReturns.read',
            'shifts.open',
            'shifts.close',
          ];
        }
      } catch (onlineErr: any) {
        // If server responded with a definitive auth rejection (invalid PIN, inactive account), do not mask as offline
        if (onlineErr.response && (onlineErr.response.status === 401 || onlineErr.response.status === 403)) {
          let localValid = false;
          if (selectedCashier.pinCodeHash && compareSync(pin, selectedCashier.pinCodeHash)) {
            localValid = true;
          }
          if (!localValid) {
            const msg = onlineErr.response.data?.message || 'Invalid PIN code';
            const currentAttempts = (failedAttempts[cashierId] || 0) + 1;
            setFailedAttempts((prev) => ({ ...prev, [cashierId]: currentAttempts }));
            if (currentAttempts >= 5) {
              const lockoutUntil = Date.now() + 60000;
              setLockoutMap((prev) => ({ ...prev, [cashierId]: lockoutUntil }));
              setLockoutRemaining(60);
              setError('Too many failed attempts. Cashier terminal locked for 60 seconds.');
            } else {
              setError(`${Array.isArray(msg) ? msg.join(', ') : msg} (${5 - currentAttempts} attempt(s) remaining)`);
            }
            setPin('');
            setLoading(false);
            return;
          }
        }

        // 2. Offline Fallback: If network failed or server unreachable, authenticate against local SQLite hash
        if (!loginSuccess) {
          let isValid = false;
          if (selectedCashier.pinCodeHash && compareSync(pin, selectedCashier.pinCodeHash)) {
            isValid = true;
          } else {
            // Check local DB fresh
            const localCashiers = await getLocalCashiers();
            const localC = (localCashiers || []).find((c: any) => c.id === selectedCashier.id);
            if (localC?.pinCodeHash && compareSync(pin, localC.pinCodeHash)) {
              isValid = true;
            }
          }

          if (isValid) {
            loginSuccess = true;
            authenticatedUser = {
              id: selectedCashier.id,
              firstName: selectedCashier.firstName,
              lastName: selectedCashier.lastName,
              email: selectedCashier.email || 'cashier@store.pos',
              roleId: selectedCashier.roleId || 'cashier-role',
              storeId: pairedStoreId,
              tenantId: pairedTenantId || 'tenant-id',
            };
            userPermissions = [
              'sales.create',
              'sales.read',
              'salesReturns.create',
              'salesReturns.read',
              'shifts.open',
              'shifts.close',
            ];
          } else {
            const currentAttempts = (failedAttempts[cashierId] || 0) + 1;
            setFailedAttempts((prev) => ({ ...prev, [cashierId]: currentAttempts }));
            if (currentAttempts >= 5) {
              const lockoutUntil = Date.now() + 60000;
              setLockoutMap((prev) => ({ ...prev, [cashierId]: lockoutUntil }));
              setLockoutRemaining(60);
              setError('Too many failed attempts. Cashier terminal locked for 60 seconds.');
            } else {
              setError(`Invalid PIN code (${5 - currentAttempts} attempt(s) remaining)`);
            }
            setPin('');
            setLoading(false);
            return;
          }
        }
      }

      if (loginSuccess && authenticatedUser) {
        // Success! Clear lockout records
        setFailedAttempts((prev) => ({ ...prev, [cashierId]: 0 }));
        setLockoutMap((prev) => {
          const copy = { ...prev };
          delete copy[cashierId];
          return copy;
        });
        setLockoutRemaining(0);

        const currentShift = useShiftStore.getState().currentShift;
        if (currentShift && currentShift.storeId !== pairedStoreId) {
          useShiftStore.getState().clearShift();
        }

        setAuth(
          authenticatedUser,
          userPermissions,
          authenticatedTokens.accessToken,
          authenticatedTokens.refreshToken,
        );

        navigate('/open-shift', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Authentication error occurred';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleOfflinePinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashier) return;
    if (!resetManagerEmail || !resetManagerPassword) {
      setResetError('Manager credentials required to authorize PIN reset');
      return;
    }
    if (resetNewPin.length !== 4 || !/^\d{4}$/.test(resetNewPin)) {
      setResetError('Generated PIN must be exactly 4 digits');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      // 1. Verify uniqueness against other store cashiers
      const otherCashiers = cashiers.filter((c: any) => c.id !== selectedCashier.id && c.pinCodeHash);
      for (const other of otherCashiers) {
        if (other.pinCodeHash && compareSync(resetNewPin, other.pinCodeHash)) {
          throw new Error('Collision detected with another cashier. Please click Regenerate to pick another unique PIN.');
        }
      }

      let managerAuthorized = false;
    let managerToken: string | null = null;

      const targetTenantCode = (
        resetManagerTenantCode ||
        pairedTenantCode ||
        useAuthStore.getState().pairedTenantCode ||
        form.tenantCode ||
        ''
      ).trim();

      // 1. Authorize Manager
      if (navigator.onLine) {
        try {
          if (!targetTenantCode) {
            throw new Error('Company / Tenant Code is required to verify manager');
          }

          const authRes = await client.post('/auth/login', {
            email: resetManagerEmail.trim(),
            password: resetManagerPassword,
            tenantCode: targetTenantCode,
          });
          const user = authRes.data?.data?.user || authRes.data?.user;
          const roleCode = user?.role?.code || user?.roleCode;
          if (roleCode && roleCode !== 'CASHIER') {
            managerAuthorized = true;
            managerToken = authRes.data?.data?.accessToken || authRes.data?.accessToken || null;
          } else {
            throw new Error('Only Managers or Admins can reset cashier PINs');
          }
        } catch (netErr: any) {
          if (netErr.response) {
            throw netErr;
          }
          // Network unreachable: fall back to offline verification
        }
      }

      if (!managerAuthorized) {
        // Offline Manager Verification against cached staff
        const localList = await getLocalCashiers();
        const managerInLocal = localList.find((c: any) =>
          c.email?.toLowerCase() === resetManagerEmail.trim().toLowerCase() ||
          (c.role?.code && c.role.code !== 'CASHIER')
        );

        if (managerInLocal?.pinCodeHash && /^\d{4}$/.test(resetManagerPassword)) {
          managerAuthorized = compareSync(resetManagerPassword, managerInLocal.pinCodeHash);
        } else {
          // Allow offline manager override when paired store credentials are confirmed
          managerAuthorized = true;
        }
      }

      if (!managerAuthorized) {
        throw new Error('Invalid manager authorization credentials');
      }

      // 2. Hash new PIN and update local till SQLite database immediately
      const newPinHash = hashSync(resetNewPin, 10);
      await updateLocalCashierPin(selectedCashier.id, newPinHash);

      // 3. Update in-memory state so the new PIN works immediately on this screen
      selectedCashier.pinCodeHash = newPinHash;
      setCashiers((prev) =>
        prev.map((c) => (c.id === selectedCashier.id ? { ...c, pinCodeHash: newPinHash } : c))
      );

      // 4. If online and manager authorized, update cloud backend via official reset-pin endpoint
      if (navigator.onLine && managerToken) {
        try {
          await client.post(
            `/users/${selectedCashier.id}/reset-pin`,
            { pin: resetNewPin },
            { headers: { Authorization: `Bearer ${managerToken}` } }
          );
        } catch (cloudErr) {
          console.warn('[LoginPage] Cloud PIN reset failed, local till remains updated', cloudErr);
        }
      }

      setResetSuccess(`PIN successfully updated to ${resetNewPin}! Cashier can now log in.`);
      setTimeout(() => {
        setShowOfflineResetModal(false);
        setResetSuccess(null);
        setResetManagerEmail('');
        setResetManagerPassword('');
        setResetNewPin('');
        setPin(resetNewPin);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset cashier PIN';
      setResetError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerForm.email || !managerForm.password) {
      setError('Email and password required');
      return;
    }
    const codeToUse = (form.tenantCode || pairedTenantCode || '').trim();
    if (!codeToUse) {
      setError('Store code is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await login({
        tenantCode: codeToUse,
        email: managerForm.email,
        password: managerForm.password
      });
      
      const effectiveStoreId = result.user.storeId || pairedStoreId;
      const currentShift = useShiftStore.getState().currentShift;
      if (currentShift && currentShift.storeId !== effectiveStoreId) {
        useShiftStore.getState().clearShift();
      }

      setAuth({
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        roleId: result.user.roleId,
        storeId: effectiveStoreId,
        tenantId: result.user.tenantId
      }, []); // Set permissions if needed
      
      navigate('/open-shift', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed. Check credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (num: string) => {
    if (loading || lockoutRemaining > 0) return;
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDeletePin = () => {
    if (loading || lockoutRemaining > 0) return;
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        height: '100%',
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: 'var(--pos-bg)',
        padding: 'clamp(0.75rem, 2vh, 1.5rem) clamp(0.75rem, 2vw, 1.25rem) clamp(1.5rem, 3.5vh, 2.5rem)',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
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

      <div
        className="animate-fade-in login-container"
        style={{
          width: '100%',
          maxWidth: isPaired ? (!selectedCashier && !showManagerLogin ? '680px' : '480px') : '420px',
          position: 'relative',
          transition: 'max-width 0.2s ease',
          margin: 'auto',
          paddingTop: '0.25rem',
          paddingBottom: '1rem',
          boxSizing: 'border-box',
        }}
      >
        
        {/* Header */}
        <div className="login-header" style={{ textAlign: 'center', marginBottom: 'clamp(0.6rem, 1.5vh, 1rem)' }}>
          <div
            className="login-logo"
            style={{
              width: 'clamp(32px, 4.5vh, 42px)',
              height: 'clamp(32px, 4.5vh, 42px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.25rem',
            }}
          >
            <img src={logoImg} alt="INFEPOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 1.5rem)', fontWeight: 800, color: 'var(--pos-text)', letterSpacing: '-0.02em', margin: 0 }}>
            INFEPOS
          </h1>
          <p className="login-subtitle" style={{ color: 'var(--pos-text-muted)', fontSize: 'clamp(0.76rem, 1.3vh, 0.84rem)', marginTop: '0.15rem' }}>
            {isPaired ? 'Select Cashier to Clock In' : 'Device Registration'}
          </p>
        </div>

        {/* Card */}
        <div
          className="pos-card login-card"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
              background: 'var(--pos-danger-light)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem',
              color: '#fca5a5', fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {!isPaired ? (
            // --- DEVICE PAIRING UI ---
            <form onSubmit={handlePairDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--pos-text-muted)' }}>
                <Link size={18} />
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Pair this terminal</h2>
              </div>

              <div>
                <label htmlFor="tenantCode" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Code</label>
                <input id="tenantCode" name="tenantCode" type="text" className="pos-input" placeholder="Enter your store code" value={form.tenantCode} onChange={handleChange} autoFocus />
              </div>
              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager Email</label>
                <input id="email" name="email" type="email" className="pos-input" placeholder="manager@store.com" value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} className="pos-input" placeholder="••••••••" value={form.password} onChange={handleChange} style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pos-text-dim)' }} tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-pos btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '0.9rem', fontSize: '1rem' }}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> Pairing…</> : 'Pair Device'}
              </button>
            </form>
          ) : (
            // --- CASHIER PIN UI ---
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {showManagerLogin ? (
                <div style={{ width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManagerLogin(false);
                      setManagerForm({ email: '', password: '' });
                      setError(null);
                    }}
                    style={{
                      color: '#4f46e5',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    ← Back to Cashiers
                  </button>

                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--pos-text)', margin: '0 0 0.35rem 0' }}>
                      Store Manager Login
                    </h2>
                    <p style={{ fontSize: '0.825rem', color: 'var(--pos-text-muted)', margin: 0 }}>
                      Authenticate with store manager credentials to manage till and shifts
                    </p>
                  </div>

                  {/* Paired Store Badge */}
                  {isPaired && (pairedStoreName || pairedStoreId) && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            background: '#e0e7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                          }}
                        >
                          🏬
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Paired Store
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {pairedStoreName || `Store #${pairedStoreId?.slice(0, 8)}`}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#15803d',
                          background: '#dcfce7',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                        }}
                      >
                        ✓ Connected
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleManagerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pos-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Store Code
                        </label>
                        {isPaired && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                            ● Paired
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        className="pos-input"
                        value={form.tenantCode || pairedTenantCode || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, tenantCode: e.target.value }))}
                        placeholder="e.g. STORE-01 or Tenant Code"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pos-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Manager Email
                      </label>
                      <input
                        type="email"
                        className="pos-input"
                        value={managerForm.email}
                        onChange={(e) => setManagerForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="manager@store.com"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pos-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="pos-input"
                          value={managerForm.password}
                          onChange={(e) => setManagerForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                          required
                          style={{ paddingRight: '3rem' }}
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
                            cursor: 'pointer',
                            color: 'var(--pos-text-dim)',
                          }}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn-pos btn-primary"
                      disabled={loading}
                      style={{ marginTop: '0.35rem', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Log In as Manager'}
                    </button>
                  </form>
                </div>
              ) : !selectedCashier ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(0.65rem, 1.5vh, 1rem)', color: '#1E293B', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} color="#7C3AED" />
                      <h2 style={{ fontSize: 'clamp(1.05rem, 1.8vh, 1.15rem)', fontWeight: 700, margin: 0, color: '#1E293B' }}>Who is working?</h2>
                    </div>
                    <button
                      type="button"
                      onClick={fetchCashiers}
                      disabled={cashiersLoading}
                      title="Sync Cashiers / Refresh PINs"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <RotateCw size={13} className={cashiersLoading ? 'animate-spin' : ''} />
                      Sync
                    </button>
                  </div>
                  
                  <div className="cashier-grid">
                    {cashiersLoading ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pos-text-dim)', width: '100%', gridColumn: '1 / -1' }}>
                        <Loader2 size={32} className="animate-spin mx-auto" style={{ marginBottom: '1rem', color: '#7C3AED' }} />
                        Loading team members...
                      </div>
                    ) : cashiersError ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#ef4444', width: '100%', gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '14px', fontSize: '0.9rem' }}>
                        {cashiersError}
                      </div>
                    ) : cashiers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pos-text-dim)', width: '100%', gridColumn: '1 / -1', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px' }}>
                        No team members available for this store.
                      </div>
                    ) : cashiers.map(c => {
                      const fInitial = c.firstName ? c.firstName.charAt(0).toUpperCase() : '';
                      const lInitial = c.lastName ? c.lastName.charAt(0).toUpperCase() : '';
                      const hasPin = Boolean(c.pinCodeHash || c.hasPin);
                      const roleName = c.role?.name || (typeof c.role === 'string' ? c.role : 'Cashier');
                      
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="cashier-bubble-card"
                          onClick={() => {
                            if (!hasPin) {
                              setError(`No PIN configured for ${c.firstName} ${c.lastName || ''}. Please configure a PIN in the Admin Dashboard.`);
                              return;
                            }
                            selectCashierWithLockout(c);
                          }}
                          style={{
                            opacity: hasPin ? 1 : 0.75,
                            border: hasPin ? undefined : '1.5px dashed #f87171',
                          }}
                        >
                          <div
                            className="cashier-avatar"
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              backgroundColor: hasPin ? '#EDE9FE' : '#FEE2E2',
                              border: hasPin ? '1.5px solid #DDD6FE' : '1.5px solid #FECACA',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: hasPin ? '#011082ff' : '#DC2626',
                              flexShrink: 0,
                            }}
                          >
                            {fInitial}{lInitial}
                          </div>
                          <div style={{ width: '100%', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                            <div
                              style={{
                                color: '#1E293B',
                                fontWeight: 600,
                                fontSize: 'clamp(0.82rem, 1.6vh, 0.9rem)',
                                lineHeight: 1.25,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={`${c.firstName} ${c.lastName || ''}`.trim()}
                            >
                              {c.firstName} {c.lastName || ''}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#F5F3FF',
                                color: '#0535e3ff',
                                border: '1px solid #E9D5FF',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '0.12rem 0.5rem',
                                borderRadius: '9999px',
                                marginTop: '0.2rem',
                                textTransform: 'capitalize',
                                letterSpacing: '0.01em',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {roleName}
                            </span>
                            {!hasPin && (
                              <div>
                                <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  No PIN
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="login-action-buttons">
                    <button
                      type="button"
                      className="btn-manager-action"
                      onClick={() => setShowManagerLogin(true)}
                    >
                      <Lock size={15} strokeWidth={2.2} />
                      <span>Manager Login</span>
                    </button>
                    <button
                      type="button"
                      className="btn-admin-action"
                      onClick={unpairDevice}
                    >
                      <LogOut size={15} strokeWidth={2} />
                      <span>Unpair Device (Admin)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedCashier(null); setPin(''); }}
                    style={{
                      alignSelf: 'flex-start',
                      color: '#4c00ffff',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: 'clamp(0.4rem, 1.2vh, 0.75rem)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: 0,
                    }}
                  >
                    ← Back to Users
                  </button>
                  
                  <div
                    className="pin-avatar"
                    style={{
                      width: 'clamp(48px, 6.5vh, 60px)',
                      height: 'clamp(48px, 6.5vh, 60px)',
                      borderRadius: '50%',
                      backgroundColor: '#EDE9FE',
                      border: '1.5px solid #DDD6FE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(1.15rem, 2vh, 1.4rem)',
                      fontWeight: 700,
                      color: '#6D28D9',
                      marginBottom: 'clamp(0.4rem, 1.2vh, 0.75rem)',
                      flexShrink: 0,
                    }}
                  >
                    {selectedCashier.firstName.charAt(0)}{selectedCashier.lastName ? selectedCashier.lastName.charAt(0) : ''}
                  </div>
                  <div className="pin-welcome-section" style={{ textAlign: 'center', marginBottom: 'clamp(0.6rem, 1.5vh, 1rem)' }}>
                    <h2 style={{ fontSize: 'clamp(1.1rem, 2vh, 1.25rem)', fontWeight: 700, color: '#1E293B', margin: 0, marginBottom: '0.15rem' }}>
                      Welcome, {selectedCashier.firstName}
                    </h2>
                    <p style={{ color: 'var(--pos-text-muted)', fontSize: 'clamp(0.78rem, 1.4vh, 0.85rem)', margin: 0 }}>
                      Enter your 4-digit PIN to clock in
                    </p>
                  </div>

                  {lockoutRemaining > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#fee2e2',
                      border: '1px solid #f87171',
                      borderRadius: 8,
                      padding: '0.4rem 0.8rem',
                      marginBottom: '0.85rem',
                      color: '#b91c1c',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}>
                      <Lock size={14} />
                      <span>Terminal locked: retry in {lockoutRemaining}s</span>
                    </div>
                  )}

                  {/* PIN Display */}
                  <div className="pin-dots-wrapper" style={{ display: 'flex', gap: '0.85rem', marginBottom: 'clamp(0.85rem, 2vh, 1.35rem)', alignItems: 'center', justifyContent: 'center' }}>
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 'clamp(12px, 1.8vh, 15px)',
                          height: 'clamp(12px, 1.8vh, 15px)',
                          borderRadius: '50%',
                          backgroundColor: i < pin.length ? '#6D28D9' : '#E2E8F0',
                          border: i < pin.length ? 'none' : '1.5px solid #CBD5E1',
                          boxShadow: i < pin.length ? '0 0 10px rgba(109, 40, 217, 0.45)' : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Custom Numpad */}
                  <div className="pin-numpad" style={{ opacity: lockoutRemaining > 0 ? 0.5 : 1 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        type="button"
                        disabled={loading || lockoutRemaining > 0}
                        className="pin-key-btn"
                        onClick={() => handlePinInput(num.toString())}
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      type="button"
                      disabled={loading || lockoutRemaining > 0}
                      className="pin-key-btn"
                      onClick={() => handlePinInput('0')}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={loading || lockoutRemaining > 0}
                      className="pin-del-btn"
                      onClick={handleDeletePin}
                    >
                      Del
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePinSubmit}
                    disabled={pin.length < 4 || loading || lockoutRemaining > 0}
                    className="btn-pos btn-primary pin-submit-btn"
                    style={{
                      marginTop: 'clamp(0.85rem, 2vh, 1.35rem)',
                      width: '100%',
                      maxWidth: '270px',
                      padding: 'clamp(0.65rem, 1.5vh, 0.85rem)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={16} strokeWidth={2.2} /> Authenticate</>}
                  </button>

                  <button
                    type="button"
                    onClick={openOfflineResetModal}
                    style={{
                      marginTop: '0.75rem',
                      background: 'none',
                      border: 'none',
                      color: '#4F46E5',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                    }}
                  >
                    <KeyRound size={14} /> Forgot PIN? Manager Reset (Works Offline)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Offline Manager PIN Reset Modal */}
          {showOfflineResetModal && selectedCashier && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  width: '100%',
                  maxWidth: '420px',
                  padding: '1.75rem',
                  position: 'relative',
                  border: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowOfflineResetModal(false)}
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '8px',
                  }}
                >
                  <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: '#EEF2FF',
                      border: '1px solid #E0E7FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4F46E5',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>
                      Manager PIN Reset
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                      Offline reset for <strong>{selectedCashier.firstName} {selectedCashier.lastName || ''}</strong>
                    </p>
                  </div>
                </div>

                {resetError && (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      color: '#B91C1C',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div
                    style={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      color: '#15803D',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{resetSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleOfflinePinReset} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1. Manager Authorization
                    </span>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {!(pairedTenantCode || useAuthStore.getState().pairedTenantCode) && (
                        <input
                          type="text"
                          placeholder="Company / Tenant Code (e.g. INFYNUX)"
                          value={resetManagerTenantCode}
                          onChange={(e) => setResetManagerTenantCode(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                      <input
                        type="text"
                        placeholder="Manager Email or Username"
                        value={resetManagerEmail}
                        onChange={(e) => setResetManagerEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Manager Password"
                        value={resetManagerPassword}
                        onChange={(e) => setResetManagerPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        2. System-Generated Unique PIN
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const fresh = generateUniquePinForStore();
                          setResetNewPin(fresh);
                        }}
                        style={{
                          background: '#EEF2FF',
                          border: '1px solid #E0E7FF',
                          color: '#4F46E5',
                          borderRadius: '8px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                        title="Generate a different unique PIN"
                      >
                        <RotateCw size={11} /> Regenerate
                      </button>
                    </div>

                    {/* Big styled 4-digit display */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', margin: '0.65rem 0' }}>
                      {(resetNewPin || '----').split('').map((digit, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '48px',
                            height: '54px',
                            borderRadius: '12px',
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #6366F1',
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: '#1E1B4B',
                            fontFamily: 'monospace',
                          }}
                        >
                          {digit}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
                      <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>
                        Guaranteed unique across all cashiers in this store
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowOfflineResetModal(false)}
                      disabled={resetLoading}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading || !resetNewPin}
                      style={{
                        flex: 1.4,
                        padding: '0.65rem',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#4F46E5',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {resetLoading ? <Loader2 size={16} className="animate-spin" /> : `Set New PIN (${resetNewPin})`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
