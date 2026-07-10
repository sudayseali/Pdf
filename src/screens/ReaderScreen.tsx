import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sun, Moon, Sidebar as SidebarIcon, X, FileText, Pen, Highlighter, Eraser, Undo, Mic, Play, Pause, Trash2, Check, Square, Palette, Layers, Volume2 } from 'lucide-react';
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
  const [audioPermissionError, setAudioPermissionError] = useState(false);
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

  // TTS & Study Notes State
  const [isTtsPanelOpen, setIsTtsPanelOpen] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [isTtsPaused, setIsTtsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

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

  // Load Speech Voices on boot
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        const engVoice = voices.find(v => v.lang.startsWith('en') || v.default);
        if (engVoice) setTtsVoice(engVoice);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update TTS text when page changes, loads the typed page notes
  useEffect(() => {
    if (metadata) {
      setTtsText(metadata.notes || '');
    }
  }, [metadata?.lastPage, metadata?.notes]);

  const handleSavePageNotes = () => {
    setMetadata(prev => {
      if (!prev) return null;
      return { ...prev, notes: ttsText };
    });
  };

  const handleTtsPlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    if (isTtsPaused) {
      window.speechSynthesis.resume();
      setIsTtsSpeaking(true);
      setIsTtsPaused(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop current speech first

    const textToSpeak = ttsText.trim() || `Kani waa bogga ${metadata?.lastPage || 1}. Ma jiraan wax qoraal cashar ah oo aad halkan ku qoratay. Fadlan halkan ku qor wax kasta si aan kuugu akhriyo!`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    if (ttsVoice) {
      utterance.voice = ttsVoice;
    }
    utterance.rate = ttsSpeed;
    
    utterance.onend = () => {
      setIsTtsSpeaking(false);
      setIsTtsPaused(false);
    };

    utterance.onerror = () => {
      setIsTtsSpeaking(false);
      setIsTtsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsTtsSpeaking(true);
    setIsTtsPaused(false);
  };

  const handleTtsPause = () => {
    if ('speechSynthesis' in window && isTtsSpeaking) {
      window.speechSynthesis.pause();
      setIsTtsSpeaking(false);
      setIsTtsPaused(true);
    }
  };

  const handleTtsStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTtsSpeaking(false);
      setIsTtsPaused(false);
    }
  };

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
      setAudioPermissionError(false);
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
      setAudioPermissionError(true);
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
      if (page === prev.lastPage) return prev; // No-op if it's the same page
      if (page < 1 || (prev.numPages && page > prev.numPages)) return prev;
      
      // Increment offline page flips
      storage.incrementPageFlips().catch(err => {
        console.error('Failed to increment page flips:', err);
      });
      
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
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 sm:px-6 pt-10 pb-3 sm:pt-4 sm:pb-4 h-[90px] sm:h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm z-20 transition-all">
        
        {/* Left Side: Back & Title */}
        <div className="flex items-center gap-4 w-1/3">
          <button 
            onClick={onBack}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-700/50 cursor-pointer active:scale-95"
            title="Back to Library"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">
              Now Reading
            </span>
            <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-[300px] font-display tracking-tight mt-0.5">
              {documentInfo?.name || 'Document'}
            </h1>
          </div>
        </div>
        
        {/* Center: Search (Visible when active) */}
        <div className="flex-1 flex justify-center">
           {isSearchOpen && (
            <div className="relative w-full max-w-sm animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search text in PDF..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl pl-10 pr-10 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button 
                onClick={() => setSearchText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!isSearchOpen && (
            <div className="sm:hidden flex flex-col items-center">
               <h1 className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px] font-display tracking-tight">
                {documentInfo?.name || 'Document'}
              </h1>
            </div>
          )}
        </div>
        
        {/* Right Side: Action Tools */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          
          <div className="flex items-center bg-slate-50/80 dark:bg-slate-800/80 p-1.5 rounded-[1.25rem] shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <button 
              onClick={toggleSearch}
              className={`p-2 rounded-xl transition-all cursor-pointer ${isSearchOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 hover:shadow-sm'}`}
              title="Search text"
            >
              <Search className="w-4 h-4" />
            </button>
            
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5" />
            
            {/* Pen Toggle button */}
            <button 
              onClick={() => {
                const nextMode = !isDrawingMode;
                setIsDrawingMode(nextMode);
                setDrawingTool(nextMode ? 'pen' : 'none');
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${isDrawingMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 hover:shadow-sm'}`}
              title="Pen & Highlighter (S-Pen)"
            >
              <Pen className="w-4 h-4" />
            </button>

            {/* Voice Memo button */}
            <button 
              onClick={() => {
                setIsAudioPanelOpen(!isAudioPanelOpen);
                setIsTtsPanelOpen(false); // close TTS panel if open
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${isAudioPanelOpen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 hover:shadow-sm'}`}
              title="Voice Memo"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* TTS & Study Notes button */}
            <button 
              onClick={() => {
                setIsTtsPanelOpen(!isTtsPanelOpen);
                setIsAudioPanelOpen(false); // close audio panel if open
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${isTtsPanelOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 hover:shadow-sm'}`}
              title="Qoraalka & Cod ku Akhris"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-50/80 dark:bg-slate-800/80 p-1.5 rounded-[1.25rem] shadow-sm border border-slate-200/50 dark:border-slate-700/50 hidden sm:flex">
            {/* Cyclical Page Theme button */}
            <button
              onClick={() => {
                const themes: ('normal' | 'sepia' | 'eye-care' | 'night')[] = ['normal', 'sepia', 'eye-care', 'night'];
                const nextIndex = (themes.indexOf(pageTheme) + 1) % themes.length;
                handleThemeChange(themes[nextIndex]);
              }}
              className="p-2 rounded-xl transition-all text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer relative overflow-hidden hover:shadow-sm"
              title="Change Page Theme"
            >
              <div className="absolute inset-0 transition-opacity duration-300" />
              {pageTheme === 'normal' && <Sun className="w-4 h-4 text-slate-500" />}
              {pageTheme === 'sepia' && <Palette className="w-4 h-4 text-amber-500 animate-in spin-in-12 duration-300" />}
              {pageTheme === 'eye-care' && <Layers className="w-4 h-4 text-emerald-500 animate-in spin-in-12 duration-300" />}
              {pageTheme === 'night' && <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
          
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
        <div className="absolute top-[100px] sm:top-[90px] inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3 flex items-center justify-between shadow-sm z-30 transition-all overflow-x-auto gap-4 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            {/* Pen Tool button */}
            <button
              onClick={() => setDrawingTool('pen')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                drawingTool === 'pen'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
              }`}
              title="Solid Pen"
            >
              <Pen className="w-4 h-4" />
              <span>Pen</span>
            </button>

            {/* Pen Quick Colors */}
            {drawingTool === 'pen' && (
              <div className="flex items-center gap-1.5 px-3 border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2 duration-200 shrink-0">
                {['#ef4444', '#3b82f6', '#22c55e', '#000000', '#a855f7'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                      penColor === color
                        ? 'border-slate-800 dark:border-white scale-125 ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 hover:scale-110 shadow-sm'
                    }`}
                  />
                ))}
                
                {/* Pen Width options */}
                <div className="flex items-center gap-1 ml-2">
                  {[2, 4, 7].map((w) => (
                    <button
                      key={w}
                      onClick={() => setPenWidth(w)}
                      className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer ${
                        penWidth === w
                          ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                drawingTool === 'highlighter'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
              }`}
              title="Text Highlighter"
            >
              <Highlighter className="w-4 h-4" />
              <span>Highlight</span>
            </button>

            {/* Highlighter Colors */}
            {drawingTool === 'highlighter' && (
              <div className="flex items-center gap-1.5 px-3 border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2 duration-200 shrink-0">
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
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                      highlighterColor === color
                        ? 'border-slate-800 dark:border-white scale-125 ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 hover:scale-110 shadow-sm'
                    }`}
                  />
                ))}
                
                {/* Highlighter widths */}
                <div className="flex items-center gap-1 ml-2">
                  {[10, 16, 24].map((w) => (
                    <button
                      key={w}
                      onClick={() => setHighlighterWidth(w)}
                      className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer ${
                        highlighterWidth === w
                          ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                drawingTool === 'eraser'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-500/30 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
              }`}
              title="Drawing Eraser"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden md:inline">Eraser</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            {/* Undo last stroke */}
            <button
              onClick={() => canvasRefs.current[metadata.lastPage]?.undo()}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1 text-xs cursor-pointer"
              title="Undo last stroke"
            >
              <Undo className="w-4 h-4" />
            </button>

            {/* Clear page */}
            <button
              onClick={() => canvasRefs.current[metadata.lastPage]?.clear()}
              className="p-2.5 text-red-500 hover:bg-white dark:hover:bg-red-900/30 rounded-xl transition-all flex items-center gap-1 text-xs cursor-pointer"
              title="Clear all page drawings"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Lock / Exit Drawing */}
            <button
              onClick={() => {
                setIsDrawingMode(false);
                setDrawingTool('none');
              }}
              className="px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
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
              Document Audio Notes
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

          {audioPermissionError && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2.5 rounded-xl text-[10px] leading-relaxed border border-red-100 dark:border-red-950 shrink-0 mt-2">
              <p className="font-semibold mb-1">Microphone Error!</p>
              The app is running inside a restricted frame or mobile preview. If recording fails, please click "Open in New Tab" to launch the standalone SilentPDF reader and allow microphone access.
            </div>
          )}

          {/* Memos List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 scrollbar-thin">
            {audioMemos.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                No audio notes recorded yet.
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
                  <span className="text-[10px] font-bold text-red-500">Recording...</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatDuration(recordingTime)}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow flex items-center gap-1"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Audio title (optional)..."
                  value={newMemoTitle}
                  onChange={(e) => setNewMemoTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
                <button
                  onClick={startRecording}
                  className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg transition-all shadow flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Record Audio Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text-To-Speech & Page Study Notes Panel */}
      {isTtsPanelOpen && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-30 flex flex-col p-4 animate-in slide-in-from-bottom-8 fade-in duration-200 max-h-[420px]">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
              <Volume2 className="w-4 h-4 text-blue-500" />
              <span>Qoraalka Bogga & Cod</span>
            </h3>
            <button 
              onClick={() => {
                handleTtsStop();
                setIsTtsPanelOpen(false);
              }}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2.5 space-y-3.5 scrollbar-thin">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Qoraalka Casharka (Page Notes)
              </label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Ku qor ama halkan ku soo koob casharka bogaan si cod ahaan laguugu akhriyo..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-800 dark:text-slate-200"
                rows={4}
              />
            </div>

            {/* Voice Selectors & Speed Options */}
            <div className="space-y-2">
              {availableVoices.length > 0 && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nooca Codka (Voice)
                  </label>
                  <select
                    value={ttsVoice?.name || ''}
                    onChange={(e) => {
                      const selected = availableVoices.find(v => v.name === e.target.value);
                      if (selected) setTtsVoice(selected);
                    }}
                    className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    {availableVoices.slice(0, 15).map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Xawaaraha (Speed: {ttsSpeed}x)
                </label>
                <div className="flex gap-1.5">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTtsSpeed(s)}
                      className={`text-[10px] flex-1 py-1 rounded font-bold border transition-colors ${
                        ttsSpeed === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
            <button
              onClick={handleSavePageNotes}
              className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-emerald-500" />
              Kaydi Qoraalka
            </button>

            <div className="flex gap-1.5">
              {isTtsSpeaking ? (
                <button
                  onClick={handleTtsPause}
                  className="px-3.5 py-2 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Pause className="w-3 h-3 fill-current" />
                  Haye
                </button>
              ) : (
                <button
                  onClick={handleTtsPlay}
                  className="px-3.5 py-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Dhageyso
                </button>
              )}

              <button
                onClick={handleTtsStop}
                disabled={!isTtsSpeaking && !isTtsPaused}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg disabled:opacity-40"
                title="Stop speech"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
