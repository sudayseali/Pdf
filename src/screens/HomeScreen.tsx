import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FileUp, Library, Lock, Clock, Edit3, Layers, Flame } from 'lucide-react';
import { storage } from '../lib/storage';
import { PdfDocument, Screen } from '../types';
import { AppLogo } from '../components/AppLogo';

interface HomeScreenProps {
  onNavigate: (screen: Screen, pdfId?: string, isSensitive?: boolean) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [recentDocs, setRecentDocs] = useState<PdfDocument[]>([]);
  const [readingStats, setReadingStats] = useState({ totalTime: 0, streak: 0, lastActive: '', pageFlips: 0 });
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem('daily_reading_goal');
    return saved ? parseInt(saved, 10) : 10;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storage.getLibrary().then(docs => {
      const sorted = [...docs].sort((a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt));
      setRecentDocs(sorted.slice(0, 3));
    });

    storage.getReadingStats().then(stats => {
      setReadingStats(stats);
    });
  }, []);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }

    try {
      setIsImporting(true);
      const doc = await storage.savePdf(file);
      onNavigate('Reader', doc.id);
    } catch (error) {
      console.error('Error importing PDF:', error);
      alert('Failed to import PDF. Ensure your browser supports local storage.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeMins = Math.floor(readingStats.totalTime / 60);
  const goalPercentage = Math.min(Math.round((activeMins / dailyGoal) * 100), 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Logo / Header Area */}
        <div className="text-center space-y-4">
          <AppLogo size={96} className="mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">SilentPDF</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Pro Document Reader</p>
          </div>
        </div>

        {/* Study Progress & Habit Tracker Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Heerka Akhriska & Hab-dhaqanka (Study Habit)
            </h3>
            {readingStats.streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-black">
                <Flame className="w-3.5 h-3.5 fill-current text-orange-500 animate-pulse" />
                <span>{readingStats.streak} MAALMOOD</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-baseline gap-1 text-slate-800 dark:text-white">
                <span className="text-xl font-black">{activeMins}</span>
                <span className="text-xs text-slate-500">daqiiqo maanta</span>
              </div>
              
              <div className="text-[10px] text-slate-400 font-medium">
                Hadafka: {dailyGoal} daqiiqo.
                <button 
                  onClick={() => {
                    const newGoal = prompt('Geli hadafkaaga akhris ee maalin laha ah (daqiiqo):', String(dailyGoal));
                    if (newGoal && !isNaN(Number(newGoal))) {
                      const g = parseInt(newGoal, 10);
                      setDailyGoal(g);
                      localStorage.setItem('daily_reading_goal', String(g));
                    }
                  }}
                  className="text-blue-500 hover:underline ml-1.5 font-bold"
                >
                  Bedel
                </button>
              </div>
            </div>

            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-blue-500 dark:stroke-blue-400"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (125.6 * (goalPercentage || 1)) / 100}
                />
              </svg>
              <span className="absolute text-[9px] font-black font-mono text-slate-700 dark:text-slate-300">
                {goalPercentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Waqtiga: {Math.round(readingStats.totalTime / 60)}m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Boggaga: {readingStats.pageFlips || 0} rogay</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-md font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-70 shadow-md"
          >
            <FileUp className="w-5 h-5" />
            {isImporting ? 'Importing...' : 'Open PDF from Device'}
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            onClick={() => onNavigate('Library')}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-md font-semibold text-sm transition-colors active:scale-[0.98] shadow-sm"
          >
            <Library className="w-5 h-5" />
            Go to Library
          </button>

          <button
            onClick={() => onNavigate('Notes')}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-md font-semibold text-sm transition-colors active:scale-[0.98] shadow-md relative overflow-hidden group"
          >
            <Edit3 className="w-5 h-5" />
            <span>My Notepad</span>
            <span className="absolute top-1 right-1 bg-amber-400 text-slate-900 text-[8px] font-black uppercase px-1 rounded tracking-wider animate-pulse">
              New
            </span>
          </button>

          <button
            onClick={() => onNavigate('Flashcards')}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-md font-semibold text-sm transition-colors active:scale-[0.98] shadow-md relative overflow-hidden group"
          >
            <Layers className="w-5 h-5" />
            <span>Kaararka Darasada</span>
            <span className="absolute top-1 right-1 bg-yellow-300 text-slate-900 text-[8px] font-black uppercase px-1.5 rounded tracking-wider animate-bounce">
              Leitner
            </span>
          </button>
        </div>

        {recentDocs.length > 0 && (
          <div className="w-full pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Recently Viewed</h3>
            <div className="space-y-2">
              {recentDocs.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => onNavigate('Reader', doc.id, !!doc.isSensitive)}
                  className="bg-white dark:bg-slate-800/80 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 transition-colors"
                >
                  <div className={`w-8 h-8 shrink-0 ${doc.isSensitive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'} rounded flex items-center justify-center`}>
                    {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(doc.lastOpenedAt || doc.addedAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 pt-4">
          <Lock className="w-3 h-3" />
          <span>Files stay on your device</span>
        </div>

      </div>
    </div>
  );
}
