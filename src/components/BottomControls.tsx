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
    <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-full px-6 py-2 shadow-2xl z-10 transition-all overflow-hidden max-w-[95vw] ring-1 ring-slate-900/5 dark:ring-white/5">
      <div className="flex items-center gap-2">
        {/* Page Info */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <span className="text-sm font-black font-display tracking-tight">
              {currentPage}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              / {numPages || '?'}
            </span>
            {numPages && (
              <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 ml-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                {percentage}%
              </span>
            )}
          </div>
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-3" />

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button 
            onClick={onToggleBookmark}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-sm ${
              isBookmarked 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={onZoomOut}
            disabled={zoom <= 0.5}
            className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer border border-transparent"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={onZoomIn}
            disabled={zoom >= 3}
            className="p-2 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer border border-transparent"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle Progress Bar Line */}
      {numPages && numPages > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent overflow-hidden">
          <div 
            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300 opacity-80"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
});
