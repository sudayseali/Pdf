import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Shield, Key, AlertCircle, Moon, Sun, Monitor, Settings, Database, Download, Upload, Flame, Clock, BookOpen, Check } from 'lucide-react';
import { storage } from '../lib/storage';
import { backupEngine } from '../lib/backup';
import { AppState } from '../types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose?: () => void;
  mode: 'verify' | 'manage' | 'verify_app' | 'settings';
  onVerifySuccess?: () => void;
  appState: AppState;
  onToggleDarkMode: () => void;
  onToggleAutoDarkMode: () => void;
}

export function SettingsModal({ 
  isOpen, onClose, mode, onVerifySuccess, 
  appState, onToggleDarkMode, onToggleAutoDarkMode 
}: SettingsModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [step, setStep] = useState<'verify_to_manage' | 'verify_to_open' | 'verify_app' | 'set_new' | 'confirm_new' | 'managed' | 'settings'>('settings');
  const inputRef = useRef<HTMLInputElement>(null);

  // New tab state for offline settings modal
  const [activeTab, setActiveTab] = useState<'preferences' | 'backup' | 'stats'>('preferences');
  const [stats, setStats] = useState<{ totalTime: number; streak: number; lastActive: string; pageFlips: number }>({ totalTime: 0, streak: 0, lastActive: '', pageFlips: 0 });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // Fetch stats when settings open or tab is statistics
  const loadStats = async () => {
    try {
      const s = await storage.getReadingStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'stats') {
      loadStats();
    }
  }, [isOpen, activeTab]);

  const handleExportBackup = async (full: boolean) => {
    try {
      setIsBackingUp(true);
      setBackupMessage('Compiling backup data...');
      const data = await backupEngine.generateBackup(full);
      
      const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      const suffix = full ? 'full' : 'light';
      element.download = `silentpdf_backup_${suffix}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      setBackupMessage('Backup downloaded successfully!');
      setTimeout(() => setBackupMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setBackupMessage('Backup generation failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setRestoreMessage('');
    setRestoreError('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const backup = JSON.parse(text);
          setRestoreMessage('Restoring backup data...');
          const result = await backupEngine.restoreBackup(backup);
          
          if (result.success) {
            setRestoreMessage('Success! ' + result.message);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setRestoreError(result.message);
            setRestoreMessage('');
          }
        } catch (err) {
          setRestoreError('Invalid backup file format.');
          setRestoreMessage('');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setRestoreError('Failed to read the backup file.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError('');
      loadStatus();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isOpen && inputRef.current && step !== 'settings' && step !== 'managed') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [step, isOpen]);

  const loadStatus = async () => {
    const existingPin = await storage.getPin();
    setSavedPin(existingPin);
    
    if (mode === 'verify') {
      setStep('verify_to_open');
    } else if (mode === 'verify_app') {
      setStep('verify_app');
    } else if (mode === 'settings') {
      setStep('settings');
    } else {
      if (existingPin) {
        setStep('verify_to_manage');
      } else {
        setStep('set_new');
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(val);
    setError('');
    if (val.length === 4) {
      processCompletePin(val);
    }
  };

  const processCompletePin = async (currentPin: string) => {
    if (step === 'verify_to_open' || step === 'verify_to_manage' || step === 'verify_app') {
      if (currentPin === savedPin) {
        if (step === 'verify_to_open' || step === 'verify_app') {
          onVerifySuccess?.();
          if (onClose) onClose();
        } else {
          setStep('managed');
          setPin('');
        }
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } else if (step === 'set_new') {
      setConfirmPin(currentPin);
      setPin('');
      setStep('confirm_new');
    } else if (step === 'confirm_new') {
      if (currentPin === confirmPin) {
        await storage.setPin(currentPin);
        setSavedPin(currentPin);
        if (mode === 'manage') {
          setStep('managed');
          setPin('');
        } else {
          setStep('settings');
        }
      } else {
        setError('PINs do not match. Try again.');
        setPin('');
        setConfirmPin('');
        setStep('set_new');
      }
    }
  };

  const handleRemovePin = async () => {
    if (window.confirm('Are you sure you want to remove the PIN? Your app will be unprotected.')) {
      await storage.setPin(null);
      setSavedPin(null);
      setStep('settings');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/50">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 font-display tracking-tight">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              {step === 'settings' ? <Settings className="w-5 h-5 text-blue-500" /> : <Shield className="w-5 h-5 text-blue-500" />}
            </div>
            {step === 'settings' ? 'Settings & Prefs' : 'Security'}
          </h2>
          {mode !== 'verify_app' && (
            <button
              onClick={() => {
                if (step === 'managed' || step === 'set_new' || step === 'confirm_new' || step === 'verify_to_manage') {
                  setStep('settings');
                } else {
                  if (onClose) onClose();
                }
              }}
              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Selection Navigation for Settings Screen */}
        {step === 'settings' && (
          <div className="flex px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50 gap-2">
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 py-2.5 px-2 text-[11px] uppercase tracking-widest font-black transition-all rounded-xl cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500'
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2.5 px-2 text-[11px] uppercase tracking-widest font-black transition-all rounded-xl cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500'
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex-1 py-2.5 px-2 text-[11px] uppercase tracking-widest font-black transition-all rounded-xl cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500'
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              Backup
            </button>
          </div>
        )}
        
        <div className="p-6 md:p-8 flex flex-col items-center max-h-[75vh] overflow-y-auto">
          {step === 'settings' ? (
            <div className="w-full">
              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  {/* Appearance Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Appearance</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-800/50">
                          {appState.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-display tracking-tight">Dark Mode</p>
                          <p className="text-[11px] font-medium text-slate-500">Toggle dark appearance</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={appState.darkMode} onChange={onToggleDarkMode} disabled={appState.autoDarkMode} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/50">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-display tracking-tight">Auto Dark Mode</p>
                          <p className="text-[11px] font-medium text-slate-500">Follow time of day</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={appState.autoDarkMode} onChange={onToggleAutoDarkMode} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Security</h3>
                    
                    <div 
                      onClick={() => {
                        if (savedPin) setStep('verify_to_manage');
                        else setStep('set_new');
                      }}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:border-blue-500/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${savedPin ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-800/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200/50 dark:border-slate-700/50'}`}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-display tracking-tight">App Lock PIN</p>
                          <p className="text-[11px] font-medium text-slate-500">{savedPin ? 'PIN is active' : 'No PIN set'}</p>
                        </div>
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {savedPin ? 'Manage' : 'Setup'}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Support Section in Settings */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Help & Support</h3>
                    <div className="p-3 bg-emerald-50/55 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/50 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.07 1.95 11.43 1.95c-5.436 0-9.86 4.37-9.864 9.8.001 2.03.547 4.02 1.583 5.793l-.991 3.616 3.733-.969zm11.232-6.52c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.67-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">WhatsApp Support</p>
                          <p className="text-[10px] text-slate-500 font-medium">Contact for issues: 0657864155</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/30 font-bold leading-normal">
                        Please: Text messages only (No calls, no voice messages).
                      </p>
                      <a
                        href="https://wa.me/252657864155?text=Hello%20SilentPDF%20Support%2C%20I%20need%20assistance."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors text-center"
                      >
                        Open WhatsApp Chat
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Tab */}
              {activeTab === 'stats' && (
                <div className="w-full space-y-6 animate-in slide-in-from-right-4 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-200/50 dark:border-orange-950/50 text-center flex flex-col items-center justify-center shadow-sm">
                      <div className="p-3 bg-white dark:bg-orange-900/30 rounded-2xl mb-3 shadow-sm border border-orange-100/50 dark:border-orange-800/50">
                        <Flame className="w-6 h-6 text-orange-500" />
                      </div>
                      <span className="text-3xl font-black text-orange-600 dark:text-orange-400 font-display">{stats.streak}</span>
                      <span className="text-[10px] font-black text-orange-500 dark:text-orange-600/80 uppercase tracking-widest mt-1 font-mono">Reading Streak</span>
                    </div>

                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-200/50 dark:border-emerald-950/50 text-center flex flex-col items-center justify-center shadow-sm">
                      <div className="p-3 bg-white dark:bg-emerald-900/30 rounded-2xl mb-3 shadow-sm border border-emerald-100/50 dark:border-emerald-800/50">
                        <BookOpen className="w-6 h-6 text-emerald-500" />
                      </div>
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display">{stats.pageFlips}</span>
                      <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-600/80 uppercase tracking-widest mt-1 font-mono">Pages Read</span>
                    </div>
                  </div>

                  <div className="p-5 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-200/50 dark:border-blue-950/50 flex items-center gap-5 shadow-sm">
                    <div className="p-4 bg-white dark:bg-blue-900/30 rounded-2xl shadow-sm border border-blue-100/50 dark:border-blue-800/50 shrink-0">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">Total Time</p>
                      <p className="text-xl md:text-2xl font-black text-blue-800 dark:text-blue-300 mt-1 font-display tracking-tight">
                        {stats.totalTime < 60
                          ? `${stats.totalTime} Secs`
                          : stats.totalTime < 3600
                          ? `${Math.floor(stats.totalTime / 60)} Mins`
                          : `${Math.floor(stats.totalTime / 3600)}h ${Math.floor((stats.totalTime % 3600) / 60)}m`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-start gap-3 text-[11px] font-medium text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>This data is stored locally on your device and is fully offline.</span>
                  </div>
                </div>
              )}

              {/* Backup Tab */}
              {activeTab === 'backup' && (
                <div className="w-full space-y-6 animate-in slide-in-from-right-4 duration-200">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-start gap-3 text-[11px] font-medium text-amber-700 dark:text-amber-300 leading-relaxed border border-amber-100 dark:border-amber-900/30">
                    <Database className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>All of your data is stored locally on this device. Create a backup to protect against data loss or to migrate to another device.</span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Create Backup</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => handleExportBackup(false)}
                        disabled={isBackingUp}
                        className="p-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-all hover:shadow-md hover:border-indigo-500/30 group"
                      >
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl mb-3 inline-block group-hover:scale-110 transition-transform">
                          <Download className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200 font-display">Light Backup</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-2">Notes, bookmarks & highlights only</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleExportBackup(true)}
                        disabled={isBackingUp}
                        className="p-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-all hover:shadow-md hover:border-emerald-500/30 group"
                      >
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl mb-3 inline-block group-hover:scale-110 transition-transform">
                          <Download className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200 font-display">Full Backup</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-2">Includes all imported PDF files</p>
                        </div>
                      </button>
                    </div>

                    {backupMessage && (
                      <p className="text-[11px] font-black text-center text-blue-600 dark:text-blue-400 mt-3 bg-blue-50 dark:bg-blue-900/30 py-2 rounded-lg">{backupMessage}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Restore Backup</h4>
                    
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        id="restore-file-input"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                      <button
                        onClick={() => document.getElementById('restore-file-input')?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-[0.98]"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="uppercase tracking-widest">Select Backup (.json)</span>
                      </button>
                    </div>

                    {restoreMessage && (
                      <p className="text-[11px] font-black text-center text-emerald-600 dark:text-emerald-400 mt-3 bg-emerald-50 dark:bg-emerald-900/30 py-2 rounded-lg">{restoreMessage}</p>
                    )}
                    {restoreError && (
                      <p className="text-[11px] font-black text-center text-red-500 mt-3 bg-red-50 dark:bg-red-900/30 py-2 rounded-lg">{restoreError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : step === 'managed' ? (
            <div className="w-full flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-emerald-100/50 dark:border-emerald-800/50">
                <Shield className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 font-display tracking-tight">App Secured</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 max-w-[250px]">
                Your app is protected with a PIN.
              </p>
              
              <button
                onClick={handleRemovePin}
                className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-black rounded-2xl transition-all border border-red-200 dark:border-red-900/50 cursor-pointer active:scale-[0.98]"
              >
                REMOVE PIN
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center py-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-blue-100/50 dark:border-blue-800/50">
                {step.startsWith('verify') ? <Lock className="w-10 h-10" /> : <Key className="w-10 h-10" />}
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 text-center font-display tracking-tight">
                {step.startsWith('verify') ? 'Enter PIN' : step === 'set_new' ? 'Create PIN' : 'Confirm PIN'}
              </h3>
              
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-8 text-center h-10 max-w-[280px]">
                {step === 'verify_to_open' && 'Enter your PIN to access this document.'}
                {step === 'verify_app' && 'Enter your PIN to unlock the app.'}
                {step === 'verify_to_manage' && 'Enter your current PIN to manage security settings.'}
                {step === 'set_new' && 'Create a 4-digit PIN to protect your app.'}
                {step === 'confirm_new' && 'Enter your 4-digit PIN again to confirm.'}
              </p>
              
              <div className="relative mb-4 w-full max-w-[240px]">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={handlePinChange}
                  className="w-full text-center tracking-[1em] text-3xl font-black font-mono py-4 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  autoComplete="off"
                  placeholder="••••"
                />
              </div>
              
              <div className="h-6 mt-2 flex items-center justify-center w-full">
                {error && (
                  <div className="px-3 py-1 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg">
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
