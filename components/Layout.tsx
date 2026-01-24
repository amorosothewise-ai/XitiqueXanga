import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PlusCircle, Calculator, Info, Settings, ChevronRight, Bell, X, Check, PiggyBank, ArrowLeft, Hexagon, TrendingUp, Moon, Sun, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { checkAndGenerateNotifications, markNotificationRead } from '../services/notificationService';
import { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onChangeView: (view: string) => void;
}

const BrandLogo = ({ size = 'normal' }: { size?: 'normal' | 'small' }) => (
  <div className={`flex items-center gap-2 ${size === 'small' ? 'scale-90' : ''}`}>
      <div className="relative flex items-center justify-center">
          <div className="bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-lg p-1.5 shadow-lg shadow-emerald-500/20">
              <Hexagon size={size === 'small' ? 20 : 24} className="text-white fill-emerald-500/20" strokeWidth={2.5} />
          </div>
          <TrendingUp size={size === 'small' ? 12 : 14} className="absolute text-white font-bold" />
      </div>
      <div>
          <h1 className={`font-extrabold tracking-tight text-white leading-none ${size === 'small' ? 'text-lg' : 'text-xl'}`}>
              Xitique <span className="text-emerald-400">Xanga</span>
          </h1>
      </div>
  </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activeView, onChangeView }) => {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Theme State
  const [isDark, setIsDark] = useState(false);

  // Check Environment Configuration
  useEffect(() => {
    const apiKey = process.env.API_KEY;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    // Check if keys are missing or still contain the placeholder text
    if (!apiKey || apiKey.includes('your_gemini_api_key')) {
        setConfigError("⚠️ Setup Required: Please add your real Gemini API Key to the .env file.");
    } else if (!supabaseKey || supabaseKey.includes('your_supabase_anon_key')) {
        setConfigError("⚠️ Setup Required: Please add your Supabase Anon Key to the .env file.");
    } else {
        setConfigError(null);
    }
  }, []);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Check saved theme or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
    }
  }, []); // Run once on mount

  // Initialize Notifications & Click Listeners
  useEffect(() => {
    checkAndGenerateNotifications().then(notifs => {
      setNotifications(notifs);
    });
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeView]);

  const toggleTheme = () => {
      if (isDark) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
          setIsDark(false);
      } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
          setIsDark(true);
      }
  };

  const handleMarkRead = (id: string) => {
    const updated = markNotificationRead(id);
    setNotifications(updated);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'pt' ? 'en' : 'pt');
  };

  const handleMobileBack = () => {
      if (activeView !== 'dashboard') {
          onChangeView('dashboard');
      }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      
      {/* Mobile Header - Sticky */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
            {activeView !== 'dashboard' ? (
                <button 
                    onClick={handleMobileBack} 
                    className="p-2 -ml-2 text-slate-300 hover:text-white rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
            ) : (
                <div className="w-2" />
            )}
            
            <BrandLogo size="small" />
        </div>
        <div className="flex items-center gap-2">
             <button 
                onClick={toggleTheme} 
                className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'text-yellow-400 hover:bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <button onClick={toggleLanguage} className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-full transition-colors font-bold text-xs flex items-center justify-center w-8 h-8 border border-slate-700">
                {language.toUpperCase()}
             </button>
             <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-full transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-1.5 right-2.5 bg-cyan-500 w-2 h-2 rounded-full ring-2 ring-slate-900"></span>}
             </button>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <nav className="hidden md:flex flex-col w-72 bg-slate-950 text-slate-300 h-screen fixed left-0 top-0 border-r border-slate-800 z-40 shadow-2xl">
        <div className="p-8">
          <BrandLogo />
          <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-11">
              Smart Rotation System
          </div>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
           {/* Section 1 */}
           <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Finance</div>
              <div className="space-y-1">
                <NavButton 
                    active={activeView === 'dashboard' || activeView === 'detail'} 
                    onClick={() => onChangeView('dashboard')} 
                    icon={<LayoutDashboard size={20} />} 
                    label={t('nav.dashboard')} 
                />
                <NavButton 
                    active={activeView === 'individual'} 
                    onClick={() => onChangeView('individual')} 
                    icon={<PiggyBank size={20} />} 
                    label={t('nav.individual')} 
                />
                 <NavButton 
                    active={activeView === 'simulation'} 
                    onClick={() => onChangeView('simulation')} 
                    icon={<Calculator size={20} />} 
                    label={t('nav.simulation')} 
                />
              </div>
           </div>

           {/* Section 2 */}
           <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">System</div>
              <div className="space-y-1">
                <NavButton 
                    active={activeView === 'info'} 
                    onClick={() => onChangeView('info')} 
                    icon={<Info size={20} />} 
                    label={t('nav.architecture')} 
                />
                <NavButton 
                    active={activeView === 'user'} 
                    onClick={() => onChangeView('user')} 
                    icon={<Settings size={20} />} 
                    label={t('nav.profile')} 
                />
              </div>
           </div>
           
           {/* CTA */}
           <div className="px-2 pt-4">
               <button 
                  onClick={() => onChangeView('create')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white p-3.5 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
               >
                   <PlusCircle size={20} className="group-hover:rotate-90 transition-transform"/>
                   <span>{t('nav.create')}</span>
               </button>
           </div>
        </div>
        
        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => onChangeView('user')}>
                <div className={`w-9 h-9 rounded-full ${user?.avatarColor || 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-slate-800 overflow-hidden`}>
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      user?.name.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{user?.name || 'Guest User'}</div>
                    <div className="text-xs text-slate-500 truncate">{language === 'pt' ? 'Conta Grátis' : 'Free Account'}</div>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
            </div>
            
            <div className="flex gap-2">
                 <button 
                    onClick={toggleTheme}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
                </button>
                 <button 
                    onClick={() => setShowNotif(!showNotif)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors relative"
                    title={t('nav.notifications')}
                >
                    <Bell size={16} />
                    {unreadCount > 0 && <span className="absolute top-2 right-3 w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>}
                </button>
                <button 
                    onClick={toggleLanguage}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors text-xs font-bold"
                >
                    {language.toUpperCase()}
                </button>
            </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      {activeView !== 'create' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center p-2">
            <MobileNavBtn active={activeView === 'dashboard' || activeView === 'detail'} onClick={() => onChangeView('dashboard')} icon={<LayoutDashboard size={24} />} />
            <MobileNavBtn active={activeView === 'individual'} onClick={() => onChangeView('individual')} icon={<PiggyBank size={24} />} />
            <div className="relative -top-6">
                <button 
                    onClick={() => onChangeView('create')}
                    className="bg-gradient-to-r from-emerald-500 to-cyan-600 text-white p-4 rounded-full shadow-xl shadow-emerald-200 hover:scale-105 transition-transform"
                >
                    <PlusCircle size={28} />
                </button>
            </div>
            <MobileNavBtn active={activeView === 'simulation'} onClick={() => onChangeView('simulation')} icon={<Calculator size={24} />} />
            <MobileNavBtn active={activeView === 'user'} onClick={() => onChangeView('user')} icon={<Settings size={24} />} />
            </div>
        </div>
      )}

      {/* Notifications Overlay */}
      {showNotif && (
          <div ref={notifRef} className="fixed top-16 right-4 md:left-72 md:top-auto md:bottom-24 md:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 animate-fade-in overflow-hidden ring-1 ring-black/5">
             <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bell size={16} className="text-emerald-600" /> {t('nav.notifications')}</h3>
                 <button onClick={() => setShowNotif(false)}><X size={16} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"/></button>
             </div>
             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">{t('nav.no_notifications')}</div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${!n.read ? 'bg-emerald-50/30 dark:bg-emerald-900/20' : ''}`}>
                             <div className="flex justify-between items-start mb-1">
                                 <h4 className={`text-sm font-bold ${n.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>{n.title}</h4>
                                 {!n.read && <button onClick={() => handleMarkRead(n.id)} title={t('nav.mark_read')}><Check size={14} className="text-emerald-500" /></button>}
                             </div>
                             <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">{n.message}</p>
                             <div className="text-[10px] text-slate-400 font-medium">{new Date(n.date).toLocaleDateString()}</div>
                        </div>
                    ))
                )}
             </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 w-full min-h-screen pb-24 md:pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">
        {configError && (
          <div className="bg-amber-500 text-white p-3 text-sm font-bold text-center flex items-center justify-center gap-2 shadow-md">
            <AlertTriangle size={18} />
            {configError}
          </div>
        )}
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

// Subcomponents
const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({
    active, onClick, icon, label
}) => (
    <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
      active
        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
    }`}
  >
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
    <span className={`mr-3 transition-colors ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const MobileNavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode}> = ({ active, onClick, icon }) => (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all ${active ? 'text-emerald-600 bg-emerald-50 scale-110 shadow-sm' : 'text-slate-400 dark:text-slate-500 active:scale-95'}`}>
        {icon}
    </button>
);

export default Layout;