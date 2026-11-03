import React from 'react';
import { ShieldCheck, MonitorCheck, TrendingUp } from 'lucide-react';
import BrandLogo from './BrandLogo';
import PosIllustration from './PosIllustration';

interface LoginBrandingPanelProps {
  className?: string;
}

export const LoginBrandingPanel: React.FC<LoginBrandingPanelProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-[#051E45] via-[#072B62] to-[#0A3D7F] text-white p-5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Decorative ambient fluid curve overlay mirroring the reference aesthetic */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
        viewBox="0 0 500 700"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M260,0 C380,120 520,260 490,440 C460,600 320,660 340,700 L500,700 L500,0 Z"
          fill="url(#branding-wave-1)"
        />
        <path
          d="M180,0 C320,180 460,340 430,520 C400,660 260,690 280,700 L500,700 L500,0 Z"
          fill="url(#branding-wave-2)"
          opacity="0.4"
        />
        <defs>
          <linearGradient id="branding-wave-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0B4299" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="branding-wave-2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E6BFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#051E45" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* Subtle radial lighting highlights */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Brand Logo */}
      <div className="relative z-10">
        <BrandLogo />

        {/* Small cyan accent capsule */}
        <div className="w-10 h-1 bg-[#38bdf8] rounded-full mt-4 mb-2.5 shadow-xs" />

        {/* Hero Headings */}
        <h2 className="text-xl sm:text-[22px] lg:text-2xl font-bold text-white tracking-tight leading-[1.25] font-sans">
          Powering Retail Excellence <br className="hidden sm:inline" />
          with <span className="text-[#38bdf8]">Smart Technology</span>
        </h2>

        {/* Hero Subtitle */}
        <p className="mt-1.5 text-xs text-blue-100/80 leading-relaxed max-w-sm font-normal font-sans">
          All-in-one POS &amp; Store Management solution empowering modern retail and multi-store business operations.
        </p>
      </div>

      {/* Center Showcase: POS Terminal Illustration */}
      <div className="relative z-10 my-2 sm:my-3 flex justify-center items-center">
        <PosIllustration />
      </div>

      {/* Bottom Features Row: 3 Feature highlights separated by dividers */}
      <div className="relative z-10 pt-2.5 border-t border-white/10 flex items-center justify-between sm:justify-around text-left">
        {/* Feature 1: Secure Access */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white leading-tight font-sans">Secure</span>
            <span className="text-[9.5px] text-blue-200/80 leading-tight font-sans">Access</span>
          </div>
        </div>

        {/* Divider 1 */}
        <div className="h-5 w-[1px] bg-white/15" />

        {/* Feature 2: Reliable Performance */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <MonitorCheck className="w-3.5 h-3.5 text-blue-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white leading-tight font-sans">Reliable</span>
            <span className="text-[9.5px] text-blue-200/80 leading-tight font-sans">Performance</span>
          </div>
        </div>

        {/* Divider 2 */}
        <div className="h-5 w-[1px] bg-white/15" />

        {/* Feature 3: Scalable for Growth */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white leading-tight font-sans">Scalable</span>
            <span className="text-[9.5px] text-blue-200/80 leading-tight font-sans">for Growth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginBrandingPanel;
