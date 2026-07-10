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

  useEffect(() => {
    if (activeMins > 0 && activeMins >= dailyGoal && dailyGoal > 0) {
      const today = new Date().toISOString().split('T')[0];
      const notifiedDate = localStorage.getItem('daily_goal_notified_date');
      
      if (notifiedDate !== today) {
        if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Hambalyo! (Goal Reached!)', {
                body: `You reached your daily goal of ${dailyGoal} minutes!`,
              });
              localStorage.setItem('daily_goal_notified_date', today);
            }
          });
        } else {
          // Fallback if notifications aren't supported but we still want to record it
          localStorage.setItem('daily_goal_notified_date', today);
        }
      }
    }
  }, [activeMins, dailyGoal]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Logo / Header Area */}
        <div className="text-center space-y-4">
          <AppLogo size={108} className="mx-auto transform hover:rotate-3 transition-transform duration-300 cursor-pointer hover:scale-105" />
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Silent<span className="text-blue-600 dark:text-blue-400">PDF</span>
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
              Pro Study & Annotation Engine
            </p>
          </div>
        </div>

        {/* Study Progress & Habit Tracker Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 shadow-lg dark:shadow-2xl space-y-5 relative overflow-hidden group">
          {/* Subtle background glow */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-300" />
          
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-sans">
              Study & Habit Tracker
            </h3>
            {readingStats.streak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider shadow-sm border border-orange-100 dark:border-orange-900/30">
                <Flame className="w-3.5 h-3.5 fill-current text-orange-500 animate-pulse" />
                <span>{readingStats.streak} DAYS</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-1.5 text-slate-800 dark:text-white">
                <span className="text-4xl font-black font-display tracking-tight">{activeMins}</span>
                <span className="text-sm text-slate-500 font-semibold">minutes today</span>
              </div>
              
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Hadafka: <span className="font-bold text-slate-600 dark:text-slate-300">{dailyGoal}m</span>.
                <button 
                  onClick={() => {
                    const newGoal = prompt('Enter your daily reading goal (minutes):', String(dailyGoal));
                    if (newGoal && !isNaN(Number(newGoal))) {
                      const g = parseInt(newGoal, 10);
                      setDailyGoal(g);
                      localStorage.setItem('daily_reading_goal', String(g));
                    }
                  }}
                  className="text-blue-500 hover:text-blue-600 hover:underline ml-2 font-bold transition-colors"
                >
                  Bedel Hadafka
                </button>
              </div>
            </div>

            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-blue-600 dark:stroke-blue-400"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * (goalPercentage || 1)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-black font-mono text-slate-800 dark:text-slate-200">
                {goalPercentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono relative z-10">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Time: {Math.round(readingStats.totalTime / 60)}m</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Pages: {readingStats.pageFlips || 0} flipped</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Modern Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="col-span-2 flex items-center justify-between bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-3xl transition-all duration-300 active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-blue-500/25 group cursor-pointer border border-blue-400/30"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <FileUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-black text-lg tracking-wide">Import PDF</span>
                <span className="block text-[11px] font-semibold text-blue-100 opacity-90 font-mono mt-0.5">
                  {isImporting ? 'Importing file...' : 'Load from your device'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            </div>
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
            className="col-span-1 flex flex-col items-start justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer group min-h-[120px]"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-300 mb-3 text-blue-500 dark:text-blue-400">
              <Library className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">Library</span>
          </button>

          <button
            onClick={() => onNavigate('Notes')}
            className="col-span-1 flex flex-col items-start justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer group min-h-[120px] relative overflow-hidden"
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-300 mb-3 text-indigo-500 dark:text-indigo-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">Notes</span>
            <span className="absolute top-4 right-4 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
              New
            </span>
          </button>

          <button
            onClick={() => onNavigate('Flashcards')}
            className="col-span-2 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-300 text-emerald-500 dark:text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm">Study Flashcards</span>
                <span className="block text-[11px] font-medium text-slate-500 mt-0.5">Track your memorization</span>
              </div>
            </div>
            <span className="bg-yellow-300/20 text-yellow-600 dark:text-yellow-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-wider font-mono border border-yellow-400/30">
              Leitner
            </span>
          </button>
        </div>

        {recentDocs.length > 0 && (
          <div className="w-full pt-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 font-mono">
              Recent Documents
            </h3>
            <div className="space-y-3">
              {recentDocs.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => onNavigate('Reader', doc.id, !!doc.isSensitive)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-4 cursor-pointer hover:border-blue-500 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 shrink-0 ${doc.isSensitive ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30' : 'bg-blue-50 dark:bg-slate-800/80 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-slate-800'} rounded-[1rem] flex items-center justify-center transition-all duration-200 group-hover:scale-105`}>
                    {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-sans">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
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
