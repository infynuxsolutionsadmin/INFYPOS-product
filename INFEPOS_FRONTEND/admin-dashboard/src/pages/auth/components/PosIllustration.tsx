import React, { useState } from 'react';
import { Monitor } from 'lucide-react';

interface PosIllustrationProps {
  imageSrc?: string;
  altText?: string;
  className?: string;
}

export const PosIllustration: React.FC<PosIllustrationProps> = ({
  imageSrc = '/pos-terminal-illustration.png',
  altText = 'INFEPOS Smart POS Terminal and Receipt Printer',
  className = '',
}) => {
  const [loadError, setLoadError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {!loadError ? (
        <img
          src={imageSrc}
          alt={altText}
          onError={() => setLoadError(true)}
          className="w-full max-w-[340px] sm:max-w-[380px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)] transition-transform duration-500 hover:scale-[1.02]"
        />
      ) : (
        /* Fallback modern illustration placeholder if image cannot be loaded */
        <div className="w-full max-w-[320px] aspect-[16/10] rounded-2xl bg-blue-950/60 border border-blue-400/20 p-6 flex flex-col items-center justify-center text-center text-blue-200 shadow-2xl backdrop-blur-md">
          <Monitor className="w-16 h-16 text-blue-400 mb-3" />
          <span className="font-semibold text-white text-sm">INFEPOS Terminal</span>
          <span className="text-xs text-blue-300/80 mt-1">Smart Cloud POS Station</span>
        </div>
      )}
    </div>
  );
};

export default PosIllustration;
