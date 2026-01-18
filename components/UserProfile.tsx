import React, { useState, useEffect } from 'react';
import { User, Save, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { getUserProfile, saveUserProfile } from '../services/storage';
import { UserProfile as UserProfileType } from '../types';

const UserProfile: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfileType>({
    id: 'guest',
    name: '',
    language: 'pt',
    avatarColor: 'bg-emerald-500'
  });

  useEffect(() => {
    const data = getUserProfile();
    setProfile(data);
    if (data.language && data.language !== language) {
        setLanguage(data.language);
    }
  }, []);

  const handleSave = () => {
    saveUserProfile(profile);
    setLanguage(profile.language);
    addToast(t('profile.saved'), 'success');
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-fade-in pb-12">
        <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${profile.avatarColor || 'bg-emerald-500'}`}>
                {profile.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('profile.title')}</h1>
                <p className="text-slate-500">{t('profile.subtitle')}</p>
            </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <User size={16} /> {t('profile.label_name')}
                </label>
                <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Globe size={16} /> {t('profile.label_lang')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setProfile({...profile, language: 'pt'})}
                        className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${
                            profile.language === 'pt' 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Português
                    </button>
                    <button 
                        onClick={() => setProfile({...profile, language: 'en'})}
                        className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${
                            profile.language === 'en' 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        English
                    </button>
                </div>
            </div>

            <div className="pt-4">
                <button 
                    onClick={handleSave}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                    <Save size={20} /> {t('profile.save')}
                </button>
            </div>
        </div>
    </div>
  );
};

export default UserProfile;