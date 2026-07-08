import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Shield, Key, AlertCircle, Moon, Sun, Monitor, Smartphone, MoveHorizontal, MoveVertical, Settings } from 'lucide-react';
import { storage } from '../lib/storage';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {step === 'settings' ? <Settings className="w-4 h-4 text-blue-500" /> : <Shield className="w-4 h-4 text-blue-500" />}
            {step === 'settings' ? 'Settings' : 'Security'}
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
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="p-6 flex flex-col items-center">
          {step === 'settings' ? (
            <div className="w-full space-y-6">
              {/* Appearance Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Appearance</h3>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {appState.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Dark Mode</p>
                      <p className="text-[10px] text-slate-500">Toggle dark appearance</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={appState.darkMode} onChange={onToggleDarkMode} disabled={appState.autoDarkMode} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto Dark Mode</p>
                      <p className="text-[10px] text-slate-500">Follow time of day</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={appState.autoDarkMode} onChange={onToggleAutoDarkMode} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Security</h3>
                
                <div 
                  onClick={() => {
                    if (savedPin) setStep('verify_to_manage');
                    else setStep('set_new');
                  }}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${savedPin ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">App Lock PIN</p>
                      <p className="text-[10px] text-slate-500">{savedPin ? 'PIN is active' : 'No PIN set'}</p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {savedPin ? 'Manage' : 'Setup'}
                  </div>
                </div>
              </div>
            </div>
          ) : step === 'managed' ? (
            <div className="w-full flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">App Secured</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your app is protected with a PIN.
              </p>
              
              <button
                onClick={handleRemovePin}
                className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
              >
                Remove PIN
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center py-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                {step.startsWith('verify') ? <Lock className="w-6 h-6" /> : <Key className="w-6 h-6" />}
              </div>
              
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1 text-center">
                {step.startsWith('verify') ? 'Enter PIN' : step === 'set_new' ? 'Create PIN' : 'Confirm PIN'}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center h-10">
                {step === 'verify_to_open' && 'Enter your PIN to access this document.'}
                {step === 'verify_app' && 'Enter your PIN to unlock the app.'}
                {step === 'verify_to_manage' && 'Enter your current PIN to manage security settings.'}
                {step === 'set_new' && 'Create a 4-digit PIN to protect your app.'}
                {step === 'confirm_new' && 'Enter your 4-digit PIN again to confirm.'}
              </p>
              
              <div className="relative mb-2 w-full max-w-[200px]">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={handlePinChange}
                  className="w-full text-center tracking-[1em] text-2xl font-mono py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              
              <div className="h-6 mt-2 flex items-center justify-center w-full">
                {error && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
