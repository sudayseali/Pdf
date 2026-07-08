import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sun, Moon, Sidebar as SidebarIcon, X, FileText } from 'lucide-react';
import { PdfViewer } from '../components/PdfViewer';
import { BottomControls } from '../components/BottomControls';
import { storage } from '../lib/storage';
import { PdfDocument, PdfMetadata } from '../types';

interface ReaderScreenProps {
  pdfId: string;
  onSessionEnd?: (durationSeconds: number) => void;
  onBack: () => void;
}

export function ReaderScreen({ pdfId, onSessionEnd, onBack }: ReaderScreenProps) {
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [documentInfo, setDocumentInfo] = useState<PdfDocument | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // New features state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    sessionStartTime.current = Date.now();
    loadPdf();
    return () => {
      // Calculate session duration on unmount
      const duration = Math.round((Date.now() - sessionStartTime.current) / 1000);
      if (onSessionEnd && duration > 0) {
        onSessionEnd(duration);
      }
    };
  }, [pdfId]);

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      const data = await storage.getPdfData(pdfId);
      const meta = await storage.getPdfMetadata(pdfId);
      const library = await storage.getLibrary();
      const docInfo = library.find(d => d.id === pdfId);
      
      setFileData(data);
      setMetadata(meta);
      setDocumentInfo(docInfo || null);
      
      // Update the recently viewed timestamp
      await storage.updateLastOpened(pdfId);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load this document.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync metadata changes (like last page or bookmarks) back to storage
  useEffect(() => {
    if (metadata) {
      storage.savePdfMetadata(pdfId, metadata);
    }
  }, [metadata, pdfId]);

  const jumpToPage = useCallback((page: number) => {
    setMetadata(prev => {
      if (!prev) return null;
      if (page < 1 || (prev.numPages && page > prev.numPages)) return prev;
      return { ...prev, lastPage: page };
    });
  }, []);

  const handleToggleBookmark = useCallback(() => {
    setMetadata(prev => {
      if (!prev) return null;
      const isBookmarked = prev.bookmarks.includes(prev.lastPage);
      let newBookmarks = [...prev.bookmarks];
      
      if (isBookmarked) {
        newBookmarks = newBookmarks.filter(p => p !== prev.lastPage);
      } else {
        newBookmarks.push(prev.lastPage);
      }
      
      return { ...prev, bookmarks: newBookmarks };
    });
  }, []);
  
  const handleToggleInvertColors = useCallback(() => {
    setMetadata(prev => prev ? { ...prev, invertColors: !prev.invertColors } : null);
  }, []);
  
  const handleNotesChange = useCallback((notes: string) => {
    setMetadata(prev => prev ? { ...prev, notes } : null);
  }, []);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.5)), []);

  const handleLoadSuccess = useCallback((pages: number) => {
    setNumPages(pages);
    setMetadata(prev => prev ? { ...prev, numPages: pages } : null);
  }, []);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchText(''); // clear on close
    }
  };


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!fileData || !metadata) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 gap-4">
        <div>Document not found.</div>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded shadow">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-950">
      {/* Top Controls Bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm z-20">
        <div className="flex items-center gap-2 md:gap-3 w-[30%]">
          <button 
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center"
            title="Back to Library"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-md transition-colors ${sidebarOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            title="Toggle Outline"
          >
            <SidebarIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-[40%] flex justify-center">
          <h1 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px] md:max-w-[400px]">
            {documentInfo?.name || 'Document'}
          </h1>
        </div>
        
        <div className="w-[30%] flex items-center justify-end gap-1 md:gap-2">
          {isSearchOpen && (
            <div className="relative flex-1 max-w-[150px] md:max-w-[200px] animate-in slide-in-from-right-4 fade-in duration-200 hidden sm:block">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-3 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <button 
            onClick={toggleSearch}
            className={`p-1.5 rounded-full transition-colors hidden sm:block ${isSearchOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            title="Search text"
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleToggleInvertColors}
            className={`p-1.5 rounded-full transition-colors ${metadata.invertColors ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            title="Toggle Night Mode"
          >
            {metadata.invertColors ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <PdfViewer 
          fileData={fileData}
          currentPage={metadata.lastPage}
          zoom={zoom}
          onLoadSuccess={handleLoadSuccess}
          searchText={searchText}
          invertColors={metadata.invertColors}
          sidebarOpen={sidebarOpen}
          onPageChange={jumpToPage}
        />

      </div>
      
      <BottomControls 
        currentPage={metadata.lastPage}
        numPages={numPages}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        isBookmarked={metadata.bookmarks.includes(metadata.lastPage)}
        onToggleBookmark={handleToggleBookmark}
      />
    </div>
  );
}
