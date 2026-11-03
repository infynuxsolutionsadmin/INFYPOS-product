import React, { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
  theme?: 'dark' | 'light';
  logoSize?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  showSubtitle = true,
  theme = 'dark',
  logoSize = 'h-7 max-w-[28px]',
}) => {
  const [imgError, setImgError] = useState(false);

  const isLight = theme === 'light';
  const logoSrc = isLight ? '/transparent_logo.png' : '/transparent_logo_white.png';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div className="relative flex items-center justify-center shrink-0">
        {!imgError ? (
          <img
            src={logoSrc}
            alt="INFEPOS Logo"
            className={`${logoSize} w-auto object-contain drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.2)]`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            I
          </div>
        )}
      </div>

      {/* Brand Text & Slogan with clean modern typography */}
      <div className="flex flex-col">
        <span
          className={`text-2xl font-bold tracking-tight leading-none font-sans ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          INFEPOS
        </span>
        {showSubtitle && (
          <span
            className={`text-[11px] font-normal tracking-normal mt-1 leading-tight font-sans ${
              isLight ? 'text-slate-500' : 'text-blue-200/85'
            }`}
          >
            Smart POS Solutions for Modern Businesses
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
