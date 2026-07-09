import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { NotesScreen } from './screens/NotesScreen';
import { SettingsModal } from './components/SettingsModal';
import { storage } from './lib/storage';
import { Screen, AppState } from './types';
import { Settings, Lock } from 'lucide-react';
import { AppLogo } from './components/AppLogo';

export default function App() {
  const [state, setState] = useState<AppState>({
    currentScreen: 'Home',
    selectedPdfId: null,
    darkMode: false,
    autoDarkMode: true
  });

  const [currentPdfName, setCurrentPdfName] = useState<string>('');
  
  // Settings Modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalMode, setSettingsModalMode] = useState<'verify' | 'manage' | 'verify_app' | 'settings'>('settings');
  const [pendingPdfId, setPendingPdfId] = useState<string | null>(null);
  
  // App-wide lock state
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load dark mode preference on boot
    Promise.all([
      storage.getDarkMode(), 
      storage.getAutoDarkMode()
    ]).then(([mode, auto]) => {
      setState(s => ({ ...s, darkMode: mode, autoDarkMode: auto }));
    });
    
    // Check if app has PIN configured on boot
    storage.getPin().then(pin => {
      if (pin) {
        setSettingsModalMode('verify_app');
        setSettingsModalOpen(true);
        setIsAppLocked(true);
      } else {
        setIsAppLocked(false);
      }
      setIsLoadingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!state.autoDarkMode) return;
    const checkTimeForDarkMode = () => {
      const currentHour = new Date().getHours();
      // Assume sunset is 18:00 and sunrise is 06:00
      const isNightTime = currentHour >= 18 || currentHour < 6;
      
      setState(s => {
        if (!s.autoDarkMode) return s;
        if (s.darkMode !== isNightTime) {
          storage.setDarkMode(isNightTime);
          return { ...s, darkMode: isNightTime };
        }
        return s;
      });
    };
    checkTimeForDarkMode();
    const intervalId = setInterval(checkTimeForDarkMode, 60000);
    return () => clearInterval(intervalId);
  }, [state.autoDarkMode]);

  // Update HTML class for Tailwind dark mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const toggleDarkMode = () => {
    const newMode = !state.darkMode;
    setState(s => ({ ...s, darkMode: newMode, autoDarkMode: false }));
    storage.setDarkMode(newMode);
    storage.setAutoDarkMode(false);
  };

  const toggleAutoDarkMode = () => {
    const newAuto = !state.autoDarkMode;
    setState(s => ({ ...s, autoDarkMode: newAuto }));
    storage.setAutoDarkMode(newAuto);
  };

  const handleNavigate = async (screen: Screen, pdfId?: string, isSensitive?: boolean) => {
    if (screen === 'Reader' && pdfId) {
      if (isSensitive) {
        const pin = await storage.getPin();
        if (pin && !isAppLocked) {
          setPendingPdfId(pdfId);
          setSettingsModalMode('verify');
          setSettingsModalOpen(true);
          return;
        }
      }
      
      setState(s => ({ ...s, currentScreen: screen, selectedPdfId: pdfId }));
      storage.getLibrary().then(lib => {
        const doc = lib.find(d => d.id === pdfId);
        if (doc) setCurrentPdfName(doc.name);
      });
    } else {
      setState(s => ({ ...s, currentScreen: screen, selectedPdfId: pdfId || null }));
    }
  };

  const handleVerifySuccess = () => {
    if (settingsModalMode === 'verify_app') {
      setIsAppLocked(false);
      setSettingsModalOpen(false);
      setSettingsModalMode('settings');
    } else if (pendingPdfId) {
      setState(s => ({ ...s, currentScreen: 'Reader', selectedPdfId: pendingPdfId }));
      storage.getLibrary().then(lib => {
        const doc = lib.find(d => d.id === pendingPdfId);
        if (doc) setCurrentPdfName(doc.name);
      });
      setPendingPdfId(null);
    }
  };

  const handleSessionEnd = (durationSeconds: number) => {
    // Record session duration in the offline stats database
    storage.incrementReadingStats(durationSeconds).catch(err => {
      console.error('Failed to update reading stats:', err);
    });

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    setToastMessage(`Reading session ended: ${timeStr} spent.`);
    
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getHeaderTitle = () => {
    switch (state.currentScreen) {
      case 'Home': return 'SilentPDF';
      case 'Library': return 'My Library';
      case 'Reader': return currentPdfName || 'Reading';
      case 'Notes': return 'My Notepad';
      default: return 'App';
    }
  };

  const showBackButton = state.currentScreen !== 'Home';
  
  const handleBack = () => {
    if (state.currentScreen === 'Reader') handleNavigate('Library');
    else handleNavigate('Home');
  };

  const openSettings = () => {
    setPendingPdfId(null);
    setSettingsModalMode('settings');
    setSettingsModalOpen(true);
  };
  
  if (isLoadingAuth) {
    return (
      <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="animate-bounce duration-1000">
            <AppLogo size={120} className="shadow-2xl shadow-blue-500/20" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">SilentPDF</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pro Document Reader</p>
          </div>
        </div>
        <div className="absolute bottom-16 flex flex-col items-center gap-2.5">
          <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Securing Workspace</span>
        </div>
      </div>
    );
  }

  // If the app is locked, render ONLY the lock screen background and the modal
  if (isAppLocked) {
    return (
      <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 pointer-events-none">
          <AppLogo size={120} className="opacity-15 mb-4 grayscale" />
          <p className="text-lg font-bold opacity-30 tracking-widest uppercase">SilentPDF Locked</p>
        </div>
        <SettingsModal 
          isOpen={settingsModalOpen}
          onClose={() => {}}
          mode="verify_app"
          onVerifySuccess={handleVerifySuccess}
          appState={state}
          onToggleDarkMode={toggleDarkMode}
          onToggleAutoDarkMode={toggleAutoDarkMode}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans antialiased overflow-hidden transition-colors selection:bg-blue-200 dark:selection:bg-blue-900 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {state.currentScreen !== 'Reader' && (
        <Header 
          title={getHeaderTitle()}
          showBack={showBackButton}
          onBack={handleBack}
          darkMode={state.darkMode}
          toggleDarkMode={toggleDarkMode}
          autoDarkMode={state.autoDarkMode}
          toggleAutoDarkMode={toggleAutoDarkMode}
          rightAction={
            <button
              onClick={openSettings}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          }
        />
      )}
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {state.currentScreen === 'Home' && (
          <HomeScreen onNavigate={(screen, id, isSensitive) => handleNavigate(screen, id, isSensitive)} />
        )}
        
        {state.currentScreen === 'Library' && (
          <LibraryScreen onOpenPdf={(id, isSensitive) => handleNavigate('Reader', id, isSensitive)} />
        )}
        
        {state.currentScreen === 'Reader' && state.selectedPdfId && (
          <ReaderScreen 
            pdfId={state.selectedPdfId} 
            onSessionEnd={handleSessionEnd} 
            onBack={handleBack} 
          />
        )}

        {state.currentScreen === 'Notes' && (
          <NotesScreen onBack={handleBack} />
        )}
      </main>

      <SettingsModal 
        isOpen={settingsModalOpen}
        onClose={() => {
          setSettingsModalOpen(false);
          setPendingPdfId(null);
        }}
        mode={settingsModalMode}
        onVerifySuccess={handleVerifySuccess}
        appState={state}
        onToggleDarkMode={toggleDarkMode}
        onToggleAutoDarkMode={toggleAutoDarkMode}
      />

      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-full shadow-xl z-50 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
