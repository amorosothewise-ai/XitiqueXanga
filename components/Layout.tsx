
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PlusCircle, Calculator, Info, Settings, ChevronRight, Bell, X, Check, PiggyBank } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { checkAndGenerateNotifications, markNotificationRead } from '../services/notificationService';
import { Notification, UserProfile } from '../types';
import { getUserProfile } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onChangeView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onChangeView }) => {
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Make async call
    checkAndGenerateNotifications().then(notifs => {
      setNotifications(notifs);
    });
    
    setUser(getUserProfile());

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

  const handleMarkRead = (id: string) => {
    const updated = markNotificationRead(id);
    setNotifications(updated);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'pt' ? 'en' : 'pt');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm">
               <img src="https://cdn-icons-png.flaticon.com/512/951/951971.png" alt="Xitique Xanga" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">{t('app.name')}</h1>
        </div>
        <div className="flex items-center gap-2">
             <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-1 right-2 bg-rose-500 w-2 h-2 rounded-full border border-white"></span>}
             </button>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <nav className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 h-screen fixed left-0 top-0 border-r border-slate-800 z-40">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-emerald-900/50 bg-white">
                <img src="https://cdn-icons-png.flaticon.com/512/951/951971.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">{t('app.name')}</h1>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Premium</span>
             </div>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
           {/* Section 1 */}
           <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Finance</div>
              <div className="space-y-1">
                <NavButton 
                    active={activeView === 'dashboard'} 
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
           <div className="px-2">
               <button 
                  onClick={() => onChangeView('create')}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white p-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
               >
                   <PlusCircle size={20} />
                   <span>{t('nav.create')}</span>
               </button>
           </div>
        </div>
        
        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => onChangeView('user')}>
                <div className={`w-9 h-9 rounded-full ${user?.avatarColor || 'bg-emerald-500'} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                    {user?.name.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{user?.name || 'Guest User'}</div>
                    <div className="text-xs text-slate-500 truncate">{language === 'pt' ? 'Conta Grátis' : 'Free Account'}</div>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
            </div>
            
            <div className="flex gap-2">
                 <button 
                    onClick={() => setShowNotif(!showNotif)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors relative"
                    title={t('nav.notifications')}
                >
                    <Bell size={16} />
                    {unreadCount > 0 && <span className="absolute top-2 right-3 w-2 h-2 bg-rose-500 rounded-full"></span>}
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
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex justify-around items-center p-2">
           <MobileNavBtn active={activeView === 'dashboard'} onClick={() => onChangeView('dashboard')} icon={<LayoutDashboard size={24} />} />
           <MobileNavBtn active={activeView === 'individual'} onClick={() => onChangeView('individual')} icon={<PiggyBank size={24} />} />
           <div className="relative -top-5">
              <button 
                onClick={() => onChangeView('create')}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200"
              >
                  <PlusCircle size={24} />
              </button>
           </div>
           <MobileNavBtn active={activeView === 'simulation'} onClick={() => onChangeView('simulation')} icon={<Calculator size={24} />} />
           <MobileNavBtn active={activeView === 'user'} onClick={() => onChangeView('user')} icon={<Settings size={24} />} />
        </div>
      </div>

      {/* Notifications Overlay */}
      {showNotif && (
          <div ref={notifRef} className="fixed top-16 right-4 md:left-72 md:top-auto md:bottom-24 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 animate-fade-in overflow-hidden ring-1 ring-black/5">
             <div className="p-4 bg-slate-50/80 backdrop-blur border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2"><Bell size={16} className="text-emerald-600" /> {t('nav.notifications')}</h3>
                 <button onClick={() => setShowNotif(false)}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
             </div>
             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">{t('nav.no_notifications')}</div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-emerald-50/30' : ''}`}>
                             <div className="flex justify-between items-start mb-1">
                                 <h4 className={`text-sm font-bold ${n.type === 'warning' ? 'text-amber-600' : 'text-slate-800'}`}>{n.title}</h4>
                                 {!n.read && <button onClick={() => handleMarkRead(n.id)} title={t('nav.mark_read')}><Check size={14} className="text-emerald-500" /></button>}
                             </div>
                             <p className="text-xs text-slate-600 mb-2 leading-relaxed">{n.message}</p>
                             <div className="text-[10px] text-slate-400 font-medium">{new Date(n.date).toLocaleDateString()}</div>
                        </div>
                    ))
                )}
             </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 mb-20 md:mb-0 pb-24 md:pb-8 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto">
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
    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
      active
        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full"></div>}
    <span className={`mr-3 transition-colors ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode}> = ({ active, onClick, icon }) => (
    <button onClick={onClick} className={`p-3 rounded-xl transition-colors ${active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
        {icon}
    </button>
);

export default Layout;
