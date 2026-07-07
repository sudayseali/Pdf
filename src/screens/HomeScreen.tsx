import { useState, useRef, ChangeEvent } from 'react';
import { FileUp, Library, FileText, Lock } from 'lucide-react';
import { storage } from '../lib/storage';

interface HomeScreenProps {
  onNavigate: (screen: 'Library' | 'Reader', pdfId?: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Logo / Header Area */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
            <FileText className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">LexiView PDF</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Pro Document Reader</p>
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
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
          <Lock className="w-3 h-3" />
          <span>Files stay on your device</span>
        </div>

      </div>
    </div>
  );
}
