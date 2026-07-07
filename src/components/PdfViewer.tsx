import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker using Vite's ?worker&url suffix.
// This bundles the worker as a standard .js file, avoiding the .mjs MIME type issue on Android Capacitor,
// while correctly providing a URL string to workerSrc.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfViewerProps {
  fileData: ArrayBuffer | null;
  currentPage: number;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
}

export const PdfViewer = memo(function PdfViewer({ fileData, currentPage, zoom, onLoadSuccess }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    
    handleResize(); // Initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!fileConfig) return null;

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex flex-col items-center p-8 transition-colors"
    >
      <Document
        file={fileConfig}
        options={documentOptions}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        onLoadError={(error) => setErrorMessage(error.message)}
        loading={
          <div className="w-full max-w-lg aspect-[1/1.4] bg-white dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
        }
        error={
          <div className="text-red-500 text-center p-4">
            Failed to load PDF. {errorMessage ? `Error: ${errorMessage}` : ''}
          </div>
        }
      >
        <Page
          pageNumber={currentPage}
          width={Math.min(containerWidth - 64, 800) * zoom}
          className="shadow-2xl bg-white rounded overflow-hidden transition-all duration-200 transform origin-top"
          renderTextLayer={true}
          renderAnnotationLayer={true}
          loading={
             <div className="w-full max-w-lg aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 animate-pulse rounded shadow-2xl" />
          }
        />
      </Document>
    </div>
  );
});
