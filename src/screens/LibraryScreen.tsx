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
  notes?: string;
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
  
  // Notes state
  const [notesModalDocId, setNotesModalDocId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  
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
          return { ...doc, lastPage: meta.lastPage, numPages: meta.numPages, progress, notes: meta.notes };
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

  const handleOpenNotes = (e: React.MouseEvent, doc: LibraryDocument) => {
    e.stopPropagation();
    setNotesInput(doc.notes || '');
    setNotesModalDocId(doc.id);
  };

  const handleSaveNotes = async () => {
    if (!notesModalDocId) return;
    
    const meta = await storage.getPdfMetadata(notesModalDocId);
    await storage.savePdfMetadata(notesModalDocId, { ...meta, notes: notesInput });
    
    setDocuments(prev => prev.map(doc => 
      doc.id === notesModalDocId ? { ...doc, notes: notesInput } : doc
    ));
    
    setNotesModalDocId(null);
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
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl pl-11 pr-10 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View & Sort Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar shrink-0">
              <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${sortBy === 'recent' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <Clock className="w-4 h-4" /> Recent
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${sortBy === 'name' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <ArrowDownAZ className="w-4 h-4" /> Name
                </button>
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${sortBy === 'date' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <Calendar className="w-4 h-4" /> Date
                </button>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 hidden md:block mx-1" />

              <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200/50 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          {allUniqueTags.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              <button
                onClick={() => setSelectedTagFilter(null)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                  selectedTagFilter === null 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              {allUniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                    selectedTagFilter === tag 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Document List/Grid */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              {searchQuery || selectedTagFilter ? 'Search Results' : 'Your Library'}
            </h2>
            
            {filteredAndSortedDocuments.length === 0 ? (
              <div className="text-center py-16 text-sm font-medium text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed shadow-sm">
                No documents found.
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3.5'}>
                {filteredAndSortedDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    onClick={() => onOpenPdf(doc.id, !!doc.isSensitive)}
                    className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-blue-500/50 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden group ${
                      viewMode === 'grid' ? 'flex flex-col h-full' : 'flex items-center p-4 sm:p-5 gap-5'
                    }`}
                  >
                    {/* Icon section */}
                    <div className={`${viewMode === 'grid' ? 'h-40 w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center relative' : 'w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center shadow-sm relative'} ${doc.isSensitive ? 'text-amber-500' : 'text-blue-500'}`}>
                      {/* Background placeholder based on view mode */}
                      {viewMode === 'grid' ? (
                         <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-sm border ${doc.isSensitive ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-900/50' : 'bg-blue-100 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-900/50'} transition-transform duration-300 group-hover:scale-110`}>
                           {doc.isSensitive ? <Lock className="w-10 h-10" /> : <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />}
                         </div>
                      ) : (
                         <div className={`w-full h-full rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105 ${doc.isSensitive ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-100/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-100/50 dark:border-blue-800/50 text-blue-600 dark:text-blue-400'}`}>
                           {doc.isSensitive ? <Lock className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                         </div>
                      )}
                      
                      {/* Favorite Badge Absolute */}
                      {doc.isFavorite && (
                        <div className={`absolute ${viewMode === 'grid' ? 'top-4 right-4' : '-top-2 -right-2'} text-yellow-400 drop-shadow-sm`}>
                          <Star className="w-6 h-6 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-5 flex flex-col justify-between' : ''}`}>
                      <div>
                        <h3 className={`text-base font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-display tracking-tight ${viewMode === 'grid' ? 'mb-1.5' : ''}`}>
                          {doc.name}
                        </h3>
                        
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                          <span>{formatSize(doc.size)}</span>
                          <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(doc.addedAt)}
                          </div>
                        </div>
                        
                        {doc.numPages ? (
                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex-1 max-w-[160px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all" 
                                style={{ width: `${doc.progress || 0}%` }} 
                              />
                            </div>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-widest font-mono uppercase bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">{Math.round(doc.progress || 0)}% READ</span>
                          </div>
                        ) : null}
                        
                        {doc.tags && doc.tags.length > 0 && (
                          <div className={`flex flex-wrap items-center gap-2 ${viewMode === 'grid' ? 'mt-4' : 'mt-3'}`}>
                            {doc.tags.map(tag => (
                              <span key={tag} className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions for Grid View */}
                      {viewMode === 'grid' && (
                        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <button 
                              onClick={(e) => handleToggleFavorite(e, doc.id, !!doc.isFavorite)}
                              className={`p-2.5 rounded-xl transition-all cursor-pointer ${doc.isFavorite ? 'text-yellow-500 bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm'}`}
                              title={doc.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                            >
                              <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                              onClick={(e) => openTagModal(e, doc.id)}
                              className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl transition-all cursor-pointer"
                              title="Manage tags"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleOpenNotes(e, doc)}
                              className="p-2.5 text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl transition-all relative cursor-pointer"
                              title="Document notes"
                            >
                              <FileText className="w-4 h-4" />
                              {doc.notes && <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 border-2 border-white dark:border-slate-700 rounded-full animate-pulse"></span>}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <button 
                              onClick={(e) => handleToggleSensitive(e, doc.id, !!doc.isSensitive)}
                              className={`p-2.5 rounded-xl transition-all cursor-pointer ${doc.isSensitive ? 'text-amber-500 bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm'}`}
                              title={doc.isSensitive ? 'Remove protection' : 'Protect document'}
                            >
                              {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, doc.id)}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl transition-all cursor-pointer"
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
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 shadow-sm shrink-0">
                        <button 
                          onClick={(e) => handleToggleFavorite(e, doc.id, !!doc.isFavorite)}
                          className={`p-2 rounded-lg transition-all cursor-pointer ${doc.isFavorite ? 'text-yellow-500 bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm'}`}
                          title={doc.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => openTagModal(e, doc.id)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all cursor-pointer"
                          title="Manage tags"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleOpenNotes(e, doc)}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all relative cursor-pointer"
                          title="Document notes"
                        >
                          <FileText className="w-4 h-4" />
                          {doc.notes && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>}
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button 
                          onClick={(e) => handleToggleSensitive(e, doc.id, !!doc.isSensitive)}
                          className={`p-2 rounded-lg transition-all cursor-pointer ${doc.isSensitive ? 'text-amber-500 bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm'}`}
                          title={doc.isSensitive ? 'Remove protection' : 'Protect document'}
                        >
                          {doc.isSensitive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, doc.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all cursor-pointer"
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
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/50">
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display tracking-tight">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Tag className="w-4 h-4 text-blue-500" />
                </div>
                Manage Tags
              </h2>
              <button 
                onClick={() => setTagModalDocId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Editing tags for:</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{tagModalDoc.name}</p>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 font-mono">Preset Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isSelected = (tagModalDoc.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => handleToggleTag(tagModalDoc.id, tag)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800/60 dark:text-blue-300 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 font-mono">Custom Tags</h3>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(tagModalDoc.tags || []).filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tagModalDoc.id, tag)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800/60 dark:text-blue-300 flex items-center gap-1 group shadow-sm cursor-pointer"
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
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!customTagInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 disabled:text-slate-400 p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/50">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display tracking-tight">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                Document Notes
              </h3>
              <button 
                onClick={() => setNotesModalDocId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea 
                className="w-full h-48 sm:h-64 resize-none bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 placeholder-slate-400 text-sm leading-relaxed transition-all font-medium shadow-sm"
                placeholder="Write your notes for this document here..."
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
              />
            </div>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setNotesModalDocId(null)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNotes}
                className="px-6 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
