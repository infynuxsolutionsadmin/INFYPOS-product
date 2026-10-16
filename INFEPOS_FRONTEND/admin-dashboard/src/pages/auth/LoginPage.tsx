import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { login } from '../../api/auth.api';
import LoginBrandingPanel from './components/LoginBrandingPanel';
import LoginFormPanel from './components/LoginFormPanel';

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
      const response = await login({
        email: email.trim(),
        password,
        tenantCode: tenantCode.trim(),
      });
      setAuth(
        response.user,
        response.permissions,
        response.tokens.accessToken,
        response.tokens.refreshToken
      );
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
    <div className="w-full max-w-[1060px] mx-auto my-auto relative z-10 transition-all duration-300">
      {/* Outer Card: Navy Branding on Left, White Form on Right with subtle divider */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-200/90">
        {/* Left Column: Navy-Blue Branding Panel */}
        <div className="lg:col-span-5 flex flex-col">
          <LoginBrandingPanel className="h-full min-h-[440px] lg:min-h-[620px]" />
        </div>

        {/* Right Column: White Login Form Panel with subtle vertical divider */}
        <div className="lg:col-span-7 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200/80">
          <LoginFormPanel
            tenantCode={tenantCode}
            setTenantCode={setTenantCode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
