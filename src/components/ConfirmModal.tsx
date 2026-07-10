import React from 'react';
import { AlertCircle, Trash2, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'info':
        return (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'danger':
      default:
        return (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl border border-red-100 dark:border-red-900/30">
            <Trash2 className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/15 focus:ring-amber-500/20';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/15 focus:ring-blue-500/20';
      case 'danger':
      default:
        return 'bg-red-600 hover:bg-red-500 shadow-red-500/15 focus:ring-red-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 flex flex-col items-center text-center">
          {getIcon()}
          
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-4 font-display tracking-tight">
            {title}
          </h3>
          
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-center"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-xs font-black text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center ${getConfirmButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
