import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { storage } from './lib/storage';
import { Screen, AppState } from './types';
import { PdfDocument } from './types';

export default function App() {
  const [state, setState] = useState<AppState>({
    currentScreen: 'Home',
    selectedPdfId: null,
    darkMode: false,
  });

  const [currentPdfName, setCurrentPdfName] = useState<string>('');

  useEffect(() => {
    // Load dark mode preference on boot
    storage.getDarkMode().then(mode => {
      setState(s => ({ ...s, darkMode: mode }));
    });
  }, []);

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
    setState(s => ({ ...s, darkMode: newMode }));
    storage.setDarkMode(newMode);
  };

  const handleNavigate = (screen: Screen, pdfId?: string) => {
    setState(s => ({ ...s, currentScreen: screen, selectedPdfId: pdfId || null }));
    
    // Attempt to load PDF name for header if opening reader
    if (screen === 'Reader' && pdfId) {
      storage.getLibrary().then(lib => {
        const doc = lib.find(d => d.id === pdfId);
        if (doc) setCurrentPdfName(doc.name);
      });
    }
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

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans antialiased overflow-hidden transition-colors selection:bg-blue-200 dark:selection:bg-blue-900">
      <Header 
        title={getHeaderTitle()}
        showBack={showBackButton}
        onBack={handleBack}
        darkMode={state.darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {state.currentScreen === 'Home' && (
          <HomeScreen onNavigate={handleNavigate} />
        )}
        
        {state.currentScreen === 'Library' && (
          <LibraryScreen onOpenPdf={(id) => handleNavigate('Reader', id)} />
        )}
        
        {state.currentScreen === 'Reader' && state.selectedPdfId && (
          <ReaderScreen pdfId={state.selectedPdfId} />
        )}
      </main>
    </div>
  );
}
