import { memo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Bookmark, BookmarkCheck } from 'lucide-react';

interface BottomControlsProps {
  currentPage: number;
  numPages: number | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const BottomControls = memo(function BottomControls({
  currentPage,
  numPages,
  onPrevPage,
  onNextPage,
  zoom,
  onZoomIn,
  onZoomOut,
  isBookmarked,
  onToggleBookmark
}: BottomControlsProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-6 py-3 shadow-2xl z-10 transition-colors">
      
      {/* Pagination */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="px-4 flex items-center gap-2 border-x border-slate-200 dark:border-slate-800 mx-1">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[1.5rem] text-center">
            {currentPage}
          </span>
          <span className="text-xs text-slate-500">
            of {numPages || '?'}
          </span>
        </div>
        <button 
          onClick={onNextPage}
          disabled={numPages ? currentPage >= numPages : true}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onToggleBookmark}
          className={`p-2 rounded-full transition-colors ${
            isBookmarked 
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        
        <button 
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button 
          onClick={onZoomIn}
          disabled={zoom >= 3}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
