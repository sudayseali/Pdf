import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sun, Moon, Sidebar as SidebarIcon, X, FileText, Pen, Highlighter, Eraser, Undo, Mic, Play, Pause, Trash2, Check, Square, Palette, Layers } from 'lucide-react';
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

  // Page Theme State
  const [pageTheme, setPageTheme] = useState<'normal' | 'night' | 'sepia' | 'eye-care'>('normal');

  // Drawing Toolbar State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'none' | 'pen' | 'highlighter' | 'eraser'>('none');
  const [penColor, setPenColor] = useState('#ef4444');
  const [penWidth, setPenWidth] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState('rgba(254, 240, 138, 0.4)');
  const [highlighterWidth, setHighlighterWidth] = useState(14);
  const [eraserWidth, setEraserWidth] = useState(18);
  
  // Ref to hold canvas references
  const canvasRefs = useRef<Record<number, any>>({});

  // Audio Recording State
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false);
  const [audioMemos, setAudioMemos] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [newMemoTitle, setNewMemoTitle] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      if (meta.pageTheme) {
        setPageTheme(meta.pageTheme);
      } else if (meta.invertColors) {
        setPageTheme('night');
      } else {
        setPageTheme('normal');
      }
      
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

  // Load Audio Memos
  const loadAudioMemos = async () => {
    try {
      const memos = await storage.getAudioMemos(pdfId);
      setAudioMemos(memos || []);
    } catch (e) {
      console.error('Failed to load audio memos', e);
    }
  };

  useEffect(() => {
    if (pdfId) {
      loadAudioMemos();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [pdfId]);

  // Page Theme Changer helper
  const handleThemeChange = (theme: 'normal' | 'night' | 'sepia' | 'eye-care') => {
    setPageTheme(theme);
    setMetadata(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        pageTheme: theme, 
        invertColors: theme === 'night' 
      };
    });
  };

  // Recording Actions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const memoTitle = newMemoTitle.trim() || `Cod-xusuuseed Bogga ${metadata?.lastPage || 1}`;
        const newMemo = {
          id: crypto.randomUUID(),
          name: memoTitle,
          addedAt: Date.now(),
          duration: recordingTime,
        };

        await storage.saveAudioMemo(pdfId, newMemo, audioBlob);
        setNewMemoTitle('');
        setRecordingTime(0);
        loadAudioMemos();
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting voice recording', err);
      alert('Ma suurtagelin in makarafoonka la dhexgalo. Fadlan ogolow makarafoonka.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Playback Action
  const playMemo = async (memoId: string) => {
    if (activePlaybackId === memoId) {
      if (audioRef.current) {
        audioRef.current.pause();
        setActivePlaybackId(null);
      }
      return;
    }

    try {
      const blob = await storage.getAudioMemoBlob(memoId);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }

      setPlaybackUrl(url);
      setActivePlaybackId(memoId);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setActivePlaybackId(null);
      };
      audio.play();
    } catch (err) {
      console.error('Error playing audio memo', err);
    }
  };

  const deleteMemo = async (memoId: string) => {
    if (window.confirm('Ma hubtaa inaad tirtirto cod-xusuuseedkan?')) {
      if (activePlaybackId === memoId && audioRef.current) {
        audioRef.current.pause();
        setActivePlaybackId(null);
      }
      await storage.deleteAudioMemo(pdfId, memoId);
      loadAudioMemos();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
          
          {/* Pen Toggle button */}
          <button 
            onClick={() => {
              const nextMode = !isDrawingMode;
              setIsDrawingMode(nextMode);
              setDrawingTool(nextMode ? 'pen' : 'none');
            }}
            className={`p-1.5 rounded-full transition-colors ${isDrawingMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            title="Qalinka & Calaamadeeyaha (S-Pen)"
          >
            <Pen className="w-4 h-4" />
          </button>

          {/* Voice Memo button */}
          <button 
            onClick={() => setIsAudioPanelOpen(!isAudioPanelOpen)}
            className={`p-1.5 rounded-full transition-colors ${isAudioPanelOpen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            title="Cod-Xusuuseed (Voice Recording)"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Cyclical Page Theme button */}
          <button
            onClick={() => {
              const themes: ('normal' | 'sepia' | 'eye-care' | 'night')[] = ['normal', 'sepia', 'eye-care', 'night'];
              const nextIndex = (themes.indexOf(pageTheme) + 1) % themes.length;
              handleThemeChange(themes[nextIndex]);
            }}
            className="p-1.5 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
            title="Beddel Muuqaalka Bogga (Reading Theme)"
          >
            {pageTheme === 'normal' && <Sun className="w-4 h-4 text-slate-500" />}
            {pageTheme === 'sepia' && <Palette className="w-4 h-4 text-amber-500 animate-in spin-in-12 duration-300" />}
            {pageTheme === 'eye-care' && <Layers className="w-4 h-4 text-emerald-500 animate-in spin-in-12 duration-300" />}
            {pageTheme === 'night' && <Moon className="w-4 h-4 text-indigo-400" />}
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
          pageTheme={pageTheme}
          sidebarOpen={sidebarOpen}
          onPageChange={jumpToPage}
          pdfId={pdfId}
          drawingTool={drawingTool}
          penColor={penColor}
          penWidth={penWidth}
          highlighterColor={highlighterColor}
          highlighterWidth={highlighterWidth}
          eraserWidth={eraserWidth}
          canvasRefs={canvasRefs}
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

      {/* Samsung-Style S-Pen Toolbar Dock */}
      {isDrawingMode && (
        <div className="absolute top-[calc(env(safe-area-inset-top,0px)+4.1rem)] inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between shadow-md z-30 transition-all overflow-x-auto gap-4 scrollbar-thin">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pen Tool button */}
            <button
              onClick={() => setDrawingTool('pen')}
              className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
                drawingTool === 'pen'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Qalin adag"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Qalinka</span>
            </button>

            {/* Pen Quick Colors */}
            {drawingTool === 'pen' && (
              <div className="flex items-center gap-1 px-2 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-left-2 duration-200 shrink-0">
                {['#ef4444', '#3b82f6', '#22c55e', '#000000', '#a855f7'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      penColor === color
                        ? 'border-slate-800 dark:border-white scale-125 ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-slate-400'
                        : 'border-slate-300 dark:border-slate-700 hover:scale-110'
                    }`}
                  />
                ))}
                
                {/* Pen Width options */}
                <div className="flex items-center gap-1 ml-2">
                  {[2, 4, 7].map((w) => (
                    <button
                      key={w}
                      onClick={() => setPenWidth(w)}
                      className={`text-[10px] w-5 h-5 flex items-center justify-center rounded font-bold transition-colors ${
                        penWidth === w
                          ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Highlighter Tool button */}
            <button
              onClick={() => setDrawingTool('highlighter')}
              className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
                drawingTool === 'highlighter'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Calaamadeeye qoraal"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Calaamadeeyaha</span>
            </button>

            {/* Highlighter Colors */}
            {drawingTool === 'highlighter' && (
              <div className="flex items-center gap-1 px-2 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-left-2 duration-200 shrink-0">
                {[
                  'rgba(254, 240, 138, 0.5)', // Yellow
                  'rgba(187, 247, 208, 0.5)', // Green
                  'rgba(191, 219, 254, 0.5)', // Blue
                  'rgba(253, 164, 175, 0.5)', // Pink
                  'rgba(233, 213, 255, 0.5)'  // Purple
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setHighlighterColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      highlighterColor === color
                        ? 'border-slate-800 dark:border-white scale-125 ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-slate-400'
                        : 'border-slate-300 dark:border-slate-700 hover:scale-110'
                    }`}
                  />
                ))}
                
                {/* Highlighter widths */}
                <div className="flex items-center gap-1 ml-2">
                  {[10, 16, 24].map((w) => (
                    <button
                      key={w}
                      onClick={() => setHighlighterWidth(w)}
                      className={`text-[10px] w-5 h-5 flex items-center justify-center rounded font-bold transition-colors ${
                        highlighterWidth === w
                          ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {w === 10 ? 'S' : w === 16 ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Eraser Tool button */}
            <button
              onClick={() => setDrawingTool('eraser')}
              className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
                drawingTool === 'eraser'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tirtiraha sawirrada"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Tirtiraha</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Undo last stroke */}
            <button
              onClick={() => canvasRefs.current[metadata.lastPage]?.undo()}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Ka noqo sawirkii u dambeeyay"
            >
              <Undo className="w-4 h-4" />
              <span className="hidden md:inline">Ka noqo</span>
            </button>

            {/* Clear page */}
            <button
              onClick={() => canvasRefs.current[metadata.lastPage]?.clear()}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Tirtir dhammaan sawirrada bogga"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Eber</span>
            </button>
            
            <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Lock / Exit Drawing */}
            <button
              onClick={() => {
                setIsDrawingMode(false);
                setDrawingTool('none');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Kaydi</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Notes Audio Memo Panel */}
      {isAudioPanelOpen && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-30 flex flex-col p-4 animate-in slide-in-from-bottom-8 fade-in duration-200 max-h-[360px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
              <Mic className="w-4 h-4 text-emerald-500" />
              Cod-Xusuuseedka Dukumeentiga
            </h3>
            <button 
              onClick={() => {
                stopRecording();
                setIsAudioPanelOpen(false);
              }}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Memos List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 scrollbar-thin">
            {audioMemos.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                Ma jiraan wax codad ah oo la duubay.
              </div>
            ) : (
              audioMemos.map((memo) => (
                <div 
                  key={memo.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => playMemo(memo.id)}
                      className={`p-1.5 rounded-full transition-colors shrink-0 ${
                        activePlaybackId === memo.id
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      }`}
                    >
                      {activePlaybackId === memo.id ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate pr-1">
                        {memo.name}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <span>{new Date(memo.addedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{formatDuration(memo.duration || 0)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteMemo(memo.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Recording Actions Form */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
            {isRecording ? (
              <div className="flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold text-red-500">Waa la duubayaa...</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatDuration(recordingTime)}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow flex items-center gap-1"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Jooji</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Cinwaanka codka (ikhtiyaari)..."
                  value={newMemoTitle}
                  onChange={(e) => setNewMemoTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
                <button
                  onClick={startRecording}
                  className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg transition-all shadow flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Duub Cod-Xusuuseed</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
