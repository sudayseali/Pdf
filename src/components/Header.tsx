import React from 'react';
import { ArrowLeft, Moon, Sun, Search, MoreVertical, Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  autoDarkMode?: boolean;
  toggleAutoDarkMode?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack, onBack, darkMode, toggleDarkMode, autoDarkMode, toggleAutoDarkMode, rightAction }: HeaderProps) {
  return (
    <header className="pt-10 pb-3 h-24 sm:pt-2 sm:pb-2 sm:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-end sm:items-center justify-between px-6 shrink-0 shadow-sm dark:shadow-md transition-all z-10 sticky top-0">
      <div className="flex items-center gap-4 overflow-hidden">
        {showBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[1.25rem] transition-all duration-200 active:scale-95 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
             <span className="text-white font-black text-[11px] font-mono tracking-wider">SP</span>
          </div>
          <h1 className="text-xl font-black leading-tight text-slate-900 dark:text-white truncate font-display tracking-tight">
            {title}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700/80 pl-4 shrink-0">
        {toggleAutoDarkMode && (
          <button 
            onClick={toggleAutoDarkMode}
            className={`p-2.5 rounded-[1.25rem] transition-all duration-200 active:scale-95 cursor-pointer ${
              autoDarkMode 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={autoDarkMode ? "Auto Dark Mode: ON" : "Auto Dark Mode: OFF"}
            aria-label="Toggle auto dark mode"
          >
            <Clock className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={toggleDarkMode}
          className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[1.25rem] transition-all duration-200 active:scale-95 cursor-pointer"
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {rightAction}
      </div>
    </header>
  );
}
