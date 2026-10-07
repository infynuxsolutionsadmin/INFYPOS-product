import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, LogIn, Server, ShieldCheck, Mail, Phone, MapPin,
  ArrowRight, CheckCircle2, BarChart3, RefreshCw, Wifi, Lock, ChevronDown,
  Globe, Users, TrendingUp,
  ScanBarcode, ShoppingCart, DollarSign, Search, Package, ClipboardList,
  Layers, Store, Receipt, Truck, PieChart, Bell, Tag, UserCheck,
  CreditCard, Boxes, FileText, Activity, Building2, ArrowUpDown,
  X, Sparkles, Cpu, HardDrive,
  FileCode, Monitor, Laptop
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   PARTICLE CANVAS — All 4 corners emit bubbles toward center
   Top corners: fall downward | Bottom corners: rise upward
───────────────────────────────────────────────────────────────── */
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      wobble: number;
      wobbleSpeed: number;
      wobbleAmp: number;
      life: number;
      lifeSpeed: number;
      r: number;
      corner: Corner;
    }

    const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const PER_CORNER = 40; // 40 per corner = 160 total

    const getSpawnProps = (corner: Corner) => {
      const spread = canvas.width * 0.20;
      const spreadY = canvas.height * 0.08;

      let x: number, y: number, vx: number, vy: number;
      const speed = 0.8 + Math.random() * 1.5;
      const drift = 0.1 + Math.random() * 0.3;

      switch (corner) {
        case 'top-left':
          x = Math.random() * spread;
          y = Math.random() * spreadY;
          vx = drift;        // drift right (inward)
          vy = speed;        // fall down
          break;
        case 'top-right':
          x = canvas.width - Math.random() * spread;
          y = Math.random() * spreadY;
          vx = -drift;       // drift left (inward)
          vy = speed;        // fall down
          break;
        case 'bottom-left':
          x = Math.random() * spread;
          y = canvas.height - Math.random() * spreadY;
          vx = drift;        // drift right (inward)
          vy = -speed;       // rise up
          break;
        case 'bottom-right':
        default:
          x = canvas.width - Math.random() * spread;
          y = canvas.height - Math.random() * spreadY;
          vx = -drift;       // drift left (inward)
          vy = -speed;       // rise up
          break;
      }

      return { x, y, vx, vy };
    };

    const spawnParticle = (corner: Corner): Particle => {
      const { x, y, vx, vy } = getSpawnProps(corner);
      return {
        x, y, vx, vy,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.025,
        wobbleAmp: 0.25 + Math.random() * 0.6,
        life: Math.random(), // staggered start
        lifeSpeed: 0.003 + Math.random() * 0.004,
        r: Math.random() * 2.5 + 0.8,
        corner,
      };
    };

    const resetParticle = (p: Particle): void => {
      const { x, y, vx, vy } = getSpawnProps(p.corner);
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.wobble = Math.random() * Math.PI * 2;
      p.wobbleSpeed = 0.02 + Math.random() * 0.025;
      p.wobbleAmp = 0.25 + Math.random() * 0.6;
      p.life = 1;
      p.lifeSpeed = 0.003 + Math.random() * 0.004;
      p.r = Math.random() * 2.5 + 0.8;
    };

    // Spawn equal particles from all 4 corners
    const particles: Particle[] = CORNERS.flatMap(corner =>
      Array.from({ length: PER_CORNER }, () => spawnParticle(corner))
    );

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        const fadeIn = Math.min(p.life * 5, 1);
        const alpha = fadeIn * p.life * 0.72;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill();
        ctx.restore();

        // Natural wobble + directional movement
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmp;
        p.y += p.vy;
        p.life -= p.lifeSpeed;

        // Respawn at same corner when faded or exits canvas
        const outOfBounds =
          p.y < -10 || p.y > canvas.height + 10 ||
          p.x < -10 || p.x > canvas.width + 10;

        if (p.life <= 0 || outOfBounds) {
          resetParticle(p);
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

/* ─────────────────────────────────────────────────────────────────
   TYPEWRITER HEADING — Smooth scroll-triggered typing animation
───────────────────────────────────────────────────────────────── */
const TypewriterHeading: React.FC<{
  text: string;
  className?: string;
  speed?: number;
  isDarkTheme?: boolean;
}> = ({ text, className = '', speed = 50, isDarkTheme = false }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      {
        threshold: 0.4,
        rootMargin: '0px 0px -120px 0px'
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [hasStarted, text, speed]);

  const renderStyledContent = (currentText: string) => {
    if (!currentText.toUpperCase().includes('INFEPOS')) {
      return <span>{currentText}</span>;
    }

    const parts = currentText.split(/(INFEPOS)/gi);
    return (
      <>
        {parts.map((part, i) => {
          if (part.toUpperCase() === 'INFEPOS') {
            return (
              <span key={i} className="inline-flex items-center mx-1">
                <span className={isDarkTheme ? 'text-white' : 'text-slate-900'}>INF</span>
                <span className="font-serif italic bg-gradient-to-tr from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent font-normal inline-block mx-[-0.01em] transform -rotate-3">
                  E
                </span>
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                  POS
                </span>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <h2 ref={elementRef} className={`${className} ${!hasStarted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
      {renderStyledContent(displayedText)}
      {hasStarted && displayedText.length < text.length && (
        <span className="inline-block w-1.5 h-[0.85em] bg-blue-600 ml-1 animate-pulse align-baseline" />
      )}
    </h2>
  );
};

/* ─────────────────────────────────────────────────────────────────
   INFEPOS BRAND LOGO TEXT — Signature INF + E (amber serif) + POS (gradient)
───────────────────────────────────────────────────────────────── */
const InfeposLogoText: React.FC<{
  textSize?: string;
  isHeroTheme?: boolean;
}> = ({ textSize = 'text-xl', isHeroTheme = false }) => {
  return (
    <span className={`${textSize} font-extrabold tracking-tight inline-flex items-center`}>
      <span className={isHeroTheme ? 'text-white' : 'text-slate-950'}>INF</span>
      <span className="font-serif italic bg-gradient-to-tr from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent font-normal inline-block mx-[-0.01em] transform -rotate-3">
        E
      </span>
      <span className={isHeroTheme ? 'text-sky-300' : 'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent'}>
        POS
      </span>
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   VORTEX PARTICLE CANVAS — Concentric rotating/pulsing dot rings
───────────────────────────────────────────────────────────────── */
const VortexParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.003;

      // Positioned near right side of card
      const centerX = canvas.width * 0.72;
      const centerY = canvas.height * 0.5;
      const rings = 16;

      for (let r = 1; r <= rings; r++) {
        const radius = r * 28 + Math.sin(angle * 1.5 + r * 0.3) * 6;
        const dots = r * 15;
        const speedMultiplier = (r % 2 === 0 ? 1 : -1) * 0.4;

        for (let i = 0; i < dots; i++) {
          const dotAngle = (i / dots) * Math.PI * 2 + angle * speedMultiplier;
          const x = centerX + Math.cos(dotAngle) * radius * 1.4;
          const y = centerY + Math.sin(dotAngle) * radius;

          const distFromCenter = Math.hypot(x - centerX, y - centerY);
          const opacity = Math.max(0.08, 1 - distFromCenter / (canvas.width * 0.55));
          const size = 1.2 + r * 0.12;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = i % 3 === 0
            ? `rgba(96, 165, 250, ${opacity * 0.85})`
            : `rgba(255, 255, 255, ${opacity * 0.6})`;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 4;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-[3rem]"
    />
  );
};

/* ─────────────────────────────────────────────────────────────────
   ICON WAVE STRIP — Antigravity-style scrolling icon band
───────────────────────────────────────────────────────────────── */

const waveIconsRow1 = [
  { Icon: ScanBarcode, label: 'Barcode Scanner', color: '#3b82f6' },
  { Icon: ShoppingCart, label: 'POS Cart', color: '#8b5cf6' },
  { Icon: DollarSign, label: 'Payments', color: '#10b981' },
  { Icon: Package, label: 'Products', color: '#f59e0b' },
  { Icon: BarChart3, label: 'Analytics', color: '#3b82f6' },
  { Icon: Receipt, label: 'Receipts', color: '#ec4899' },
  { Icon: Layers, label: 'Inventory', color: '#6366f1' },
  { Icon: Store, label: 'Stores', color: '#14b8a6' },
  { Icon: CreditCard, label: 'Card Payment', color: '#3b82f6' },
  { Icon: Tag, label: 'Pricing', color: '#f97316' },
  { Icon: ClipboardList, label: 'Orders', color: '#8b5cf6' },
  { Icon: Truck, label: 'Suppliers', color: '#06b6d4' },
];

const waveIconsRow2 = [
  { Icon: Search, label: 'Search', color: '#6366f1' },
  { Icon: UserCheck, label: 'Staff Roles', color: '#10b981' },
  { Icon: PieChart, label: 'Reports', color: '#f59e0b' },
  { Icon: Bell, label: 'Notifications', color: '#ec4899' },
  { Icon: Boxes, label: 'Stock', color: '#3b82f6' },
  { Icon: FileText, label: 'Invoices', color: '#8b5cf6' },
  { Icon: Activity, label: 'Activity', color: '#14b8a6' },
  { Icon: ShieldCheck, label: 'Security', color: '#6366f1' },
  { Icon: Building2, label: 'Multi-Store', color: '#f97316' },
  { Icon: ArrowUpDown, label: 'Sync', color: '#3b82f6' },
  { Icon: Server, label: 'Cloud Sync', color: '#10b981' },
  { Icon: Users, label: 'Customers', color: '#ec4899' },
];

// interface WaveIconItem { Icon: React.FC<{ size?: number; color?: string }>; label: string; color: string; }

/* ─────────────────────────────────────────────────────────────────────────────
   ICON WAVE STRIP — Smooth traveling sine wave, colorful circles
   ─────────────────────────────────────────────────────────────────────────────
   HOW THE SMOOTH WAVE WORKS:
   • Every circle runs the same `waveBob` keyframe (0 → −AMPLITUDE → 0 → +AMPLITUDE → 0)
   • Each circle gets animationDelay = −(index % total) × PHASE_STEP seconds
     The negative sign means the animation starts mid-cycle at exactly the right
     sine phase for that position → the whole row INSTANTLY looks like a sine curve
   • As the row scrolls, each circle keeps oscillating, so the wave TRAVELS
     (unlike a static translateY which just slides a frozen curve sideways)
   ───────────────────────────────────────────────────────────────────────────── */

const WAVE_AMPLITUDE = 20;   // px — gentle rise & fall (calm ocean)
const WAVE_PERIOD = 9.0;  // s  — slow, lazy bob per circle
const WAVE_WAVELENGTH = 7;    // cards — wide crests, like long ocean swells
const PHASE_STEP = WAVE_PERIOD / WAVE_WAVELENGTH; // s delay between adjacent cards
const CIRCLE_SIZE = 68;   // px — circle diameter

const IconWaveStrip: React.FC = () => {
  const allIcons = [...waveIconsRow1, ...waveIconsRow2]; // 24 icons
  const items = [...allIcons, ...allIcons];            // duplicated for seamless loop

  return (
    <section
      style={{
        background: '#ffffff',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        padding: '4rem 0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{
          fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.14em',
          color: '#3b82f6', textTransform: 'uppercase', marginBottom: '0.5rem',
        }}>
          Everything your retail business needs
        </p>
        <h2 style={{
          fontSize: '1.875rem', fontWeight: 800, color: '#0f172a',
          letterSpacing: '-0.03em', lineHeight: 1.2,
        }}>
          One platform. Every feature.
        </h2>
      </div>

      {/* Left / right gradient fade masks */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '12%',
        background: 'linear-gradient(to right, #ffffff 20%, transparent)',
        zIndex: 3, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '12%',
        background: 'linear-gradient(to left, #ffffff 20%, transparent)',
        zIndex: 3, pointerEvents: 'none',
      }} />

      {/* Scrolling track — tall enough to hold the sine excursion */}
      <div style={{
        overflow: 'hidden',
        height: CIRCLE_SIZE + WAVE_AMPLITUDE * 2 + 24,
        position: 'relative',
      }}>
        {/*
          The container only handles horizontal scroll.
          Individual circles handle vertical oscillation via waveBob.
          Separating the two transforms avoids any CSS conflict.
        */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',  /* vertical center = midline of the wave track */
            gap: '1rem',
            width: 'max-content',
            height: '100%',
            animation: 'iconWaveScroll 70s linear infinite',
            willChange: 'transform',
          }}
        >
          {items.map(({ Icon, color }, i) => {
            /* Negative delay puts the circle at the correct sine phase immediately */
            const delay = -((i % allIcons.length) * PHASE_STEP);
            return (
              <div
                key={i}
                style={{
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: '50%',
                  /* Colorful: soft tint of the icon's own color */
                  background: `${color}18`,
                  border: `1.5px solid ${color}35`,
                  boxShadow: `0 4px 16px ${color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'default',
                  userSelect: 'none' as React.CSSProperties['userSelect'],
                  willChange: 'transform',
                  /* Each circle runs its own waveBob with its own phase */
                  animation: `waveBob ${WAVE_PERIOD}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              >
                <Icon size={26} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Horizontal infinite scroll — only translateX, no Y here */
        @keyframes iconWaveScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* Vertical sine-wave bob — pure sinusoidal, smooth ease-in-out */
        @keyframes waveBob {
          0%   { transform: translateY(0px); }
          25%  { transform: translateY(-${WAVE_AMPLITUDE}px); }
          50%  { transform: translateY(0px); }
          75%  { transform: translateY(${WAVE_AMPLITUDE}px); }
          100% { transform: translateY(0px); }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes iconWaveScroll { from, to { transform: none; } }
          @keyframes waveBob        { from, to { transform: none; } }
        }
      `}</style>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────
   PROJECT THEMES DEFINITIONS
───────────────────────────────────────────────────────────────── */
export type ProjectThemeId = 'cobalt' | 'midnight' | 'emerald' | 'violet' | 'amber';

export interface ProjectThemeConfig {
  id: ProjectThemeId;
  name: string;
  subtitle: string;
  heroBg: string;
  primaryBtn: string;
  secondaryBtn: string;
  primaryText: string;
  badgeBg: string;
  badgeText: string;
  accentGradient: string;
  swatchHex: string;
}

export const PROJECT_THEMES: Record<ProjectThemeId, ProjectThemeConfig> = {
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt Signature',
    subtitle: 'Classic INFEPOS Blue',
    heroBg: 'bg-blue-600',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondaryBtn: 'bg-white text-blue-600 hover:bg-blue-50',
    primaryText: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200/60',
    badgeText: 'text-blue-600',
    accentGradient: 'from-blue-600 via-sky-500 to-indigo-600',
    swatchHex: '#2563eb',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Cyber',
    subtitle: 'Ultra Sleek Dark POS',
    heroBg: 'bg-slate-950',
    primaryBtn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold',
    secondaryBtn: 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30',
    primaryText: 'text-cyan-400',
    badgeBg: 'bg-slate-900 border-cyan-500/30',
    badgeText: 'text-cyan-400',
    accentGradient: 'from-cyan-400 via-sky-400 to-blue-500',
    swatchHex: '#0f172a',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Fresh',
    subtitle: 'Supermarket & Retail',
    heroBg: 'bg-emerald-600',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondaryBtn: 'bg-white text-emerald-700 hover:bg-emerald-50',
    primaryText: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200/60',
    badgeText: 'text-emerald-700',
    accentGradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    swatchHex: '#059669',
  },
  violet: {
    id: 'violet',
    name: 'Royal Violet',
    subtitle: 'Boutique & Luxury Retail',
    heroBg: 'bg-indigo-700',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondaryBtn: 'bg-white text-indigo-700 hover:bg-indigo-50',
    primaryText: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 border-indigo-200/60',
    badgeText: 'text-indigo-700',
    accentGradient: 'from-indigo-600 via-purple-500 to-pink-500',
    swatchHex: '#4f46e5',
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    subtitle: 'Cafe & Hospitality POS',
    heroBg: 'bg-amber-600',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    secondaryBtn: 'bg-white text-amber-700 hover:bg-amber-50',
    primaryText: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200/60',
    badgeText: 'text-amber-700',
    accentGradient: 'from-amber-500 via-orange-500 to-rose-500',
    swatchHex: '#d97706',
  },
};

/* ─────────────────────────────────────────────────────────────────
   DROPDOWN MENU ITEM SPECIFICATION
───────────────────────────────────────────────────────────────── */
export interface MenuItem {
  id: string;
  title: string;
  desc: string;
  badge: string;
  icon: React.FC<{ size?: number; className?: string }>;
  features?: string[];
  specs?: Record<string, string>;
  detailsTitle?: string;
  detailsContent?: string;
  ctaText?: string;
}

export const PRODUCTS_MENU_ITEMS: MenuItem[] = [
  {
    id: 'pos-till',
    title: 'POS Till Terminal App',
    desc: 'Ultra-fast offline point-of-sale desktop application for cashiers.',
    badge: '100% Offline',
    icon: Monitor,
    features: [
      'Sub-second barcode scanning and instant item lookup',
      '100% Offline mode — sales checkout never stops during internet outages',
      'ESC/POS thermal receipt printing & cash drawer auto-kick',
      'Split payment modes: Cash, Credit Card, UPI & Gift Vouchers',
      'Automatic background cloud sync upon internet reconnection'
    ],
    specs: {
      'Architecture': 'Electron / Native Windows & Android POS',
      'Database': 'Embedded SQLite local storage',
      'Print Protocol': 'ESC/POS & USB / Network Thermal Printers',
      'Latency': '0.04 seconds per scan'
    },
    detailsTitle: 'Shop Floor Performance Engine',
    detailsContent: 'Designed specifically for high-volume retail cash registers. Cashiers can process over 50 items per minute with zero lag or screen stutter.',
    ctaText: 'Download POS App'
  },
  {
    id: 'cloud-admin',
    title: 'Cloud Admin Dashboard',
    desc: 'Centralized multi-store management, live sales analytics & inventory.',
    badge: 'Cloud Control',
    icon: Laptop,
    features: [
      'Live sales monitoring across all store locations in real time',
      'Granular Role-Based Access Control (RBAC) & cashier session audit logs',
      'Comprehensive product catalog & pricing management',
      'Low-stock automated alerts & purchase order generation',
      'Financial revenue breakdown & downloadable tax reports'
    ],
    specs: {
      'Cloud Architecture': 'Microservices Node.js / React Admin',
      'Security': 'JWT + Multi-Factor Authentication',
      'Sync Frequency': 'Real-Time WebSocket & Auto-polling',
      'Uptime': '99.99% Cloud Availability'
    },
    detailsTitle: 'Real-Time Retail Command',
    detailsContent: 'Access your entire retail empire from any device. Monitor individual register shifts, review margins, and adjust prices remotely.',
    ctaText: 'Open Admin Dashboard'
  },
  {
    id: 'offline-sync',
    title: 'Offline Sync Engine',
    desc: 'Intelligent multi-master sync pipeline with zero data loss.',
    badge: 'Core Engine',
    icon: Cpu,
    features: [
      'Transactional FIFO mutation queue logged locally in SQLite',
      'Conflict-free Replicated Data Type (CRDT) merge strategy',
      'Encrypted AES-256 binary sync payload over HTTPS',
      'Automatic exponential backoff auto-retry mechanism',
      'Guaranteed zero duplicate sales & accurate stock deduction'
    ],
    specs: {
      'Storage': 'Local SQLite + IndexedDB fallback',
      'Encryption': 'AES-256 end-to-end payload encryption',
      'Bandwidth Efficiency': 'Compressed JSON binary batches',
      'Failover': 'Automatic offline queueing'
    },
    detailsTitle: 'Bulletproof Data Integrity',
    detailsContent: 'Even during internet downtime lasting days, the terminal maintains full transactional integrity and reconciles seamlessly when reconnected.',
    ctaText: 'Read Sync Tech Spec'
  },
  {
    id: 'inventory-multistore',
    title: 'Inventory & Multi-Store',
    desc: 'Store-to-store stock transfers, supplier POs & batch tracking.',
    badge: 'Multi-Location',
    icon: Package,
    features: [
      'Inter-store stock transfer workflows & receiving confirmation',
      'Batch number & expiry date tracking for perishable goods',
      'Supplier catalog management & automated Purchase Orders',
      'Barcode label generation & thermal sticker printing',
      'Real-time stock audit & inventory shrinkage reconciliation'
    ],
    specs: {
      'Stock Modes': 'FIFO / LIFO Batch Valuation',
      'Barcodes': 'EAN-13, UPC-A, QR Code, Code128',
      'Multi-Warehouse': 'Unlimited virtual & physical locations',
      'Audit Logging': 'Immutable stock ledger'
    },
    detailsTitle: 'Total Inventory Visibility',
    detailsContent: 'Prevent stockouts and reduce overstock with real-time stock transfer management between warehouses and front-of-house stores.',
    ctaText: 'Explore Inventory Features'
  },
  {
    id: 'hardware-peripherals',
    title: 'Hardware & Peripherals',
    desc: 'Certified compatibility with thermal printers, scanners & scales.',
    badge: 'Plug & Play',
    icon: HardDrive,
    features: [
      'Plug-and-play USB & Ethernet thermal printer integration',
      '1D / 2D Barcode & QR Code scanner support',
      'RS232 electronic weighing scale integration for grocery',
      'Automated RJ11 cash drawer kickoff on payment receipt',
      'Customer-facing pole display & dual-screen till support'
    ],
    specs: {
      'Printers': 'Epson, Star Micronics, TVS, Xprinter (80mm/58mm)',
      'Scanners': 'Honeywell, Zebra, Datalogic, Sunmi',
      'Scales': 'CAS, Mettler Toledo, ESSAE Weight Scale',
      'OS Support': 'Windows 10/11, Android 7+'
    },
    detailsTitle: 'Hardware Independence',
    detailsContent: 'Use your existing POS hardware without expensive vendor lock-in. INFEPOS works smoothly with standard retail peripherals.',
    ctaText: 'View Certified Hardware'
  }
];

export const USE_CASES_MENU_ITEMS: MenuItem[] = [
  {
    id: 'supermarket',
    title: 'Supermarkets & Grocery',
    desc: 'High-speed scanning, weight scale integration & batch expiry.',
    badge: 'High Volume',
    icon: ShoppingCart,
    features: [
      'Sub-second item scanning for fast cashier checkout queues',
      'Direct integration with electronic weighing scales for loose items',
      'Batch number & expiry date tracking with automatic discount alerts',
      'Bulk price tag printing & promotional scheme management'
    ],
    detailsTitle: 'Grocery & Supermarket POS System',
    detailsContent: 'Handle thousands of daily transactions effortlessly. Manage produce weights, multi-packs, and perishable expiration dates without slowing down lines.',
    ctaText: 'See Grocery Demo'
  },
  {
    id: 'fashion',
    title: 'Fashion & Apparel',
    desc: 'Size / color variant matrix, custom barcodes & loyalty points.',
    badge: 'Variant Matrix',
    icon: Tag,
    features: [
      'Multi-dimensional grid for Size (S/M/L/XL) & Color variants',
      'Custom garment tag & barcode label thermal printing',
      'Customer loyalty program & instant discount coupons',
      'Seasonal collection tagging & markdown management'
    ],
    detailsTitle: 'Fashion Boutique Management',
    detailsContent: 'Manage complex clothing matrix stock easily. Keep track of customer purchase history and run personalized loyalty rewards.',
    ctaText: 'See Fashion Demo'
  },
  {
    id: 'electronics',
    title: 'Electronics & Hardware',
    desc: 'Serial number tracking, warranty logs & repair work orders.',
    badge: 'Serial Numbers',
    icon: Boxes,
    features: [
      'Individual serial number tracking for high-value items',
      'Warranty card generation & purchase invoice archiving',
      'Customer repair service work order logging & status updates',
      'Part inventory management & technician shift logs'
    ],
    detailsTitle: 'Electronics & Gadget Store POS',
    detailsContent: 'Track every high-value item from supplier arrival to customer serial registration, ensuring seamless warranty support.',
    ctaText: 'See Electronics Demo'
  },
  {
    id: 'franchise',
    title: 'Multi-Store Franchises',
    desc: 'Central catalog control, inter-store transfers & store reports.',
    badge: 'Chain Scale',
    icon: Building2,
    features: [
      'Centralized master catalog with regional price overrides',
      'Store-to-store inventory transfer requests & approvals',
      'Consolidated chain revenue reports & store comparison analytics',
      'Multi-tenant role permissions for store managers & franchise owners'
    ],
    detailsTitle: 'Franchise & Chain Retail Engine',
    detailsContent: 'Scale from 5 to 500 stores with central governance. Maintain brand consistency while allowing localized store stock management.',
    ctaText: 'See Franchise Demo'
  },
  {
    id: 'cafe-qsr',
    title: 'Cafes & Quick Service',
    desc: 'Touch bill matrix, kitchen ticket printing & instant receipts.',
    badge: 'Fast Checkout',
    icon: Receipt,
    features: [
      'Visual touch grid menu with item add-ons & modifiers',
      'Instant Kitchen Display System (KDS) & Kitchen Order Ticket (KOT) printing',
      'Split payment processing & digital WhatsApp receipts',
      'Fast shift handovers & drawer cash reconciliation'
    ],
    detailsTitle: 'Quick Service & Cafe Billing',
    detailsContent: 'Keep counter queues moving fast during rush hours with intuitive touch-screen order entry and instant kitchen ticket routing.',
    ctaText: 'See Cafe Demo'
  }
];

export const RESOURCES_MENU_ITEMS: MenuItem[] = [
  {
    id: 'doc-manual',
    title: 'Documentation & Guides',
    desc: 'Complete step-by-step cashier setup & admin user manuals.',
    badge: 'User Manual',
    icon: FileText,
    features: [
      'Cashier terminal quick-start training guide',
      'Admin dashboard setup & multi-store configuration',
      'Thermal printer & scanner installation tutorials',
      'Offline sync troubleshooting & network setup'
    ],
    detailsTitle: 'Comprehensive Knowledge Base',
    detailsContent: 'Everything you need to onboard cashiers, store managers, and IT administrators in minutes with step-by-step guides.',
    ctaText: 'Open Documentation'
  },
  {
    id: 'api-hub',
    title: 'API & Developer Hub',
    desc: 'REST API endpoints, webhooks & custom ERP integrations.',
    badge: 'Developer API',
    icon: FileCode,
    features: [
      'REST API endpoints for products, orders, inventory & customers',
      'Real-time webhook events for sale completion & stock updates',
      'OAuth2 / JWT secure API key authentication',
      'SDK & sample code for SAP, Tally, Zoho & Odoo integration'
    ],
    detailsTitle: 'Extensible Retail APIs',
    detailsContent: 'Connect INFEPOS to your existing ERP, e-commerce storefront, or custom loyalty software with clean RESTful endpoints.',
    ctaText: 'View API Spec'
  },
  {
    id: 'sys-arch',
    title: 'System Architecture',
    desc: 'Deep dive into local SQLite, cloud PostgreSQL & security.',
    badge: 'Architecture',
    icon: Server,
    features: [
      'Local-first SQLite database architecture on POS terminals',
      'Cloud PostgreSQL master cluster with continuous replication',
      'AES-256 payload encryption & HTTPS TLS 1.3 transport security',
      'Zero trust RBAC security framework with audit trail logging'
    ],
    detailsTitle: 'Enterprise System Architecture',
    detailsContent: 'Built on modern local-first principles to ensure maximum performance, fault tolerance, and absolute data safety.',
    ctaText: 'Read Whitepaper'
  },
  {
    id: 'hw-compatibility',
    title: 'Hardware Compatibility',
    desc: 'List of certified thermal printers, scanners & POS terminals.',
    badge: 'Certified HW',
    icon: HardDrive,
    features: [
      'Tested 80mm & 58mm thermal receipt printer list',
      'Supported 1D/2D handheld & hands-free barcode scanners',
      'Compatible Windows all-in-one touch POS terminals',
      'Certified Android POS handheld terminals with built-in printers'
    ],
    detailsTitle: 'Hardware Compatibility Matrix',
    detailsContent: 'Verify if your current retail receipt printers, scanners, or cash drawers are ready for instant plug-and-play operation.',
    ctaText: 'Check Hardware List'
  },
  {
    id: 'release-notes',
    title: 'Release Notes & Changelog',
    desc: 'Latest features, performance patches & terminal updates.',
    badge: 'v2.4 Live',
    icon: Sparkles,
    features: [
      'v2.4.0 — Enhanced sub-second barcode search algorithm',
      'v2.3.8 — Added multi-currency payment settlement mode',
      'v2.3.0 — Offline sync engine memory usage reduced by 40%',
      'v2.2.5 — Thermal receipt print layout builder update'
    ],
    detailsTitle: 'Continuous Software Updates',
    detailsContent: 'We continuously ship speed improvements, security updates, and new retail tools to all active INFEPOS terminals.',
    ctaText: 'View Full Changelog'
  }
];

/* ─────────────────────────────────────────────────────────────────
   INTERACTIVE MODAL COMPONENT (Product / UseCase / Resource / Enterprise / Pricing)
───────────────────────────────────────────────────────────────── */
const InteractiveModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  type: 'product' | 'use-case' | 'resource' | 'enterprise' | 'pricing';
  itemData?: MenuItem | null;
  currentTheme: ProjectThemeConfig;
  navigate: (path: string) => void;
}> = ({ isOpen, onClose, title, subtitle, badge, type, itemData, currentTheme, navigate }) => {
  const [storeCount, setStoreCount] = useState(5);
  const [terminalCount, setTerminalCount] = useState(15);
  const [deploymentMode, setDeploymentMode] = useState<'cloud' | 'on-premise'>('cloud');
  const [slaTier] = useState<'standard' | 'premium' | 'mission-critical'>('premium');

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'business' | 'enterprise'>('business');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthlyEstimate = (storeCount * 1200) + (terminalCount * 600) + (deploymentMode === 'on-premise' ? 5000 : 0) + (slaTier === 'mission-critical' ? 4000 : 1500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-300 my-auto">
        <div className={`p-8 sm:p-10 ${currentTheme.heroBg} text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              {badge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles size={13} /> {badge}
                </span>
              )}
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-base sm:text-lg text-white/80 font-light mt-2 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 sm:p-10 max-h-[70vh] overflow-y-auto">
          {(type === 'product' || type === 'use-case' || type === 'resource') && itemData && (
            <div className="space-y-8">
              <div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{itemData.detailsTitle || 'Key Capabilities'}</h4>
                <p className="text-slate-600 leading-relaxed text-base font-normal">
                  {itemData.detailsContent || itemData.desc}
                </p>
              </div>

              {itemData.features && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Core Features</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {itemData.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                        <CheckCircle2 size={18} className={`${currentTheme.primaryText} mt-0.5 flex-shrink-0`} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {itemData.specs && (
                <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800">
                  <h5 className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                    <Cpu size={15} /> System & Hardware Specifications
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    {Object.entries(itemData.specs).map(([k, v]) => (
                      <div key={k} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                        <div className="text-slate-400 mb-1 font-sans">{k}</div>
                        <div className="text-white font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Verified for INFEPOS v2.4 Enterprise Release</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-full text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      if (itemData.id === 'cloud-admin') navigate('/login');
                      else alert(`Accessing ${itemData.title}...`);
                    }}
                    className={`px-7 py-3 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105 ${currentTheme.primaryBtn}`}
                  >
                    {itemData.ctaText || 'Get Started Now'} &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {type === 'enterprise' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">Number of Store Locations</label>
                      <span className={`text-base font-extrabold ${currentTheme.primaryText}`}>{storeCount} Stores</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={storeCount}
                      onChange={(e) => setStoreCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">POS Terminals per Store</label>
                      <span className={`text-base font-extrabold ${currentTheme.primaryText}`}>{terminalCount} Terminals</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={terminalCount}
                      onChange={(e) => setTerminalCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-2">Deployment Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDeploymentMode('cloud')}
                        className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all ${
                          deploymentMode === 'cloud'
                            ? `${currentTheme.badgeBg} ${currentTheme.badgeText} border-blue-500 shadow-sm`
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div>☁️ Managed SaaS</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">High availability cloud</div>
                      </button>

                      <button
                        onClick={() => setDeploymentMode('on-premise')}
                        className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all ${
                          deploymentMode === 'on-premise'
                            ? `${currentTheme.badgeBg} ${currentTheme.badgeText} border-blue-500 shadow-sm`
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div>🏢 On-Premise</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">Self-hosted server node</div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between border border-slate-800 shadow-xl">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Enterprise Quote Summary</span>
                    <div className="mt-4 mb-6">
                      <div className="text-4xl font-extrabold text-white">
                        ₹{monthlyEstimate.toLocaleString()}<span className="text-base font-normal text-slate-400">/month</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Includes unlimited offline sync & multi-store admin</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800 text-xs font-medium text-slate-300">
                      <div className="flex justify-between">
                        <span>Store Locations:</span>
                        <span className="text-white font-bold">{storeCount} Stores</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Terminals:</span>
                        <span className="text-white font-bold">{terminalCount} Terminals</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deployment:</span>
                        <span className="text-white font-bold capitalize">{deploymentMode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => {
                        alert(`RFP Quote requested for ${storeCount} stores & ${terminalCount} terminals! Our enterprise team will contact you within 1 hour.`);
                        onClose();
                      }}
                      className={`w-full py-4 rounded-full font-bold text-sm shadow-xl transition-all hover:scale-105 ${currentTheme.primaryBtn}`}
                    >
                      Request Enterprise RFP Quote &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'pricing' && (
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
                <button
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                  className="w-14 h-8 bg-slate-900 rounded-full p-1 relative transition-colors"
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${billingCycle === 'annual' ? 'translate-x-6 bg-amber-400' : 'translate-x-0'}`} />
                </button>
                <span className={`text-sm font-bold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-400'}`}>
                  Annual <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-extrabold">Save 20%</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 'starter',
                    name: 'Starter',
                    price: billingCycle === 'annual' ? '₹2,399' : '₹2,999',
                    period: '/mo',
                    desc: 'Ideal for 1 store register',
                    features: ['1 POS Terminal', '1 Store Location', 'Offline Sync Engine', 'Standard Reports']
                  },
                  {
                    id: 'business',
                    name: 'Business',
                    price: billingCycle === 'annual' ? '₹7,199' : '₹8,999',
                    period: '/mo',
                    desc: 'Perfect for growing multi-stores',
                    popular: true,
                    features: ['Up to 5 Terminals', '5 Store Locations', 'Real-Time Admin Analytics', '24/7 Support']
                  },
                  {
                    id: 'enterprise',
                    name: 'Enterprise',
                    price: 'Custom',
                    period: '',
                    desc: 'Large chains & franchises',
                    features: ['Unlimited Terminals', 'Unlimited Locations', 'Dedicated Cloud Node', 'Custom ERP Connector']
                  }
                ].map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as any)}
                    className={`relative rounded-3xl p-6 border transition-all cursor-pointer ${
                      selectedPlan === plan.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xl ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full tracking-wider">
                        Most Popular
                      </span>
                    )}
                    <h5 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h5>
                    <div className="text-3xl font-extrabold text-slate-950 mb-1">{plan.price}<span className="text-sm font-normal text-slate-500">{plan.period}</span></div>
                    <p className="text-xs text-slate-500 mb-6">{plan.desc}</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">✨ Includes 14-day free trial. Zero credit card required.</span>
                <button
                  onClick={() => {
                    alert(`Starting free trial for ${selectedPlan.toUpperCase()} plan (${billingCycle} billing)...`);
                    onClose();
                  }}
                  className={`px-8 py-3.5 rounded-full font-bold text-sm shadow-xl transition-all hover:scale-105 ${currentTheme.primaryBtn}`}
                >
                  Start Free Trial &rarr;
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STAT COUNTER COMPONENT
───────────────────────────────────────────────────────────────── */
const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center px-8 py-6">
    <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-2 tracking-tight">{value}</div>
    <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────────────────── */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);

  // Theme State
  const [themeId] = useState<ProjectThemeId>('cobalt');
  const currentTheme = PROJECT_THEMES[themeId];

  // Navigation Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal State
  const [activeModal, setActiveModal] = useState<'product' | 'use-case' | 'resource' | 'enterprise' | 'pricing' | null>(null);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalBadge, setModalBadge] = useState('');

  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setPastHero(rect.bottom <= 75);
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleMouseEnterDropdown = (menuName: string) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setActiveDropdown(menuName);
  };

  const handleMouseLeaveDropdown = () => {
    leaveTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleMenuClick = (menuName: string) => {
    setActiveDropdown(activeDropdown === menuName ? null : menuName);
  };

  const openModalWithItem = (type: 'product' | 'use-case' | 'resource', item: MenuItem) => {
    setModalItem(item);
    setModalTitle(item.title);
    setModalSubtitle(item.desc);
    setModalBadge(item.badge);
    setActiveModal(type);
    setActiveDropdown(null);
  };

  const openModalType = (type: 'enterprise' | 'pricing') => {
    setModalItem(null);
    if (type === 'enterprise') {
      setModalTitle('Enterprise Custom Deployment');
      setModalSubtitle('Estimate your multi-store architecture & request a custom proposal');
      setModalBadge('Enterprise SLA');
    } else {
      setModalTitle('Choose your INFEPOS Plan');
      setModalSubtitle('Flexible plans for single stores and multi-location retail chains');
      setModalBadge('14-Day Free Trial');
    }
    setActiveModal(type);
    setActiveDropdown(null);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">

      {/* ── 1. NAVBAR (Logo left, center nav pill box with themes & dropdowns, buttons right) ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${pastHero
            ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm py-3'
            : 'bg-transparent py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 flex-shrink-0 group">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-base transition-all duration-300 ${pastHero ? `${currentTheme.primaryBtn} shadow-sm` : 'bg-white text-blue-600 shadow-md group-hover:scale-105'
                }`}
            >
              I
            </div>
            <InfeposLogoText textSize="text-xl" isHeroTheme={!pastHero} />
          </a>

          {/* Center Floating Pill Menu with Functional Dropdowns */}
          <nav
            className={`hidden md:flex items-center gap-1.5 px-5 py-2 rounded-full transition-all duration-300 relative ${pastHero
                ? 'bg-slate-100/90 border border-slate-200/80 text-slate-700 shadow-sm'
                : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-lg shadow-blue-950/20'
              }`}
          >
            {/* 1. Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnterDropdown('products')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button
                onClick={() => handleMenuClick('products')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeDropdown === 'products'
                    ? pastHero ? 'bg-slate-200 text-slate-900' : 'bg-white/25 text-white'
                    : pastHero ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                <span>Products</span>
                <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'products' && (
                <div className="absolute top-full left-0 mt-3 w-96 bg-white rounded-3xl p-3 shadow-2xl border border-slate-200/80 text-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">INFEPOS Platform Modules</p>
                  </div>
                  <div className="space-y-1">
                    {PRODUCTS_MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => openModalWithItem('product', item)}
                          className="flex items-start gap-3 p-3 rounded-2xl hover:bg-blue-50/80 transition-all cursor-pointer group"
                        >
                          <div className={`w-9 h-9 rounded-xl ${currentTheme.badgeBg} ${currentTheme.primaryText} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">{item.badge}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Use Cases Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnterDropdown('useCases')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button
                onClick={() => handleMenuClick('useCases')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeDropdown === 'useCases'
                    ? pastHero ? 'bg-slate-200 text-slate-900' : 'bg-white/25 text-white'
                    : pastHero ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                <span>Use Cases</span>
                <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeDropdown === 'useCases' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'useCases' && (
                <div className="absolute top-full left-0 mt-3 w-96 bg-white rounded-3xl p-3 shadow-2xl border border-slate-200/80 text-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Retail Industry Verticals</p>
                  </div>
                  <div className="space-y-1">
                    {USE_CASES_MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => openModalWithItem('use-case', item)}
                          className="flex items-start gap-3 p-3 rounded-2xl hover:bg-emerald-50/80 transition-all cursor-pointer group"
                        >
                          <div className={`w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{item.title}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">{item.badge}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pricing */}
            <button
              onClick={() => {
                scrollToSection('pricing');
                openModalType('pricing');
              }}
              className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                pastHero
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              Pricing
            </button>

            {/* 4. Enterprise */}
            <button
              onClick={() => {
                scrollToSection('enterprise');
                openModalType('enterprise');
              }}
              className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                pastHero
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              Enterprise
            </button>

            {/* 5. Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnterDropdown('resources')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button
                onClick={() => handleMenuClick('resources')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeDropdown === 'resources'
                    ? pastHero ? 'bg-slate-200 text-slate-900' : 'bg-white/25 text-white'
                    : pastHero ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                <span>Resources</span>
                <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'resources' && (
                <div className="absolute top-full right-0 mt-3 w-96 bg-white rounded-3xl p-3 shadow-2xl border border-slate-200/80 text-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentation & Tools</p>
                  </div>
                  <div className="space-y-1">
                    {RESOURCES_MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => openModalWithItem('resource', item)}
                          className="flex items-start gap-3 p-3 rounded-2xl hover:bg-indigo-50/80 transition-all cursor-pointer group"
                        >
                          <div className={`w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{item.title}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">{item.badge}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md ${pastHero
                  ? `${currentTheme.primaryBtn} shadow-blue-600/20`
                  : 'bg-white text-blue-600 hover:bg-blue-50 shadow-black/10'
                }`}
            >
              <LogIn size={14} />
              <span>Admin Login</span>
            </button>

            <button
              onClick={() => alert('Downloading INFEPOS Terminal...')}
              className={`hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg ${pastHero
                  ? 'bg-slate-900 text-white hover:bg-black'
                  : 'bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-xl shadow-black/30'
                }`}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION (Dynamic theme background color: bg-blue-600, bg-slate-950, bg-emerald-600, bg-indigo-700, bg-amber-600) ── */}
      <section
        ref={heroRef}
        className={`relative w-full min-h-screen ${currentTheme.heroBg} transition-colors duration-500 flex flex-col items-center justify-start pt-36 pb-0 overflow-hidden`}
      >
        {/* Animated particle canvas */}
        <ParticleCanvas />

        {/* Subtle center glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-6xl mx-auto">
          {/* Top badge — Introducing INFEPOS */}
          <div className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-white tracking-wide mb-6 [text-shadow:0_0_12px_rgba(99,102,241,0.5)]">
            <span>Introducing</span>
            {/* <InfeposLogoText textSize="text-base sm:text-lg" isHeroTheme={true} /> */}
            <span>&nbsp; Offline-First POS</span>
          </div>

          {/* Main logo label */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md">
              <span className="text-blue-600 font-extrabold text-lg">I</span>
            </div>
            <InfeposLogoText textSize="text-2xl sm:text-3xl" isHeroTheme={true} />
          </div>

          {/* Hero headline */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-white leading-[1.02] mb-8 max-w-5xl">
            Experience liftoff with the next-gen POS platform
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-blue-100/90 font-light max-w-2xl leading-relaxed mb-12">
            Process sales offline, manage your business from the cloud, and scale across locations / all in one system.
          </p>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <button
              onClick={() => alert('Downloading INFEPOS Terminal App...')}
              className="flex items-center gap-2.5 px-9 py-4 bg-black/45 hover:bg-black/65 text-white border border-white/20 hover:border-white/35 backdrop-blur-xl rounded-full font-semibold text-base shadow-2xl shadow-black/40 transition-all hover:scale-105 hover:-translate-y-0.5"
            >
              Download App <Download size={18} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 px-9 py-4 bg-white text-slate-900 rounded-full font-semibold text-base shadow-2xl hover:bg-slate-50 transition-all hover:scale-105 hover:-translate-y-0.5"
            >
              Explore Admin <LogIn size={18} className="text-blue-600" />
            </button>
          </div>
        </div>

        {/* Hero Showcase — Crisp transparent PNG directly below CTA buttons */}
        <div className="relative z-10 w-full flex justify-center items-center overflow-hidden pt-0 pb-0">
          <div className="relative max-w-7xl w-full px-2 flex justify-center">
            {/* Subtle ambient glow behind hardware */}
            <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-3xl transform scale-95 pointer-events-none" />

            <img
              src="/hero-transparent.png"
              alt="INFEPOS POS Terminal and Admin Dashboard Showcase"
              className="relative z-10 w-full max-w-6xl h-auto object-contain transform hover:scale-[1.01] transition-transform duration-700 ease-out drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── 2b. ICON WAVE STRIP ── */}
      <IconWaveStrip />

      {/* ── 3. PRODUCT CAPABILITIES BANNER ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          <StatCard value="100%" label="Offline Capability" />
          <StatCard value="0 ms" label="Checkout Latency" />
          <StatCard value="Auto" label="Cloud Sync" />
          <StatCard value="Multi" label="Store Management" />
        </div>
      </section>

      {/* ── 3b. PRODUCT SHOWCASE (Antigravity Style: Left info, Right image card) ── */}
      <section id="showcase" className="py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-32">

          {/* Product 1: INFEPOS Admin Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Text & Details */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                Cloud Command Center
              </span>
              <TypewriterHeading
                text="INFEPOS Admin Dashboard"
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight min-h-[3.5rem]"
              />
              <p className="text-lg text-slate-600 font-normal leading-relaxed">
                Your centralized cloud command center to manage your entire retail network. Track multi-store sales live, automate inventory stock control, manage staff permissions (RBAC), and review detailed financial reports from anywhere.
              </p>
              <ul className="space-y-3 pt-2 text-slate-700 text-sm font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>Real-time multi-store analytics & revenue tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>Granular inventory control & low-stock alerts</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>Role-based staff access & audit logs</span>
                </li>
              </ul>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="px-7 py-3.5 bg-blue-600 text-white rounded-full font-semibold text-sm shadow-md hover:bg-blue-700 transition-all hover:scale-105"
                >
                  Open Admin Dashboard &rarr;
                </button>
              </div>
            </div>

            {/* Right: Card Container with Picture */}
            <div className="lg:col-span-7">
              <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/50 p-6 md:p-8 border border-slate-200/80 shadow-2xl overflow-hidden group hover:shadow-blue-500/10 transition-all duration-500">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/60 bg-white group-hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src="/hero-admin.png"
                    alt="INFEPOS Admin Dashboard Interface"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product 2: INFEPOS Till App */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Text & Details */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                Point of Sale Terminal
              </span>
              <TypewriterHeading
                text="INFEPOS Till App"
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight min-h-[3.5rem]"
              />
              <p className="text-lg text-slate-600 font-normal leading-relaxed">
                The ultra-fast, offline-first point-of-sale terminal built for cashiers. Process sales without internet interruptions, scan barcodes instantly, print receipts, and auto-sync transactions seamlessly when online.
              </p>
              <ul className="space-y-3 pt-2 text-slate-700 text-sm font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>100% Offline operation — zero sales downtime</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>Sub-second barcode scanning & quick checkout</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                  <span>Instant background sync with cloud servers</span>
                </li>
              </ul>
              <div className="pt-4">
                <button
                  onClick={() => alert('Downloading INFEPOS Terminal App...')}
                  className="px-7 py-3.5 bg-slate-900 text-white rounded-full font-semibold text-sm shadow-md hover:bg-black transition-all hover:scale-105"
                >
                  Download Till App &rarr;
                </button>
              </div>
            </div>

            {/* Right: Card Container with Picture */}
            <div className="lg:col-span-7">
              <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 md:p-8 border border-slate-800 shadow-2xl overflow-hidden group hover:shadow-blue-500/10 transition-all duration-500">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-900 group-hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src="/hero-pos.png"
                    alt="INFEPOS Till App Point of Sale Interface"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. BENTO FEATURE GRID ── */}
      <section id="products" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-3xl">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-4">The Platform</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
              Everything retail. All in one place.
            </h2>
            <p className="text-xl text-slate-500 font-light leading-relaxed flex items-center gap-1.5 flex-wrap">
              <InfeposLogoText textSize="text-xl" isHeroTheme={false} /> unifies your in-store POS, cloud admin, and offline sync into one beautifully integrated system.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large card */}
            <div className="md:col-span-2 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl group">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Wifi size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Offline-First Architecture</h3>
              <p className="text-slate-500 text-lg font-light leading-relaxed max-w-lg">
                Never lose a sale. Our POS terminal processes transactions locally and auto-syncs the moment connectivity is restored, seamlessly.
              </p>
              <a href="#" className="mt-8 inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all">
                Learn more <ArrowRight size={16} />
              </a>
            </div>

            <div className="bg-blue-600 rounded-[2.5rem] p-10 border border-blue-500 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl text-white">
              <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-8">
                <BarChart3 size={28} />
              </div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">Real-Time Analytics</h3>
              <p className="text-blue-100 text-lg font-light leading-relaxed">
                Live dashboards, sales trends, and inventory health at a glance. Data your team can act on immediately.
              </p>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl text-white">
              <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-8">
                <Lock size={28} />
              </div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">Enterprise Security</h3>
              <p className="text-slate-400 text-lg font-light leading-relaxed">
                JWT auth, RBAC, encrypted sync, and audit logs. Built for regulated industries.
              </p>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl group">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <RefreshCw size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Auto Sync</h3>
              <p className="text-slate-500 text-lg font-light leading-relaxed">
                Intelligent background synchronization across all terminals, stores, and devices without manual intervention.
              </p>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl group">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Multi-Tenant</h3>
              <p className="text-slate-500 text-lg font-light leading-relaxed">
                Fully isolated tenant environments. Manage a franchise of 1 or 10,000 stores from a single admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. SPLIT SCREEN — Admin Dashboard Spotlight ── */}
      <section id="use-cases" className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-6">Admin Dashboard</p>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-8">
                Total control. From anywhere.
              </h2>
              <p className="text-xl text-slate-500 font-light leading-relaxed mb-10">
                Manage products, staff, inventory, and reports across all your locations from one powerful cloud-based admin panel.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Multi-location inventory management',
                  'Staff roles & permissions control',
                  'Sales reporting & revenue analytics',
                  'Product catalog & pricing management',
                  'Shift management & session logs',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-slate-700 font-medium">
                    <CheckCircle2 size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-black transition-all hover:scale-105 shadow-xl"
              >
                Open Admin Dashboard <ArrowRight size={18} />
              </button>
            </div>

            <div className="relative">
              <div className="bg-blue-600 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700" />
                <div className="relative z-10 p-8 w-full">
                  {/* Mini admin UI mockup */}
                  <div className="bg-white/10 rounded-2xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/80 text-xs font-medium uppercase tracking-widest">Today's Revenue</span>
                      <TrendingUp size={14} className="text-green-400" />
                    </div>
                    <div className="text-white text-3xl font-bold">₹1,24,780</div>
                    <div className="text-green-400 text-sm mt-1">+18.4% vs yesterday</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Transactions', 'Products', 'Terminals'].map((label, i) => (
                      <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                        <div className="text-white font-bold text-lg">{['482', '1.2k', '12'][i]}</div>
                        <div className="text-white/60 text-xs mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-white/10 rounded-2xl p-4">
                    <div className="text-white/60 text-xs mb-2 uppercase tracking-widest">Recent Sales</div>
                    {['Coffee & Snack', 'Electronics', 'Apparel'].map((cat, i) => (
                      <div key={cat} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                        <span className="text-white text-sm">{cat}</span>
                        <span className="text-white/80 text-sm font-medium">₹{['480', '2,400', '960'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-2xl px-6 py-4 border border-slate-100">
                <div className="text-slate-900 font-bold text-sm">🟢 All 12 terminals</div>
                <div className="text-slate-500 text-xs">online & synced</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. SPLIT SCREEN — POS Terminal Spotlight ── */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center">
                <div className="p-8 w-full">
                  <div className="bg-slate-800 rounded-2xl p-4 mb-3">
                    <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">Cart</div>
                    {['Tx Organic Coffee', 'Tx Pastry', 'Mineral Water'].map((item, i) => (
                      <div key={item} className="flex justify-between py-1.5 border-b border-slate-700 last:border-0">
                        <span className="text-white text-sm">{item}</span>
                        <span className="text-slate-300 text-sm">₹{['180', '120', '40'][i]}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-1">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-green-400 font-bold">₹340</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-blue-600 text-white rounded-xl py-3 text-sm font-bold">Cash</button>
                    <button className="bg-slate-700 text-white rounded-xl py-3 text-sm font-bold">Card / UPI</button>
                  </div>
                  <div className="mt-2 bg-slate-800 rounded-xl p-3 text-center">
                    <div className="text-slate-400 text-xs">🔴 Offline Mode Active — Syncing when online</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-2xl px-6 py-4 border border-slate-100">
                <div className="text-slate-900 font-bold text-sm">⚡ Offline Mode</div>
                <div className="text-slate-500 text-xs">100% functional, no internet needed</div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-6">POS Terminal</p>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-8">
                Built for the shop floor.
              </h2>
              <p className="text-xl text-slate-500 font-light leading-relaxed mb-10">
                A blazing-fast desktop POS terminal that keeps selling even when your internet goes down. Tap, ring, and go.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Works 100% offline — no internet required',
                  'Barcode scanner & receipt printer support',
                  'Cash, card, and UPI payment modes',
                  'Customer loyalty & discount management',
                  'Auto-syncs when connectivity is restored',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-slate-700 font-medium">
                    <CheckCircle2 size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => alert('Downloading POS Terminal...')}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-500 transition-all hover:scale-105 shadow-xl"
              >
                Download POS App <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. ENTERPRISE PRICING SECTION ── */}
      <section id="pricing" className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-4">Pricing</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
              Simple, transparent pricing.
            </h2>
            <p className="text-xl text-slate-500 font-light max-w-2xl mx-auto">
              From a single store to a global enterprise. Scale confidently with predictable pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter', price: '₹2,999', period: '/mo', desc: 'Perfect for single-store owners.',
                features: ['1 POS Terminal', '1 Location', 'Basic Analytics', 'Email Support', '10,000 products'],
                cta: 'Get Started', bg: 'bg-white', border: 'border-slate-200', textColor: 'text-slate-900',
                btnClass: 'bg-slate-900 text-white hover:bg-black',
              },
              {
                name: 'Business', price: '₹8,999', period: '/mo', desc: 'Grow across multiple locations.',
                features: ['5 POS Terminals', '5 Locations', 'Advanced Analytics', 'Priority Support', 'Unlimited products'],
                cta: 'Start Free Trial', bg: 'bg-blue-600', border: 'border-blue-500', textColor: 'text-white',
                btnClass: 'bg-white text-blue-600 hover:bg-blue-50',
                badge: 'Most Popular',
              },
              {
                name: 'Enterprise', price: 'Custom', period: '', desc: 'For large chains & franchises.',
                features: ['Unlimited Terminals', 'Unlimited Locations', 'Custom Integrations', 'Dedicated SLA', 'White-label options'],
                cta: 'Contact Sales', bg: 'bg-white', border: 'border-slate-200', textColor: 'text-slate-900',
                btnClass: 'bg-slate-900 text-white hover:bg-black',
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-[2.5rem] p-10 border ${plan.bg} ${plan.border} hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                    {plan.badge}
                  </div>
                )}
                <div className={`text-sm font-semibold uppercase tracking-widest mb-4 ${plan.textColor === 'text-white' ? 'text-blue-200' : 'text-blue-600'}`}>{plan.name}</div>
                <div className={`text-5xl font-bold tracking-tight mb-1 ${plan.textColor}`}>{plan.price}<span className="text-2xl font-medium opacity-60">{plan.period}</span></div>
                <p className={`mb-8 font-light ${plan.textColor === 'text-white' ? 'text-blue-100' : 'text-slate-500'}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-10">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm font-medium ${plan.textColor === 'text-white' ? 'text-blue-100' : 'text-slate-700'}`}>
                      <CheckCircle2 size={16} className={plan.textColor === 'text-white' ? 'text-blue-200' : 'text-blue-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-4 rounded-full font-semibold transition-all hover:scale-105 ${plan.btnClass}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. BOTTOM CTA BANNER (Google Antigravity Dark Vortex Style) ── */}
      <section id="download" className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-black rounded-[3rem] p-12 md:p-20 text-white text-left overflow-hidden shadow-2xl border border-slate-800 min-h-[420px] flex flex-col justify-center">

            {/* Animated Concentric Vortex Canvas Background */}
            <VortexParticleCanvas />

            <div className="relative z-10 max-w-xl space-y-8">
              <TypewriterHeading
                text="Download INFEPOS POS Terminal"
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] min-h-[4rem]"
                isDarkTheme={true}
              />

              <p className="text-xl text-slate-400 font-light leading-relaxed">
                Experience liftoff with offline-first point-of-sale checkout, multi-store cloud management, and instant background sync.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => alert('Downloading INFEPOS Terminal for Windows...')}
                  className="px-8 py-4 bg-white text-slate-950 rounded-full font-semibold text-base shadow-2xl hover:bg-slate-100 transition-all hover:scale-105"
                >
                  Download for Windows
                </button>
                <button
                  onClick={() => alert('Downloading INFEPOS Terminal for Android/ARM64...')}
                  className="px-8 py-4 bg-white/10 text-white border border-white/20 backdrop-blur-xl rounded-full font-semibold text-base shadow-2xl hover:bg-white/20 transition-all hover:scale-105"
                >
                  Download for Android / POS
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. CONTACT SECTION ── */}
      <section id="enterprise" className="py-28 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-6">Contact</p>
              <h2 className="text-5xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
                Get in touch.
              </h2>
              <p className="text-xl text-slate-500 font-light leading-relaxed mb-12 max-w-md">
                Ready to upgrade your retail operations? Talk to our team about enterprise pricing, demos, and onboarding.
              </p>
              <div className="space-y-5">
                {[
                  { icon: <Mail size={20} />, text: 'sales@infynux.com' },
                  { icon: <Phone size={20} />, text: '+1 (800) 123-4567' },
                  { icon: <Globe size={20} />, text: 'www.infynux.com' },
                  { icon: <MapPin size={20} />, text: '100 Tech Hub Blvd, Suite 400' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-4 text-slate-700">
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
                    <span className="font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100">
              <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                    <input type="text" placeholder="John" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                    <input type="text" placeholder="Doe" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Work Email</label>
                  <input type="email" placeholder="john@company.com" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                  <input type="text" placeholder="Your Company" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                  <textarea rows={4} placeholder="How can we help?" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-full font-semibold text-base hover:bg-black transition-all hover:scale-[1.01] shadow-lg mt-2">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FOOTER (Google Antigravity Style) ── */}
      <footer className="bg-white border-t border-slate-100 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          {/* Top Row: Tagline Left, Product & Resources Columns Right */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            {/* Left: Tagline */}
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Experience liftoff
              </h3>
            </div>

            {/* Right: Link Columns */}
            <div className="grid grid-cols-2 gap-16 md:gap-24">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Product</h4>
                <ul className="space-y-2.5 text-sm font-medium text-slate-600">
                  <li><a href="#download" className="hover:text-slate-900 transition-colors">Download</a></li>
                  <li><a href="#products" className="hover:text-slate-900 transition-colors">Product</a></li>
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Docs</a></li>
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Changelog</a></li>
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Press</a></li>
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Releases</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Resources</h4>
                <ul className="space-y-2.5 text-sm font-medium text-slate-600">
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Blog</a></li>
                  <li><a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                  <li><a href="#use-cases" className="hover:text-slate-900 transition-colors">Use Cases</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Center Giant Branding Typography (Antigravity Style with stylish E and blue gradient POS) */}
          <div className="border-t border-slate-100 py-10 md:py-14 text-center select-none overflow-hidden">
            <h1 className="text-[14vw] md:text-[13vw] font-extrabold tracking-tighter text-slate-950 leading-none pointer-events-none transform hover:scale-[1.01] transition-transform duration-500 inline-flex items-center justify-center">
              <span>INF</span>
              <span className="font-serif italic bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 bg-clip-text text-transparent font-normal inline-block mx-[-0.01em] transform -rotate-3">E</span>
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">POS</span>
            </h1>
          </div>

          {/* Bottom Bar: Brand Left, Legal Links Right */}
          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-3">
              <InfeposLogoText textSize="text-sm" isHeroTheme={false} />
              <span>© {new Date().getFullYear()} Infynux Solutions. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-900 transition-colors">About Infynux</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Products</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            </div>
          </div>

        </div>
      </footer>

      {/* ── 11. INTERACTIVE POPUP MODAL ── */}
      <InteractiveModal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={modalTitle}
        subtitle={modalSubtitle}
        badge={modalBadge}
        type={activeModal || 'product'}
        itemData={modalItem}
        currentTheme={currentTheme}
        navigate={navigate}
      />
    </div>
  );
};

export default LandingPage;
