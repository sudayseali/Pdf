import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { Document, Page, Outline, pdfjs } from 'react-pdf';
import { AlignLeft, FileText } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker using Vite's ?worker&url suffix.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfViewerProps {
  fileData: ArrayBuffer | null;
  currentPage: number;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  searchText?: string;
  invertColors?: boolean;
  sidebarOpen?: boolean;
  sidebarTab?: 'outline' | 'notes';
  notes?: string;
  onNotesChange?: (notes: string) => void;
  onPageChange?: (page: number) => void;
}

export const PdfViewer = memo(function PdfViewer({ 
  fileData, 
  currentPage, 
  zoom, 
  onLoadSuccess,
  searchText,
  invertColors,
  sidebarOpen,
  sidebarTab: externalSidebarTab,
  notes,
  onNotesChange,
  onPageChange
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [internalSidebarTab, setInternalSidebarTab] = useState<'outline' | 'notes'>(externalSidebarTab || 'outline');

  useEffect(() => {
    if (externalSidebarTab) {
      setInternalSidebarTab(externalSidebarTab);
    }
  }, [externalSidebarTab]);

  const documentOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
  }), []);

  const fileConfig = useMemo(() => {
    if (!fileData) return null;
    return { data: new Uint8Array(fileData) };
  }, [fileData]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    // Slight delay to allow layout to settle after sidebar toggles
    const timeout = setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [sidebarOpen]);

  const textRenderer = useCallback((textItem: any) => {
    const str = textItem.str;
    if (!searchText) return str;
    
    // Case-insensitive regex search
    const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    if (!str.match(regex)) return str;
    
    const parts = str.split(regex);
    return (
      <React.Fragment>
        {parts.map((part: string, index: number) => {
          if (part.toLowerCase() === searchText.toLowerCase()) {
            return <mark key={index} className="bg-yellow-300 text-black px-0.5 rounded shadow-sm">{part}</mark>;
          }
          return part;
        })}
      </React.Fragment>
    );
  }, [searchText]);

  if (!fileConfig) return null;

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative">
      <Document
        file={fileConfig}
        options={documentOptions}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        onLoadError={(error) => setErrorMessage(error.message)}
        loading={
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <div className="w-full max-w-lg aspect-[1/1.4] bg-white dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
          </div>
        }
        error={
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <div className="text-red-500 text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-md">
              Failed to load PDF. {errorMessage ? `Error: ${errorMessage}` : ''}
            </div>
          </div>
        }
        className="flex-1 flex flex-row overflow-hidden w-full"
      >
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 shrink-0 h-full shadow-lg">
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setInternalSidebarTab('outline')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${internalSidebarTab === 'outline' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <AlignLeft className="w-4 h-4" />
                Table of Contents
              </button>
              <button 
                onClick={() => setInternalSidebarTab('notes')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${internalSidebarTab === 'notes' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <FileText className="w-4 h-4" />
                Notes
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {internalSidebarTab === 'outline' && (
                <div className="text-sm dark:text-slate-300 outline-container">
                  <Outline 
                    className="outline-list"
                    onItemClick={({ pageNumber }) => onPageChange && onPageChange(pageNumber)}
                  />
                  <style>{`
                    .outline-container ul { list-style: none; padding-left: 1rem; margin-top: 0.5rem; }
                    .outline-container > ul { padding-left: 0; }
                    .outline-container li { margin-bottom: 0.5rem; }
                    .outline-container a { color: inherit; text-decoration: none; display: block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; transition: background 0.2s; }
                    .outline-container a:hover { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                  `}</style>
                </div>
              )}
              {internalSidebarTab === 'notes' && (
                <textarea 
                  className="w-full h-full min-h-[300px] resize-none bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none placeholder-slate-400 text-sm leading-relaxed"
                  placeholder="Write your notes here... They will be saved automatically with this document."
                  value={notes || ''}
                  onChange={e => onNotesChange && onNotesChange(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {/* PDF Page Container */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-auto flex flex-col items-center p-4 md:p-8 transition-colors ${invertColors ? 'bg-slate-900' : 'bg-slate-100 dark:bg-slate-950'}`}
        >
          <Page
            pageNumber={currentPage}
            width={Math.min(containerWidth - 64, 800) * zoom}
            className={`shadow-2xl bg-white rounded overflow-hidden transition-all duration-200 transform origin-top ${invertColors ? 'invert hue-rotate-180 brightness-95' : ''}`}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            customTextRenderer={textRenderer}
            loading={
              <div className="w-full max-w-lg aspect-[1/1.4] bg-slate-200 dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
            }
          />
        </div>
      </Document>
    </div>
  );
});
