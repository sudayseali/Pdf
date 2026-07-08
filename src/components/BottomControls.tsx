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
  const percentage = numPages ? Math.round((currentPage / numPages) * 100) : 0;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-5 py-3 shadow-xl z-10 transition-all overflow-hidden max-w-[95vw]">
      <div className="flex items-center gap-2 pb-1.5">
        {/* Page Info */}
        <div className="flex items-center gap-1">
          <div className="px-1.5 flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <span className="text-sm font-bold text-center">
              {currentPage}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              / {numPages || '?'}
            </span>
            {numPages && (
              <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 ml-1.5 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-100/50 dark:border-blue-900/30">
                {percentage}%
              </span>
            )}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

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
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={onZoomIn}
            disabled={zoom >= 3}
            className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle Progress Bar Line */}
      {numPages && numPages > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/40 overflow-hidden">
          <div 
            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
});
