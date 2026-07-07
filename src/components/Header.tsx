import React from 'react';
import { ArrowLeft, Moon, Sun, Search, MoreVertical } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack, onBack, darkMode, toggleDarkMode, rightAction }: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm dark:shadow-lg transition-colors z-10">
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
        <button 
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {rightAction}
      </div>
    </header>
  );
}
