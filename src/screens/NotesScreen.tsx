import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Trash2, Pin, Tag, Calendar, Copy, Check, Download, 
  Palette, Edit3, X, ArrowLeft, Notebook, CheckSquare, Sparkles 
} from 'lucide-react';
import { storage } from '../lib/storage';
import { StandaloneNote } from '../types';

// Palette of beautiful modern card colors (light & dark compatible)
const NOTE_COLORS = [
  { id: 'default', name: 'Standard', bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700/80' },
  { id: 'blue', name: 'Sky Blue', bg: 'bg-sky-50 dark:bg-sky-950/20', border: 'border-sky-200 dark:border-sky-900/40 text-sky-800 dark:text-sky-300' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-900/40 text-purple-800 dark:text-purple-300' }
];

const PRESET_TAGS = ['General', 'Study', 'Personal', 'Work', 'Review', 'Ideas'];

interface NotesScreenProps {
  onBack: () => void;
}

export function NotesScreen({ onBack }: NotesScreenProps) {
  const [notes, setNotes] = useState<StandaloneNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Editor State
  const [editingNote, setEditingNote] = useState<StandaloneNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteColor, setNoteColor] = useState('default');
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  
  // Feedback States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load notes on boot
  useEffect(() => {
    storage.getNotes().then(loadedNotes => {
      setNotes(loadedNotes);
    });
  }, []);

  // Quick helper to trigger a fleeting toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Create a brand new blank note
  const handleCreateNewNote = () => {
    const blankNote: StandaloneNote = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isPinned: false,
      color: 'default'
    };
    
    setEditingNote(blankNote);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setNoteColor('default');
    setNoteIsPinned(false);
  };

  // Load an existing note into the editor
  const handleSelectNote = (note: StandaloneNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
    setNoteColor(note.color || 'default');
    setNoteIsPinned(!!note.isPinned);
  };

  // Save/Update the active note
  const handleSaveActiveNote = async () => {
    if (!editingNote) return;
    
    const updatedTitle = noteTitle.trim() || 'Xusuus-qor Bilaa Magac Ah';
    const updatedNote: StandaloneNote = {
      ...editingNote,
      title: updatedTitle,
      content: noteContent,
      tags: noteTags,
      color: noteColor,
      isPinned: noteIsPinned,
      updatedAt: Date.now()
    };

    const updatedList = await storage.saveNote(updatedNote);
    setNotes(updatedList);
    setEditingNote(null);
    showToast('Xusuus-qorkii si fiican ayaa loo kaydiyay!');
  };

  // Delete a note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Ma hubtaa inaad tirtirto xusuus-qorkan?')) return;
    
    const updatedList = await storage.deleteNote(id);
    setNotes(updatedList);
    
    if (editingNote?.id === id) {
      setEditingNote(null);
    }
    showToast('Waa la tirtiray xusuus-qorkii.');
  };

  // Auto-copy note content
  const handleCopyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Waa la soo koobay qoraalkii!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export note as text file
  const handleExportAsTxt = (note: StandaloneNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([`MAGACA: ${note.title}\nLA GUYYEY: ${new Date(note.createdAt).toLocaleString()}\n\n${note.content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${note.title.replace(/\s+/g, '_') || 'note'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Text file ahaan ayaa loo soo dejiyay!');
  };

  // Tag Helpers in Editor
  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    if (noteTags.includes(cleanTag)) return;
    setNoteTags([...noteTags, cleanTag]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(t => t !== tagToRemove));
  };

  // Filtering Logic
  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  // Sort: Pinned first, then by updatedAt desc
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  // Unique list of all tags present in all saved notes for quick filter
  const allExistingTags = Array.from(
    new Set(notes.flatMap(n => n.tags || []))
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full overflow-hidden relative">
      
      {/* HEADER BAR */}
      <div className="px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={editingNote ? () => setEditingNote(null) : onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Notebook className="w-4 h-4 text-indigo-500" />
              {editingNote ? 'Tifaftirka Xusuus-qorka' : 'Xusuus-qor Casri Ah'}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {editingNote ? 'Wax ka beddel ama ku dar wax cusub' : 'Qor waxyaabaha muhiimka ah'}
            </p>
          </div>
        </div>
        
        {!editingNote && (
          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Xusuus Cusub</span>
          </button>
        )}
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 text-xs font-semibold py-2 px-4 rounded-full shadow-lg z-50 flex items-center gap-2 border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* VIEW 1: EDITOR PANEL (If note is open) */}
        {editingNote ? (
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            
            {/* Editor Toolbar */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Color Picker & Pin */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-400" />
                  <div className="flex gap-1">
                    {NOTE_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setNoteColor(color.id)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          color.id === 'default' 
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' 
                            : color.id === 'blue' ? 'bg-sky-200 dark:bg-sky-900'
                            : color.id === 'emerald' ? 'bg-emerald-200 dark:bg-emerald-900'
                            : color.id === 'amber' ? 'bg-amber-200 dark:bg-amber-900'
                            : color.id === 'rose' ? 'bg-rose-200 dark:bg-rose-900'
                            : 'bg-purple-200 dark:bg-purple-900'
                        } ${noteColor === color.id ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

                <button
                  onClick={() => setNoteIsPinned(!noteIsPinned)}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition-colors ${
                    noteIsPinned 
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${noteIsPinned ? 'fill-current' : ''}`} />
                  <span>Ku gunti (Pin)</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingNote(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Ka noqo
                </button>
                <button
                  onClick={handleSaveActiveNote}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow active:scale-95"
                >
                  Kaydi Xusuusta
                </button>
              </div>
            </div>

            {/* Note Input Fields (Styled with selected color) */}
            <div className={`flex-1 p-6 overflow-y-auto flex flex-col space-y-4 transition-colors ${
              NOTE_COLORS.find(c => c.id === noteColor)?.bg || 'bg-white dark:bg-slate-900'
            }`}>
              
              {/* Title input */}
              <input
                type="text"
                placeholder="Magaca xusuusta..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400/80"
              />

              {/* Date stamp and word count */}
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(editingNote.createdAt).toLocaleDateString('so-SO', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <span>•</span>
                <span>{noteContent.trim() === '' ? 0 : noteContent.trim().split(/\s+/).length} Ereyo</span>
                <span>•</span>
                <span>{noteContent.length} Xarfood</span>
              </div>

              {/* Text Area */}
              <textarea
                placeholder="Halkan ku qor faahfaahinta xusuus-qorkaaga cusub..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400/80 min-h-[250px]"
              />

              {/* Tags Section */}
              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Mowduucyada / Tags:</span>
                </div>

                {/* Selected Tags list */}
                <div className="flex flex-wrap gap-1.5">
                  {noteTags.length === 0 ? (
                    <span className="text-[11px] italic text-slate-400">Ma jiraan wax tag ah oo lagu daray</span>
                  ) : (
                    noteTags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-950/50"
                      >
                        {tag}
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-full p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Preset Suggestions and Custom Input */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {PRESET_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        disabled={noteTags.includes(tag)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                          noteTags.includes(tag)
                            ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5 max-w-xs">
                    <input
                      type="text"
                      placeholder="Ku dar tag kale..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                        }
                      }}
                      className="flex-1 text-[11px] px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      onClick={() => handleAddTag(newTagInput)}
                      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors"
                    >
                      Ku dar
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        ) : (
          
          /* VIEW 2: LIST PANEL */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Filter and Search Panel */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ka raadi magaca ama qoraalka xusuusta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tags Horizontal Scroll Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap uppercase tracking-wider">
                  Mowduucyada:
                </span>
                
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                    selectedTag === null
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Dhamaan ({notes.length})
                </button>

                {allExistingTags.map(tag => {
                  const count = notes.filter(n => n.tags && n.tags.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                        selectedTag === tag
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tag} ({count})
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Notes Grid / List */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950">
              
              {sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                    <CheckSquare className="w-6 h-6 opacity-80 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {searchQuery || selectedTag ? 'Eber natiijo!' : 'Ma jiraan wax xusuus ah!'}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                      {searchQuery || selectedTag 
                        ? 'Ma jiro xusuus-qor ku habboon filtarka aad dooratay. Fadlan isku day hadal kale.' 
                        : 'Wali ma qorin wax xusuus-qor ah. Riix badhanka sare si aad u bilowdo xusuus-qor qurux badan!'}
                    </p>
                  </div>
                  {!searchQuery && !selectedTag && (
                    <button
                      onClick={handleCreateNewNote}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Qor tii ugu horraysay
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {sortedNotes.map(note => {
                    const matchedColor = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden min-h-[140px] ${
                          matchedColor.bg
                        } ${matchedColor.border}`}
                      >
                        
                        {/* Pinned Marker / Top Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {note.title || 'Xusuus aan la magacaabin'}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {note.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-indigo-500 fill-current" title="Pinned Note" />
                            )}
                          </div>
                        </div>

                        {/* Note Body Excerpt */}
                        <p className="text-xs text-slate-500 dark:text-slate-400/90 line-clamp-3 mb-4 leading-relaxed flex-1">
                          {note.content || <em className="text-slate-400/70">Maran... ku dar faahfaahin</em>}
                        </p>

                        {/* Note Tags (Small list) */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {note.tags.slice(0, 3).map(tag => (
                              <span 
                                key={tag} 
                                className="text-[9px] font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="text-[9px] font-bold text-slate-400">+{note.tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        {/* Note Footer: Actions & Date */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 text-[10px] text-slate-400 font-mono mt-auto shrink-0">
                          <span>
                            {new Date(note.updatedAt).toLocaleDateString('so-SO', { month: 'short', day: 'numeric' })}
                          </span>
                          
                          {/* Quick utility actions on hover / mobile */}
                          <div className="flex items-center gap-2 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleCopyToClipboard(note.content, note.id, e)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              title="Copy text"
                            >
                              {copiedId === note.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => handleExportAsTxt(note, e)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              title="Download TXT"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteNote(note.id, e)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-950/40 rounded text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                              title="Tirtir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
