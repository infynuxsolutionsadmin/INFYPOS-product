import React, { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', showSubtitle = true }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div className="relative flex items-center justify-center shrink-0">
        {!imgError ? (
          <img
            src="/logo-transparent.png"
            alt="INFEPOS Logo"
            className="h-10 w-auto max-w-[42px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-white font-bold text-xl shadow-inner">
            I
          </div>
        )}
      </div>

      {/* Brand Text & Slogan with clean modern typography */}
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight text-white leading-none font-sans">
          INFEPOS
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-normal text-blue-200/85 tracking-normal mt-1 leading-tight font-sans">
            Smart POS Solutions for Modern Businesses
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
