import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Eye, EyeOff, Loader2, AlertCircle, Link, Users, Lock, LogOut } from 'lucide-react';
import { login } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import client from '../api/client';
import { compareSync } from 'bcrypt-ts';
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
    try {
      const res = await client.get(`/users/cashiers/${pairedStoreId}`);
      const data = res.data.data || res.data;
      setCashiers(data);
      // Cache for offline use
      await syncCashiersToLocalDb(data);
    } catch (err) {
      console.warn('Failed to fetch cashiers online, falling back to local DB', err);
      try {
        const localCashiers = await getLocalCashiers();
        setCashiers(localCashiers);
      } catch (e) {
        console.error('Failed to load local cashiers', e);
      }
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
      const result = await login(form);
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
    if (pin.length < 4) return;
    setLoading(true);
    setError(null);
    
    // Simulate slight delay to prevent brute-forcing and allow UI to update
    setTimeout(() => {
      try {
        const isValid = compareSync(pin, selectedCashier.pinCodeHash || '');
        
        if (isValid) {
          // Success! Log the cashier in
          setAuth({
            id: selectedCashier.id,
            firstName: selectedCashier.firstName,
            lastName: selectedCashier.lastName,
            email: 'cashier@store.com', // Not needed for offline cashier
            roleId: 'cashier-role',
            storeId: pairedStoreId,
            tenantId: pairedTenantId || 'tenant-id'
          }, ['sales.create']);
          
          navigate('/open-shift', { replace: true });
        } else {
          setError('Invalid PIN code');
          setPin('');
        }
      } catch (e) {
        console.error(e);
        setError('Error verifying PIN');
      } finally {
        setLoading(false);
      }
    }, 500);
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
      
      setAuth({
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        roleId: result.user.roleId,
        storeId: result.user.storeId || pairedStoreId,
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
    if (pin.length < 6) setPin(prev => prev + num);
  };

  const handleDeletePin = () => {
    setPin(prev => prev.slice(0, -1));
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

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: isPaired ? '600px' : '420px', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 100,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}
          >
            <img src="/logo.png" alt="INFEPOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--pos-text)', letterSpacing: '-0.02em' }}>
            INFEPOS
          </h1>
          <p style={{ color: 'var(--pos-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isPaired ? 'Select Cashier to Clock In' : 'Device Registration'}
          </p>
        </div>

        {/* Card */}
        <div
          className="pos-card"
          style={{
            padding: isPaired ? '2.5rem' : '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--pos-text)' }}>
                    <Users size={20} />
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Who is working?</h2>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', width: '100%' }}>
                    {cashiers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCashier(c)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '1.5rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <div style={{ width: 48, height: 48, borderRadius: 24, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                          {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: 'var(--pos-text)', fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
                          <div style={{ color: 'var(--pos-text-dim)', fontSize: '0.75rem' }}>{c.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => setShowManagerLogin(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pos-text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <Lock size={16} /> Manager Login
                    </button>
                    <button onClick={unpairDevice} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pos-text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <LogOut size={16} /> Unpair Device (Admin)
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <button onClick={() => { setSelectedCashier(null); setPin(''); }} style={{ alignSelf: 'flex-start', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem' }}>
                    ← Back to Users
                  </button>
                  
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                    {selectedCashier.firstName.charAt(0)}{selectedCashier.lastName.charAt(0)}
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--pos-text)', marginBottom: '0.5rem' }}>
                    Welcome, {selectedCashier.firstName}
                  </h2>
                  <p style={{ color: 'var(--pos-text-dim)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Enter your 4-digit PIN to clock in
                  </p>

                  {/* PIN Display */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{
                        width: 16, height: 16, borderRadius: 8,
                        background: i < pin.length ? '#6366f1' : 'rgba(255,255,255,0.1)',
                        boxShadow: i < pin.length ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                        transition: 'all 0.2s'
                      }} />
                    ))}
                  </div>

                  {/* Custom Numpad */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', maxWidth: '280px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button key={num} onClick={() => handlePinInput(num.toString())}
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 70, height: 70, fontSize: '1.5rem', fontWeight: 600, color: 'var(--pos-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button onClick={() => handlePinInput('0')}
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 70, height: 70, fontSize: '1.5rem', fontWeight: 600, color: 'var(--pos-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >0</button>
                    <button onClick={handleDeletePin}
                        style={{ background: 'none', border: 'none', borderRadius: '50%', width: 70, height: 70, fontSize: '1rem', fontWeight: 600, color: 'var(--pos-text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >Del</button>
                  </div>

                  <button onClick={handlePinSubmit} disabled={pin.length < 4 || loading} className="btn-pos btn-primary" style={{ marginTop: '2rem', width: '100%', maxWidth: '280px', padding: '1rem' }}>
                    {loading ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Authenticate</>}
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
