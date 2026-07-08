import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { SecuritySettings } from './components/SecuritySettings';
import { storage } from './lib/storage';
import { Screen, AppState } from './types';
import { PdfDocument } from './types';
import { Shield } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    currentScreen: 'Home',
    selectedPdfId: null,
    darkMode: false,
    autoDarkMode: true,
  });

  const [currentPdfName, setCurrentPdfName] = useState<string>('');
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityModalMode, setSecurityModalMode] = useState<'verify' | 'manage'>('manage');
  const [pendingPdfId, setPendingPdfId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load dark mode preference on boot
    Promise.all([storage.getDarkMode(), storage.getAutoDarkMode()]).then(([mode, auto]) => {
      setState(s => ({ ...s, darkMode: mode, autoDarkMode: auto }));
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
        if (pin) {
          setPendingPdfId(pdfId);
          setSecurityModalMode('verify');
          setSecurityModalOpen(true);
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
    if (pendingPdfId) {
      setState(s => ({ ...s, currentScreen: 'Reader', selectedPdfId: pendingPdfId }));
      storage.getLibrary().then(lib => {
        const doc = lib.find(d => d.id === pendingPdfId);
        if (doc) setCurrentPdfName(doc.name);
      });
      setPendingPdfId(null);
    }
  };

  const handleSessionEnd = (durationSeconds: number) => {
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
      case 'Home': return 'PDF Reader';
      case 'Library': return 'My Library';
      case 'Reader': return currentPdfName || 'Reading';
      default: return 'App';
    }
  };

  const showBackButton = state.currentScreen !== 'Home';
  
  const handleBack = () => {
    if (state.currentScreen === 'Reader') handleNavigate('Library');
    else handleNavigate('Home');
  };

  const openSecurityManager = () => {
    setPendingPdfId(null);
    setSecurityModalMode('manage');
    setSecurityModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans antialiased overflow-hidden transition-colors selection:bg-blue-200 dark:selection:bg-blue-900">
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
            state.currentScreen === 'Library' ? (
              <button
                onClick={openSecurityManager}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
                title="Security Settings"
              >
                <Shield className="w-5 h-5" />
              </button>
            ) : undefined
          }
        />
      )}
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {state.currentScreen === 'Home' && (
          <HomeScreen onNavigate={(screen, id) => handleNavigate(screen, id, false)} />
        )}
        
        {state.currentScreen === 'Library' && (
          <LibraryScreen onOpenPdf={(id, isSensitive) => handleNavigate('Reader', id, isSensitive)} />
        )}
        
        {state.currentScreen === 'Reader' && state.selectedPdfId && (
          <ReaderScreen pdfId={state.selectedPdfId} onSessionEnd={handleSessionEnd} onBack={handleBack} />
        )}
      </main>

      <SecuritySettings 
        isOpen={securityModalOpen}
        onClose={() => {
          setSecurityModalOpen(false);
          setPendingPdfId(null);
        }}
        mode={securityModalMode}
        onVerifySuccess={handleVerifySuccess}
      />

      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-full shadow-xl z-50 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
