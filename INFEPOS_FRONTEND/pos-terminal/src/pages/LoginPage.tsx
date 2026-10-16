import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Link, Users, Lock, LogOut, RotateCw } from 'lucide-react';
import { login, verifyPin } from '../api/auth.api';
import { compareSync } from 'bcrypt-ts';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import client from '../api/client';
import { getLocalCashiers, syncCashiersToLocalDb } from '../services/localDb';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isPaired, setPaired, setAuth, unpairDevice, pairedStoreId, pairedTenantId } = useAuthStore();

  const [form, setForm] = useState({
    tenantCode: '',
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cashier PIN state
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [cashiersLoading, setCashiersLoading] = useState(false);
  const [cashiersError, setCashiersError] = useState<string | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<any | null>(null);
  const [pin, setPin] = useState('');
  
  // Manager Login state
  const [showManagerLogin, setShowManagerLogin] = useState(false);
  const [managerForm, setManagerForm] = useState({
    email: '',
    password: ''
  });

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
        storeCode: form.tenantCode,
        email: form.email,
        password: form.password
      });
      if (!result.user.storeId) {
        throw new Error('Manager must be assigned to a specific store to pair a device.');
      }
      setPaired(result.user.tenantId, result.user.storeId, result.tokens.accessToken, result.tokens.refreshToken);
      // Let useEffect fetch cashiers
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Pairing failed. Check credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4 || loading || !selectedCashier) return;
    setLoading(true);
    setError(null);

    if (!selectedCashier.pinCodeHash) {
      setError('No PIN configured for this cashier. Please configure a 4-digit PIN in the Admin Dashboard.');
      setPin('');
      setLoading(false);
      return;
    }
    
    // Check PIN against cached hash; if mismatch, attempt live re-fetch in case PIN was recently reset
    setTimeout(async () => {
      try {
        let isValid = compareSync(pin, selectedCashier.pinCodeHash || '');

        if (!isValid) {
          try {
            const res = await verifyPin(selectedCashier.id, pin);
            if (res?.user) {
              isValid = true;
            }
          } catch {
            // fallback
          }
        }

        if (!isValid && pairedStoreId) {
          try {
            const res = await client.get(`/users/cashiers/${pairedStoreId}`);
            const freshList = res.data?.data || res.data || [];
            if (Array.isArray(freshList)) {
              const freshCashier = freshList.find((c: any) => c.id === selectedCashier.id);
              if (freshCashier?.pinCodeHash && compareSync(pin, freshCashier.pinCodeHash)) {
                isValid = true;
                selectedCashier.pinCodeHash = freshCashier.pinCodeHash;
                await syncCashiersToLocalDb(freshList);
                setCashiers(freshList);
              }
            }
          } catch (syncErr) {
            console.warn('Live PIN re-verification attempt failed', syncErr);
          }
        }
        
        if (isValid) {
          // Success! Log the cashier in
          const currentShift = useShiftStore.getState().currentShift;
          if (currentShift && currentShift.storeId !== pairedStoreId) {
            useShiftStore.getState().clearShift();
          }

          setAuth({
            id: selectedCashier.id,
            firstName: selectedCashier.firstName,
            lastName: selectedCashier.lastName,
            email: selectedCashier.email || 'cashier@store.com',
            roleId: selectedCashier.roleId || 'cashier-role',
            storeId: pairedStoreId,
            tenantId: pairedTenantId || 'tenant-id'
          }, ['sales.create']);
          
          navigate('/open-shift', { replace: true });
        } else {
          setError('Invalid PIN code');
          setPin('');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Authentication error occurred';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
        setPin('');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerForm.email || !managerForm.password) {
      setError('Email and password required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await login({
        tenantCode: form.tenantCode,
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
    if (loading) return;
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDeletePin = () => {
    if (loading) return;
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
              width: 'clamp(46px, 6.5vh, 60px)',
              height: 'clamp(46px, 6.5vh, 60px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.25rem',
            }}
          >
            <img src="/logo.png" alt="INFEPOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  <button onClick={() => { setShowManagerLogin(false); setManagerForm({ email: '', password: '' }); }} style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ← Back to Cashiers
                  </button>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--pos-text)', marginBottom: '1.5rem', textAlign: 'center' }}>Manager Login</h2>
                  <form onSubmit={handleManagerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Tenant Code</label>
                      <input type="text" className="pos-input" value={form.tenantCode} onChange={(e) => setForm(prev => ({ ...prev, tenantCode: e.target.value }))} placeholder="Store Code" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Email</label>
                      <input type="email" className="pos-input" value={managerForm.email} onChange={(e) => setManagerForm(prev => ({ ...prev, email: e.target.value }))} placeholder="manager@store.com" required autoFocus />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassword ? 'text' : 'password'} className="pos-input" value={managerForm.password} onChange={(e) => setManagerForm(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" required style={{ paddingRight: '3rem' }} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pos-text-dim)' }} tabIndex={-1}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="btn-pos btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '0.9rem', fontSize: '1rem' }}>
                      {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Log In'}
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
                            setSelectedCashier(c);
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
                  <div className="pin-numpad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        type="button"
                        className="pin-key-btn"
                        onClick={() => handlePinInput(num.toString())}
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      type="button"
                      className="pin-key-btn"
                      onClick={() => handlePinInput('0')}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="pin-del-btn"
                      onClick={handleDeletePin}
                    >
                      Del
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePinSubmit}
                    disabled={pin.length < 4 || loading}
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
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
