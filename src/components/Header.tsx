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
    <header className="pt-10 pb-3 h-24 sm:pt-2 sm:pb-2 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-end sm:items-center justify-between px-6 shrink-0 shadow-sm dark:shadow-lg transition-all z-10">
      <div className="flex items-center gap-4 overflow-hidden">
        {showBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
             <span className="text-white font-bold text-sm">LV</span>
          </div>
          <h1 className="text-lg font-bold leading-tight text-slate-900 dark:text-white truncate">
            {title}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4 shrink-0">
        {toggleAutoDarkMode && (
          <button 
            onClick={toggleAutoDarkMode}
            className={`p-2 rounded-full transition-colors active:scale-95 ${
              autoDarkMode 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={autoDarkMode ? "Auto Dark Mode: ON" : "Auto Dark Mode: OFF"}
            aria-label="Toggle auto dark mode"
          >
            <Clock className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {rightAction}
      </div>
    </header>
  );
}
