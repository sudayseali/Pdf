import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Shield, Key, AlertCircle } from 'lucide-react';
import { storage } from '../lib/storage';

export interface SecuritySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'verify' | 'manage';
  onVerifySuccess?: () => void;
}

export function SecuritySettings({ isOpen, onClose, mode, onVerifySuccess }: SecuritySettingsProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // 'verify_to_manage': Verify existing PIN before allowing changes
  // 'verify_to_open': Verify PIN to open a sensitive document
  // 'set_new': Enter a new PIN
  // 'confirm_new': Confirm the new PIN
  // 'managed': The settings view after verification (allows removing PIN)
  const [step, setStep] = useState<'verify_to_manage' | 'verify_to_open' | 'set_new' | 'confirm_new' | 'managed'>('verify_to_open');
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
    if (isOpen && inputRef.current) {
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
    if (step === 'verify_to_open' || step === 'verify_to_manage') {
      if (currentPin === savedPin) {
        if (step === 'verify_to_open') {
          onVerifySuccess?.();
          onClose();
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
          onVerifySuccess?.();
          onClose();
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
    if (window.confirm('Are you sure you want to remove the PIN? Sensitive documents will be unprotected.')) {
      await storage.setPin(null);
      setSavedPin(null);
      setStep('set_new');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Security Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {step === 'managed' ? (
            <div className="w-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">App Secured</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your sensitive documents are protected with a PIN.
              </p>
              
              <button
                onClick={handleRemovePin}
                className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
              >
                Remove PIN
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                {step.startsWith('verify') ? <Lock className="w-6 h-6" /> : <Key className="w-6 h-6" />}
              </div>
              
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1 text-center">
                {step.startsWith('verify') ? 'Enter PIN' : step === 'set_new' ? 'Create PIN' : 'Confirm PIN'}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center h-10">
                {step === 'verify_to_open' && 'Enter your PIN to access this document.'}
                {step === 'verify_to_manage' && 'Enter your current PIN to manage security settings.'}
                {step === 'set_new' && 'Create a 4-digit PIN to protect your sensitive documents.'}
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
