import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const InfeposLogoText: React.FC<{
  textSize?: string;
  isHeroTheme?: boolean;
}> = ({ textSize = 'text-xl', isHeroTheme = false }) => {
  return (
    <span className={`${textSize} font-extrabold tracking-tight inline-flex items-center`}>
      <span className={isHeroTheme ? 'text-white' : 'text-slate-950'}>INF</span>
      <span className={isHeroTheme ? 'text-sky-300' : 'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent'}>
        EPOS
      </span>
    </span>
  );
};

interface StaticPageProps {
  title: string;
}

const StaticPage: React.FC<StaticPageProps> = ({ title }) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <InfeposLogoText textSize="text-xl" isHeroTheme={false} />
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-full"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-24">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-8">
          {title}
        </h1>
        
        <div className="prose prose-slate prose-lg max-w-none">
          <p className="text-slate-600 text-xl leading-relaxed mb-6">
            Welcome to the <strong>{title}</strong> page for INFEPOS.
          </p>
          <p className="text-slate-500 leading-relaxed mb-6">
            This is a placeholder page. The detailed content for {title.toLowerCase()} will be provided and populated here soon. Please check back later.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 mt-12">
            <h3 className="text-blue-900 font-semibold text-lg mb-2">Need help?</h3>
            <p className="text-blue-700">
              If you have any urgent inquiries regarding {title.toLowerCase()}, please contact our support team at support@infynux.com.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Infynux Solutions. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default StaticPage;
