import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { Document, Page, Outline, pdfjs } from 'react-pdf';
import { AlignLeft } from 'lucide-react';
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
  onPageChange
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  const isInternalScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Observer to track which page is mostly in view
  useEffect(() => {
    if (!numPages || !containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisiblePage = -1;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pageNum = parseInt(entry.target.id.replace('pdf-page-', ''), 10);
            if (pageNum) mostVisiblePage = pageNum;
          }
        });
        
        if (mostVisiblePage !== -1 && onPageChange) {
          isInternalScroll.current = true;
          onPageChange(mostVisiblePage);
          
          if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
          scrollTimeout.current = setTimeout(() => {
            isInternalScroll.current = false;
          }, 500);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9], // Check at multiple thresholds for accuracy
        rootMargin: "-20% 0px -20% 0px"
      }
    );

    const pageElements = containerRef.current.querySelectorAll('[id^="pdf-page-"]');
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [numPages, onPageChange]);

  // Scroll to page when currentPage changes externally (e.g. outline click, prev/next buttons)
  useEffect(() => {
    if (isInternalScroll.current) return;
    
    const el = document.getElementById(`pdf-page-${currentPage}`);
    if (el && containerRef.current) {
      const container = containerRef.current;
      // Scroll such that the page is near the top, accounting for the top bar
      const topPos = el.offsetTop - container.offsetTop - 80;
      container.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  }, [currentPage]);

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

  // Calculate a responsive width with padding so the PDF doesn't stick to the edges
  const maxWidth = containerWidth - (sidebarOpen ? 320 : 0);

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative">
      <Document
        file={fileConfig}
        options={documentOptions}
        onLoadSuccess={(pdf) => {
          setNumPages(pdf.numPages);
          onLoadSuccess(pdf.numPages);
        }}
        onLoadError={(error) => setErrorMessage(error.message)}
        loading={
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
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
            <div className="flex border-b border-slate-200 dark:border-slate-800 p-3 mt-14">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <AlignLeft className="w-4 h-4" />
                Table of Contents
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="text-sm dark:text-slate-300 outline-container">
                <Outline 
                  className="outline-list"
                  onItemClick={({ pageNumber }) => {
                    isInternalScroll.current = false;
                    if (onPageChange) onPageChange(pageNumber);
                  }}
                />
                <style>{`
                  .outline-container ul { list-style: none; padding-left: 1rem; margin-top: 0.5rem; }
                  .outline-container > ul { padding-left: 0; }
                  .outline-container li { margin-bottom: 0.5rem; }
                  .outline-container a { color: inherit; text-decoration: none; display: block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; transition: background 0.2s; }
                  .outline-container a:hover { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                `}</style>
              </div>
            </div>
          </div>
        )}

        {/* PDF Pages Container (Continuous Scroll) */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-auto transition-colors ${invertColors ? 'bg-slate-900' : 'bg-slate-100 dark:bg-slate-950'} relative scroll-smooth w-full h-full`}
        >
          <div className="flex flex-col items-center min-w-max mx-auto pt-[calc(env(safe-area-inset-top,0px)+74px)] pb-32">
            {numPages ? (
              Array.from(new Array(numPages), (el, index) => (
                <div 
                  key={`page_${index + 1}`} 
                  id={`pdf-page-${index + 1}`}
                  className="overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200/20 dark:border-slate-800/10 last:border-b-0"
                  style={{ width: maxWidth * zoom }}
                >
                  <Page
                    pageNumber={index + 1}
                    width={maxWidth * zoom}
                    className={`${invertColors ? 'invert hue-rotate-180 brightness-95' : ''}`}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    customTextRenderer={textRenderer}
                    loading={
                      <div className="w-full aspect-[1/1.414] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    }
                  />
                </div>
              ))
            ) : (
              <div className="w-full max-w-lg aspect-[1/1.4] bg-slate-200 dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
            )}
          </div>
        </div>
      </Document>
    </div>
  );
});
