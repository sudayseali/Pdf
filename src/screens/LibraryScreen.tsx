import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Trash2, Clock, HardDrive, Search, X, Lock, Unlock, Tag, Plus, Star, LayoutGrid, List, ArrowDownAZ, ArrowDown01, Calendar } from 'lucide-react';
import { storage } from '../lib/storage';
import { PdfDocument } from '../types';

interface LibraryScreenProps {
  onOpenPdf: (id: string, isSensitive: boolean) => void;
}

interface LibraryDocument extends PdfDocument {
  progress?: number;
  lastPage?: number;
  numPages?: number;
}

const PRESET_TAGS = ['Work', 'Personal', 'Archive', 'Study', 'Important'];

type SortBy = 'recent' | 'name' | 'size' | 'date';
type ViewMode = 'list' | 'grid';

export function LibraryScreen({ onOpenPdf }: LibraryScreenProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Tag management state
  const [tagModalDocId, setTagModalDocId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  const tagModalDoc = tagModalDocId ? documents.find(d => d.id === tagModalDocId) : null;

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const docs = await storage.getLibrary();
      const docsWithMeta = await Promise.all(
        docs.map(async (doc) => {
          const meta = await storage.getPdfMetadata(doc.id);
          let progress = 0;
          if (meta.numPages && meta.numPages > 0) {
            progress = (meta.lastPage / meta.numPages) * 100;
          }
          return { ...doc, lastPage: meta.lastPage, numPages: meta.numPages, progress };
        })
      );
      setDocuments(docsWithMeta);
    } catch (error) {
      console.error('Failed to load library', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this PDF from your device?')) {
      await storage.deletePdf(id);
      loadLibrary();
    }
  };

  const handleToggleSensitive = async (e: React.MouseEvent, id: string, isSensitive: boolean) => {
    e.stopPropagation();
    await storage.toggleSensitive(id, !isSensitive);
    loadLibrary();
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
    e.stopPropagation();
    await storage.toggleFavorite(id, !isFavorite);
    loadLibrary();
  };

  const handleToggleTag = async (docId: string, tag: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    const currentTags = doc.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
      
    await storage.updateTags(docId, newTags);
    loadLibrary();
  };

  const handleAddCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagModalDocId || !customTagInput.trim()) return;
    
    const doc = documents.find(d => d.id === tagModalDocId);
    if (!doc) return;
    
    const currentTags = doc.tags || [];
    if (!currentTags.includes(customTagInput.trim())) {
      await storage.updateTags(tagModalDocId, [...currentTags, customTagInput.trim()]);
      loadLibrary();
    }
    setCustomTagInput('');
  };

  const openTagModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTagModalDocId(id);
    setTimeout(() => {
      tagInputRef.current?.focus();
    }, 100);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    }).format(new Date(ms));
  };

  const filteredAndSortedDocuments = useMemo(() => {
    let result = documents;

    // Filter by tag
    if (selectedTagFilter) {
      result = result.filter(doc => (doc.tags || []).includes(selectedTagFilter));
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(doc => {
        const matchName = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchTag = (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchName || matchTag;
      });
    }

    // Sort
    return result.sort((a, b) => {
      // Favorites always on top
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
          return b.addedAt - a.addedAt;
        case 'recent':
        default:
          return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      }
    });
  }, [documents, searchQuery, selectedTagFilter, sortBy]);

  // Extract all unique tags for the filter bar
  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => {
      (doc.tags || []).forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [documents]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600">
            <HardDrive className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Library is empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-2 leading-relaxed">
              PDFs you open will be saved here for offline viewing.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View & Sort Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${sortBy === 'recent' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <Clock className="w-3.5 h-3.5" /> Recent
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${sortBy === 'name' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" /> Name
                </button>
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${sortBy === 'date' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Date
                </button>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden md:block mx-1" />

              <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          {allUniqueTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTagFilter(null)}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${
                  selectedTagFilter === null 
                    ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-900' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {allUniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${
                    selectedTagFilter === tag 
                      ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Document List/Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              {searchQuery || selectedTagFilter ? 'Search Results' : 'Your Library'}
            </h2>
            
            {filteredAndSortedDocuments.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                No documents found.
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
                {filteredAndSortedDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    onClick={() => onOpenPdf(doc.id, !!doc.isSensitive)}
                    className={`bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.99] overflow-hidden ${
                      viewMode === 'grid' ? 'flex flex-col' : 'flex items-center p-3 gap-4'
                    }`}
                  >
                    {/* Icon section */}
                    <div className={`${viewMode === 'grid' ? 'h-32 w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center justify-center relative group' : 'w-12 h-12 shrink-0 rounded-lg flex items-center justify-center shadow-sm relative group'} ${doc.isSensitive ? 'text-amber-500' : 'text-blue-500'}`}>
                      {/* Background placeholder based on view mode */}
                      {viewMode === 'grid' ? (
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${doc.isSensitive ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                           {doc.isSensitive ? <Lock className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                         </div>
                      ) : (
                         <div className={`w-full h-full rounded-lg flex items-center justify-center ${doc.isSensitive ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                           {doc.isSensitive ? <Lock className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                         </div>
                      )}
                      
                      {/* Favorite Badge Absolute */}
                      {doc.isFavorite && (
                        <div className={`absolute ${viewMode === 'grid' ? 'top-3 right-3' : '-top-1 -right-1'} text-yellow-400 drop-shadow-sm`}>
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-4 flex flex-col' : ''}`}>
                      <h3 className={`text-sm font-semibold text-slate-900 dark:text-slate-100 truncate ${viewMode === 'grid' ? 'mb-1' : ''}`}>
                        {doc.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <span>{formatSize(doc.size)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(doc.addedAt)}
                        </div>
                      </div>
                      
                      {doc.numPages ? (
                        <div className="flex items-center gap-3 mt-2.5">
                          <div className="flex-1 max-w-[120px] h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all" 
                              style={{ width: `${doc.progress || 0}%` }} 
                            />
                          </div>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold tracking-wide">{Math.round(doc.progress || 0)}% Read</span>
                        </div>
                      ) : null}
                      
                      {doc.tags && doc.tags.length > 0 && (
                        <div className={`flex flex-wrap items-center gap-1.5 ${viewMode === 'grid' ? 'mt-4' : 'mt-2'}`}>
                          {doc.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions for Grid View */}
                      {viewMode === 'grid' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => handleToggleFavorite(e, doc.id, !!doc.isFavorite)}
                              className={`p-1.5 rounded-full transition-colors ${doc.isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-slate-400 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              title={doc.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                            >
                              <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                              onClick={(e) => openTagModal(e, doc.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                              title="Manage tags"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => handleToggleSensitive(e, doc.id, !!doc.isSensitive)}
                              className={`p-1.5 rounded-full transition-colors ${doc.isSensitive ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              title={doc.isSensitive ? 'Remove protection' : 'Protect document'}
                            >
                              {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, doc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions for List View */}
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleToggleFavorite(e, doc.id, !!doc.isFavorite)}
                          className={`p-2 rounded-full transition-colors ${doc.isFavorite ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-slate-400 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          title={doc.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => openTagModal(e, doc.id)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Manage tags"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleToggleSensitive(e, doc.id, !!doc.isSensitive)}
                          className={`p-2 rounded-full transition-colors ${doc.isSensitive ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          title={doc.isSensitive ? 'Remove protection' : 'Protect document'}
                        >
                          {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, doc.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {tagModalDocId && tagModalDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setTagModalDocId(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" />
                Manage Tags
              </h2>
              <button 
                onClick={() => setTagModalDocId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Editing tags for:</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{tagModalDoc.name}</p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Preset Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isSelected = (tagModalDoc.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => handleToggleTag(tagModalDoc.id, tag)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800/60 dark:text-blue-300' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Custom Tags</h3>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {(tagModalDoc.tags || []).filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tagModalDoc.id, tag)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors border bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800/60 dark:text-blue-300 flex items-center gap-1 group"
                    >
                      {tag}
                      <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAddCustomTag} className="relative">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="Add a new tag..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                  <button
                    type="submit"
                    disabled={!customTagInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 disabled:text-slate-400 p-1 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
