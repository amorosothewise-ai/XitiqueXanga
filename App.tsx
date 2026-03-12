
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Wizard from './components/Wizard';
import XitiqueDetail from './components/XitiqueDetail';
import ArchitectureInfo from './components/ArchitectureInfo';
import UserProfile from './components/UserProfile';
import IndividualDashboard from './components/IndividualDashboard';
import AIGoalPlanner from './components/AIGoalPlanner';
import AboutTab from './components/AboutTab';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import AppTutorial from './components/AppTutorial';
import { useAuth } from './contexts/AuthContext';
import { Xitique } from './types';
import { deleteXitique, getUserPrefs, saveUserPrefs } from './services/storage';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'create' | 'detail' | 'info' | 'user' | 'individual' | 'planner' | 'about';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedXitique, setSelectedXitique] = useState<Xitique | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // State to hold data for renewal wizard
  const [renewalData, setRenewalData] = useState<Xitique | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
        const prefs = getUserPrefs();
        if (!prefs.onboardingCompleted) {
            setShowOnboarding(true);
        }
    }
  }, [isAuthenticated]);

  const completeOnboarding = () => {
      saveUserPrefs({ onboardingCompleted: true });
      setShowOnboarding(false);
      setShowTutorial(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (showOnboarding) {
      return <Onboarding onComplete={completeOnboarding} />;
  }

  const handleSelectXitique = (xitique: Xitique) => {
    setSelectedXitique(xitique);
    setCurrentView('detail');
  };

  const handleDeleteXitique = async () => {
    if (selectedXitique) {
        try {
            await deleteXitique(selectedXitique.id);
            setSelectedXitique(null);
            setCurrentView('dashboard');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Error deleting xitique:", error);
        }
    }
  };

  // Trigger renewal: Set data and switch to create/wizard view
  const handleRenewXitique = (xitique: Xitique) => {
      setRenewalData(xitique);
      setCurrentView('create');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            key={refreshKey}
            onCreate={() => {
                setRenewalData(null); // Ensure fresh wizard
                setCurrentView('create');
            }}
            onSelect={handleSelectXitique}
            onShowTutorial={() => setShowTutorial(true)}
          />
        );
      case 'create':
        return (
          <Wizard 
            initialData={renewalData}
            onComplete={() => {
                setRenewalData(null);
                setCurrentView('dashboard');
            }}
            onCancel={() => {
                setRenewalData(null);
                setCurrentView('dashboard');
            }}
          />
        );
      case 'detail':
        return selectedXitique ? (
          <XitiqueDetail 
            xitique={selectedXitique} 
            onBack={() => {
              setSelectedXitique(null);
              setCurrentView('dashboard');
            }}
            onDelete={handleDeleteXitique}
            onRenew={handleRenewXitique}
          />
        ) : (
          <Dashboard 
            onCreate={() => {
                setRenewalData(null);
                setCurrentView('create');
            }} 
            onSelect={handleSelectXitique} 
            onShowTutorial={() => setShowTutorial(true)}
          />
        );
      case 'individual':
          return <IndividualDashboard />;
      case 'planner':
          return <AIGoalPlanner />;
      case 'info':
        return <ArchitectureInfo />;
      case 'about':
        return <AboutTab />;
      case 'user':
        return <UserProfile />;
      default:
        return (
            <Dashboard 
                onCreate={() => {
                    setRenewalData(null);
                    setCurrentView('create');
                }} 
                onSelect={handleSelectXitique} 
                onShowTutorial={() => setShowTutorial(true)}
            />
        );
    }
  };

  return (
    <>
      {showTutorial && (
        <AppTutorial 
          onComplete={() => setShowTutorial(false)} 
          onClose={() => setShowTutorial(false)} 
        />
      )}
      <Layout activeView={currentView} onChangeView={(view) => setCurrentView(view as View)}>
        {renderContent()}
      </Layout>
    </>
  );
};

export default App;
