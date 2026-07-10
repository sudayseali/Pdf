import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { Document, Page, Outline, pdfjs } from 'react-pdf';
import { AlignLeft } from 'lucide-react';
import { DrawingCanvas } from './DrawingCanvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker using Vite's ?worker&url suffix.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfPageItemProps {
  pageNum: number;
  pageW: number;
  pageTheme: 'normal' | 'night' | 'sepia' | 'eye-care';
  invertColors?: boolean;
  textRenderer: (textItem: any) => any;
  pdfId: string;
  drawingTool: 'none' | 'pen' | 'highlighter' | 'eraser';
  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  eraserWidth: number;
  canvasRefs?: React.MutableRefObject<Record<number, any>>;
  isNearViewport: boolean;
}

const PdfPageItem = memo(function PdfPageItem({
  pageNum,
  pageW,
  pageTheme,
  invertColors,
  textRenderer,
  pdfId,
  drawingTool,
  penColor,
  penWidth,
  highlighterColor,
  highlighterWidth,
  eraserWidth,
  canvasRefs,
  isNearViewport,
}: PdfPageItemProps) {
  // Use a default height estimate until loaded, then update it locally without re-rendering other pages.
  const [localHeight, setLocalHeight] = useState<number>(pageW * 1.414);

  // Keep height ratio responsive to width changes (e.g. on sidebar toggle or screen rotation)
  useEffect(() => {
    setLocalHeight((prev) => {
      const oldRatio = prev / pageW;
      const ratio = oldRatio > 0.5 && oldRatio < 3 ? oldRatio : 1.414;
      return pageW * ratio;
    });
  }, [pageW]);

  // Restricting DPR to 1.5 max is crucial for fast, high-speed mobile and webview performance.
  // It consumes 4x less memory and CPU than rendering at high-density (3x-4x) retina resolutions,
  // yet remains incredibly crisp.
  const dpr = useMemo(() => Math.min(window.devicePixelRatio || 1, 1.5), []);

  return (
    <div
      id={`pdf-page-${pageNum}`}
      className="relative overflow-hidden bg-white dark:bg-slate-900 shadow-md mb-6 rounded-md select-none border border-slate-200/10"
      style={{ width: pageW, height: localHeight }}
    >
      {isNearViewport ? (
        <>
          <Page
            pageNumber={pageNum}
            width={pageW}
            devicePixelRatio={dpr}
            className={`${
              pageTheme === 'night' || invertColors ? 'invert hue-rotate-180 brightness-95' : ''
            }`}
            renderTextLayer={true}
            renderAnnotationLayer={false} // Turn off for a massive rendering speed boost on mobile WebViews
            customTextRenderer={textRenderer}
            onLoadSuccess={(page) => {
              const originalHeight = page.originalHeight || page.height;
              const originalWidth = page.originalWidth || page.width || pageW;
              setLocalHeight(originalHeight * (pageW / originalWidth));
            }}
            loading={
              <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin opacity-50 mb-2"></div>
                <span className="text-slate-400 font-mono text-xs">Xawaareynaya... {pageNum}</span>
              </div>
            }
          />

          {/* Eye comfort overlays */}
          {pageTheme === 'sepia' && (
            <div className="absolute inset-0 bg-[#f4ecd8] mix-blend-multiply pointer-events-none z-20 rounded-md" />
          )}
          {pageTheme === 'eye-care' && (
            <div className="absolute inset-0 bg-[#e3f4e1] mix-blend-multiply pointer-events-none z-20 rounded-md" />
          )}

          {/* Drawing Overlay Canvas */}
          {pdfId && (
            <DrawingCanvas
              ref={(el) => {
                if (canvasRefs) {
                  if (el) {
                    canvasRefs.current[pageNum] = el;
                  } else {
                    delete canvasRefs.current[pageNum];
                  }
                }
              }}
              pdfId={pdfId}
              pageNumber={pageNum}
              width={pageW}
              height={localHeight}
              isDrawingEnabled={drawingTool !== 'none'}
              currentTool={drawingTool}
              strokeColor={penColor}
              strokeWidth={penWidth}
              highlighterColor={highlighterColor}
              highlighterWidth={highlighterWidth}
              eraserWidth={eraserWidth}
            />
          )}
        </>
      ) : (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin opacity-50 mb-2"></div>
          <span className="text-slate-400 font-mono text-xs">Page {pageNum}</span>
        </div>
      )}
    </div>
  );
});

interface PdfViewerProps {
  fileData: ArrayBuffer | null;
  currentPage: number;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  searchText?: string;
  invertColors?: boolean;
  pageTheme?: 'normal' | 'night' | 'sepia' | 'eye-care';
  sidebarOpen?: boolean;
  onPageChange?: (page: number) => void;

  // Drawing Props
  pdfId?: string;
  drawingTool?: 'none' | 'pen' | 'highlighter' | 'eraser';
  penColor?: string;
  penWidth?: number;
  highlighterColor?: string;
  highlighterWidth?: number;
  eraserWidth?: number;
  canvasRefs?: React.MutableRefObject<Record<number, any>>;
}

export const PdfViewer = memo(function PdfViewer({ 
  fileData, 
  currentPage, 
  zoom, 
  onLoadSuccess,
  searchText,
  invertColors,
  pageTheme = 'normal',
  sidebarOpen,
  onPageChange,

  // Drawing Props defaults
  pdfId = '',
  drawingTool = 'none',
  penColor = '#ef4444',
  penWidth = 3,
  highlighterColor = 'rgba(254, 240, 138, 0.4)',
  highlighterWidth = 14,
  eraserWidth = 18,
  canvasRefs
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  const isInternalScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const documentOptions = useMemo(() => ({
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/',
  }), []);

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

  if (!fileData) return null;

  // Calculate a responsive width with padding so the PDF doesn't stick to the edges
  const maxWidth = containerWidth - (sidebarOpen ? 320 : 0);

  const documentFile = useMemo(() => {
    return { data: fileData };
  }, [fileData]);

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative">
      <Document
        file={documentFile}
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
          className={`flex-1 overflow-auto transition-colors ${
            pageTheme === 'night' || invertColors
              ? 'bg-slate-950'
              : pageTheme === 'sepia'
              ? 'bg-[#efe6cf]'
              : pageTheme === 'eye-care'
              ? 'bg-[#dcefe0]'
              : 'bg-slate-100 dark:bg-slate-950'
          } relative scroll-smooth w-full h-full`}
        >
          <div className="flex flex-col items-center min-w-max mx-auto pt-28 sm:pt-20 pb-32">
            {numPages ? (
              Array.from(new Array(numPages), (el, index) => {
                const pageNum = index + 1;
                const pageW = maxWidth * zoom;
                
                // Virtualization: only render pages close to the current page to prevent UI freeze and memory explosion.
                // Keeping it at <= 1 ensures exactly 3 active pages are in memory at once (prev, current, next).
                const isNearViewport = Math.abs(pageNum - currentPage) <= 1;

                return (
                  <PdfPageItem
                    key={`page_${pageNum}`}
                    pageNum={pageNum}
                    pageW={pageW}
                    pageTheme={pageTheme}
                    invertColors={invertColors}
                    textRenderer={textRenderer}
                    pdfId={pdfId}
                    drawingTool={drawingTool}
                    penColor={penColor}
                    penWidth={penWidth}
                    highlighterColor={highlighterColor}
                    highlighterWidth={highlighterWidth}
                    eraserWidth={eraserWidth}
                    canvasRefs={canvasRefs}
                    isNearViewport={isNearViewport}
                  />
                );
              })
            ) : (
              <div className="w-full max-w-lg aspect-[1/1.4] bg-slate-200 dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
            )}
          </div>
        </div>
      </Document>
    </div>
  );
});
