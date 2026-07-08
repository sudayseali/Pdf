import { memo } from 'react';
import { ZoomIn, ZoomOut, Bookmark, BookmarkCheck } from 'lucide-react';

interface BottomControlsProps {
  currentPage: number;
  numPages: number | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const BottomControls = memo(function BottomControls({
  currentPage,
  numPages,
  zoom,
  onZoomIn,
  onZoomOut,
  isBookmarked,
  onToggleBookmark
}: BottomControlsProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200/50 dark:border-slate-800/50 rounded-full px-6 py-3 shadow-xl z-10 transition-colors">
      
      {/* Page Info */}
      <div className="flex items-center gap-1">
        <div className="px-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <span className="text-sm font-bold text-center">
            {currentPage}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            of {numPages || '?'}
          </span>
        </div>
      </div>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onToggleBookmark}
          className={`p-2 rounded-full transition-all ${
            isBookmarked 
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        
        <button 
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-medium text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button 
          onClick={onZoomIn}
          disabled={zoom >= 3}
          className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
