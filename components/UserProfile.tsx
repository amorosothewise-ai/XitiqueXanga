
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Save, Globe, Mail, Bell, Shield, Key, Clock, LogOut, Loader2, Camera, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfileData, updateUserPreferences, getActivityLogs } from '../services/userService';
import { uploadAvatar } from '../services/fileService';
import { UserProfile as UserProfileType, ActivityLog } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ImageCropper from './ImageCropper';
import ActivityLogViewer from './ActivityLogViewer';

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 flex items-center justify-between text-left"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {icon} {title}
        </h2>
        <ChevronDown className={`transition-transform duration-200 text-slate-500 dark:text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-8 pt-0 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
  );
};

const UserProfile: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const { user, logout } = useAuth();
  
  // Local state for form editing
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Security modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile(user);
      if (user.language && user.language !== language) {
          setLanguage(user.language);
      }
      setLogs(getActivityLogs());
    }
  }, [user]);

  // Reset image error when URL changes
  useEffect(() => {
    setImageLoadError(false);
  }, [profile?.photoUrl]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await updateUserProfileData(profile.id, {
        name: profile.name,
        email: profile.email,
        language: profile.language,
        photoUrl: profile.photoUrl
      });
      setLanguage(profile.language);
      addToast(t('profile.saved'), 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await updateUserPreferences(profile.id, {
        contributions: profile.notificationPreferences.contributions,
        payouts: profile.notificationPreferences.payouts,
        updates: profile.notificationPreferences.updates
      });
      addToast('Preferences updated', 'success');
    } catch (error) {
      addToast('Failed to update preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) {
        addToast("Please fill in all fields", "error");
        return;
    }
    
    setIsSaving(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addToast(t('profile.pass_updated'), 'success');
        setPasswordModalOpen(false);
        setCurrentPass('');
        setNewPass('');
    } catch (error: any) {
        console.error(error);
        addToast("Failed to change password.", "error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
    addToast('Logged out successfully', 'info');
  };

  const toggleNotification = (key: keyof UserProfileType['notificationPreferences']) => {
    if (!profile) return;
    setProfile((prev: UserProfileType | null) => prev ? ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key]
      }
    }) : null);
  };

  // --- Avatar Logic ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          
          if (file.size > 5 * 1024 * 1024) { 
              addToast("Image is too large (max 5MB)", 'error');
              return;
          }

          const reader = new FileReader();
          reader.onload = () => {
              setSelectedImageSrc(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
      // Reset input so selecting the same file works again
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
      if (!profile) return;
      
      setSelectedImageSrc(null); 
      setIsUploading(true);
      setImageLoadError(false); 
      
      try {
          const publicUrl = await uploadAvatar(profile.id, blob);
          
          // Optimistic update
          setProfile((prev: UserProfileType | null) => prev ? ({ ...prev, photoUrl: publicUrl }) : null);
          
          // Persist
          await updateUserProfileData(profile.id, { photoUrl: publicUrl });
          
          addToast('Avatar updated successfully', 'success');
      } catch (error: any) {
          console.error(error);
          const msg = error.message?.includes('Permission') 
            ? 'Permission denied. Check Firebase Storage Policies.' 
            : 'Failed to upload image';
          addToast(msg, 'error');
      } finally {
          setIsUploading(false);
      }
  };

  if (!profile) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Cropper Modal */}
        {selectedImageSrc && (
            <ImageCropper 
                imageSrc={selectedImageSrc} 
                onCancel={() => setSelectedImageSrc(null)}
                onCrop={handleCropComplete}
            />
        )}
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/png, image/jpeg, image/jpg" 
            className="hidden" 
        />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="relative group">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden ${!profile.photoUrl || imageLoadError ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'} shadow-lg relative`}>
                    {isUploading ? (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                            <Loader2 className="animate-spin text-white" />
                        </div>
                    ) : null}
                    
                    {profile.photoUrl && !imageLoadError ? (
                        <img 
                            src={profile.photoUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            onError={() => setImageLoadError(true)}
                        />
                    ) : (
                        profile.name.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                <button 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-full shadow border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors z-10"
                    title="Change Photo"
                >
                    <Camera size={16} />
                </button>
            </div>
            
            <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{profile.name || t('profile.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                {imageLoadError && (
                    <div className="flex items-center justify-center md:justify-start gap-1 mt-1 text-amber-500 text-xs font-medium">
                        <AlertCircle size={12} /> Image load failed (Check Bucket Policy)
                    </div>
                )}
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    <Clock size={12} />
                    {t('profile.last_login')} {new Date(profile.lastLogin || Date.now()).toLocaleDateString()}
                </div>
            </div>

            <button 
                onClick={() => setLogoutModalOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold shadow-sm transition-all flex items-center gap-2"
            >
                <LogOut size={18} className="text-rose-500" /> Log Out
            </button>
        </div>

        {/* Section 1: Personal Information */}
        <CollapsibleSection title={t('profile.personal_info')} icon={<User className="text-emerald-500" />} defaultOpen={true}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            {t('profile.label_name')}
                        </label>
                        <input 
                            type="text" 
                            value={profile.name} 
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                            className="w-full p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                             <Mail size={16} className="text-slate-400 dark:text-slate-500"/> {t('profile.label_email')}
                        </label>
                        <input 
                            type="email" 
                            value={profile.email || ''} 
                            disabled
                            className="w-full p-4 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-xl cursor-not-allowed font-medium"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Globe size={16} /> {t('profile.label_lang')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setProfile({...profile, language: 'pt'})}
                            className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                profile.language === 'pt' 
                                ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700' 
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-lg">🇲🇿</span> Português
                        </button>
                        <button 
                            onClick={() => setProfile({...profile, language: 'en'})}
                            className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                profile.language === 'en' 
                                ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700' 
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-lg">🇺🇸</span> English
                        </button>
                    </div>
                </div>
                
                <div className="flex justify-end pt-2">
                     <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('profile.save')}
                    </button>
                </div>
            </div>
        </CollapsibleSection>

        {/* Section 2: Notifications */}
        <CollapsibleSection title={t('profile.notifications')} icon={<Bell className="text-blue-500" />}>
            <div className="space-y-4">
                <ToggleRow 
                    label={t('profile.notif_contrib')}
                    isOn={profile.notificationPreferences.contributions}
                    onToggle={() => toggleNotification('contributions')}
                />
                <ToggleRow 
                    label={t('profile.notif_payout')}
                    isOn={profile.notificationPreferences.payouts}
                    onToggle={() => toggleNotification('payouts')}
                />
                <ToggleRow 
                    label={t('profile.notif_updates')}
                    isOn={profile.notificationPreferences.updates}
                    onToggle={() => toggleNotification('updates')}
                />
            </div>
            <div className="flex justify-end pt-2">
                 <button 
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('profile.save')}
                </button>
            </div>
        </CollapsibleSection>

        {/* Section 3: Security */}
        <CollapsibleSection title={t('profile.security')} icon={<Shield className="text-rose-500" />}>
            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full text-slate-400 shadow-sm"><Key size={20} /></div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">************</div>
                </div>
                <button 
                    onClick={() => setPasswordModalOpen(true)}
                    className="text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-4 py-2 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/50 bg-white dark:bg-slate-800"
                >
                    {t('profile.change_pass')}
                </button>
            </div>
        </CollapsibleSection>

        {/* Section 4: Audit Logs */}
        <CollapsibleSection title={t('profile.audit_log')} icon={<FileText className="text-slate-500" />}>
            <ActivityLogViewer logs={logs} />
        </CollapsibleSection>

        {/* Section 5: Danger Zone */}
        <CollapsibleSection title="Danger Zone" icon={<AlertCircle className="text-rose-500" />}>
            <div className="space-y-4">
                <p className="text-sm text-rose-700">Once you delete your account, there is no going back. Please be certain. All your data will be permanently removed.</p>
                <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white py-3 px-8 rounded-xl font-bold shadow-lg transition-all"
                >
                    Delete Account
                </button>
            </div>
        </CollapsibleSection>

        {/* Password Modal */}
        {passwordModalOpen && createPortal(
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in border dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">{t('profile.pass_modal_title')}</h3>
                    <div className="space-y-4 mb-6">
                        <input 
                            type="password" 
                            placeholder="Current Password" 
                            className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                            value={currentPass}
                            onChange={(e) => setCurrentPass(e.target.value)}
                        />
                        <input 
                            type="password" 
                            placeholder="New Password" 
                            className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPasswordModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-slate-600 dark:text-slate-300">Cancel</button>
                        <button onClick={handleChangePassword} disabled={isSaving} className="flex-1 py-3 bg-rose-600 font-bold rounded-xl text-white">
                            {isSaving ? 'Updating...' : 'Change'}
                        </button>
                    </div>
                </div>
            </div>,
            document.getElementById('root')!
        )}

        {/* Logout Modal */}
        <ConfirmationModal 
            isOpen={logoutModalOpen}
            onClose={() => setLogoutModalOpen(false)}
            onConfirm={handleLogout}
            title="Log Out?"
            description="You will need to sign in again to access your financial circles."
            type="danger"
            confirmText="Log Out"
        />

        {/* Delete Account Modal */}
        <ConfirmationModal 
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={() => {
                addToast("Account deletion is not currently available. Please contact support.", "info");
                setDeleteModalOpen(false);
            }}
            title="Delete Account?"
            description="Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost."
            type="danger"
            confirmText="Delete Account"
        />
    </div>
  );
};

// Helper Component for Toggle Switches
const ToggleRow: React.FC<{ label: string, isOn: boolean, onToggle: () => void }> = ({ label, isOn, onToggle }) => (
    <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button 
            onClick={onToggle}
            className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${isOn ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-transform transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

export default UserProfile;
