import { useState, useEffect, useCallback, useRef } from 'react';
import { PdfViewer } from '../components/PdfViewer';
import { BottomControls } from '../components/BottomControls';
import { storage } from '../lib/storage';
import { PdfMetadata } from '../types';

interface ReaderScreenProps {
  pdfId: string;
  onSessionEnd?: (durationSeconds: number) => void;
}

export function ReaderScreen({ pdfId, onSessionEnd }: ReaderScreenProps) {
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
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
      
      setFileData(data);
      setMetadata(meta);
      
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

  const handlePageChange = useCallback((delta: number) => {
    setMetadata(prev => {
      if (!prev) return null;
      const newPage = prev.lastPage + delta;
      if (newPage < 1 || (prev.numPages && newPage > prev.numPages)) return prev;
      return { ...prev, lastPage: newPage };
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

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.5)), []);

  const handleLoadSuccess = useCallback((pages: number) => {
    setNumPages(pages);
    setMetadata(prev => prev ? { ...prev, numPages: pages } : null);
  }, []);

  const handlePrevPage = useCallback(() => handlePageChange(-1), [handlePageChange]);
  const handleNextPage = useCallback(() => handlePageChange(1), [handlePageChange]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!fileData || !metadata) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Document not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <PdfViewer 
        fileData={fileData}
        currentPage={metadata.lastPage}
        zoom={zoom}
        onLoadSuccess={handleLoadSuccess}
      />
      
      <BottomControls 
        currentPage={metadata.lastPage}
        numPages={numPages}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        isBookmarked={metadata.bookmarks.includes(metadata.lastPage)}
        onToggleBookmark={handleToggleBookmark}
      />
    </div>
  );
}
