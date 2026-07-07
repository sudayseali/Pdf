import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Trash2, Clock, HardDrive, Search, X, Lock, Unlock } from 'lucide-react';
import { storage } from '../lib/storage';
import { PdfDocument } from '../types';

interface LibraryScreenProps {
  onOpenPdf: (id: string, isSensitive: boolean) => void;
}

interface LibraryDocument extends PdfDocument {
  progress?: number;
  lastPage?: number;
  numPages?: number;
}

export function LibraryScreen({ onOpenPdf }: LibraryScreenProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const docs = await storage.getLibrary();
      const docsWithMeta = await Promise.all(
        docs.map(async (doc) => {
          const meta = await storage.getPdfMetadata(doc.id);
          let progress = 0;
          if (meta.numPages && meta.numPages > 0) {
            progress = (meta.lastPage / meta.numPages) * 100;
          }
          return { ...doc, lastPage: meta.lastPage, numPages: meta.numPages, progress };
        })
      );
      setDocuments(docsWithMeta);
    } catch (error) {
      console.error('Failed to load library', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this PDF from your device?')) {
      await storage.deletePdf(id);
      loadLibrary();
    }
  };

  const handleToggleSensitive = async (e: React.MouseEvent, id: string, isSensitive: boolean) => {
    e.stopPropagation();
    await storage.toggleSensitive(id, !isSensitive);
    loadLibrary();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    }).format(new Date(ms));
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600">
            <HardDrive className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Library is empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-2 leading-relaxed">
              PDFs you open will be saved here for offline viewing.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              {searchQuery ? 'Search Results' : 'Recent Documents'}
            </h2>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No documents found matching "{searchQuery}"
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => onOpenPdf(doc.id, !!doc.isSensitive)}
                  className="bg-white dark:bg-slate-800/80 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.99]"
                >
                  <div className={`w-10 h-10 shrink-0 ${doc.isSensitive ? 'bg-amber-500' : 'bg-blue-600'} text-white rounded-md flex items-center justify-center shadow-sm`}>
                    {doc.isSensitive ? <Lock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                      {doc.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      <span>{formatSize(doc.size)}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.addedAt)}
                      </div>
                    </div>
                    {doc.numPages ? (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-[120px] h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all" 
                            style={{ width: `${doc.progress || 0}%` }} 
                          />
                        </div>
                        <span className="text-[10px] text-blue-500 font-bold">{Math.round(doc.progress || 0)}% Read</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => handleToggleSensitive(e, doc.id, !!doc.isSensitive)}
                      className={`p-2 rounded-full transition-colors ${doc.isSensitive ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      title={doc.isSensitive ? 'Remove protection' : 'Protect document'}
                    >
                      {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="p-2 -mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
