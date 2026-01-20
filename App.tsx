
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Wizard from './components/Wizard';
import XitiqueDetail from './components/XitiqueDetail';
import Simulation from './components/Simulation';
import ArchitectureInfo from './components/ArchitectureInfo';
import UserProfile from './components/UserProfile';
import IndividualDashboard from './components/IndividualDashboard';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';
import { Xitique } from './types';
import { deleteXitique } from './services/storage';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'create' | 'detail' | 'simulation' | 'info' | 'user' | 'individual';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedXitique, setSelectedXitique] = useState<Xitique | null>(null);
  
  // State to hold data for renewal wizard
  const [renewalData, setRenewalData] = useState<Xitique | null>(null);

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

  const handleSelectXitique = (xitique: Xitique) => {
    setSelectedXitique(xitique);
    setCurrentView('detail');
  };

  const handleDeleteXitique = () => {
    if (selectedXitique) {
        deleteXitique(selectedXitique.id);
        setSelectedXitique(null);
        setCurrentView('dashboard');
        // Force refresh by key change or relying on dashboard internal effect
        window.location.reload(); 
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
            onCreate={() => {
                setRenewalData(null); // Ensure fresh wizard
                setCurrentView('create');
            }}
            onSelect={handleSelectXitique}
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
          />
        );
      case 'individual':
          return <IndividualDashboard />;
      case 'simulation':
        return <Simulation />;
      case 'info':
        return <ArchitectureInfo />;
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
            />
        );
    }
  };

  return (
    <Layout activeView={currentView} onChangeView={(view) => setCurrentView(view as View)}>
      {renderContent()}
    </Layout>
  );
};

export default App;
