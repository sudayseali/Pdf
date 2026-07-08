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

const FONTS = [
  { id: 'Inter', name: 'Inter (Clean)', cssName: '"Inter", sans-serif' },
  { id: 'Outfit', name: 'Outfit (Modern)', cssName: '"Outfit", sans-serif' },
  { id: 'Space-Grotesk', name: 'Space Grotesk (Tech)', cssName: '"Space Grotesk", sans-serif' },
  { id: 'Playfair-Display', name: 'Playfair (Elegant)', cssName: '"Playfair Display", serif' },
  { id: 'Lora', name: 'Lora (Academic)', cssName: '"Lora", serif' },
  { id: 'Georgia', name: 'Georgia (Classic)', cssName: 'Georgia, serif' },
  { id: 'Merriweather', name: 'Merriweather (Read)', cssName: '"Merriweather", serif' },
  { id: 'JetBrains-Mono', name: 'JetBrains Mono (Developer)', cssName: '"JetBrains Mono", monospace' },
  { id: 'Caveat', name: 'Caveat (Handwritten)', cssName: '"Caveat", cursive' },
  { id: 'Comic-Neue', name: 'Comic Neue (Friendly)', cssName: '"Comic Neue", cursive' }
];

const TEXT_COLORS = [
  { id: 'default', name: 'Default', class: 'text-slate-800 dark:text-slate-200', value: '', dotBg: 'bg-slate-700 dark:bg-slate-300' },
  { id: 'charcoal', name: 'Charcoal', class: 'text-slate-900 dark:text-slate-100', value: '#1e293b', dotBg: 'bg-[#1e293b]' },
  { id: 'royal-blue', name: 'Royal Blue', class: 'text-blue-700 dark:text-blue-400', value: '#1d4ed8', dotBg: 'bg-[#1d4ed8]' },
  { id: 'emerald-green', name: 'Emerald Green', class: 'text-emerald-700 dark:text-emerald-400', value: '#047857', dotBg: 'bg-[#047857]' },
  { id: 'ruby-red', name: 'Ruby Red', class: 'text-rose-700 dark:text-rose-400', value: '#be123c', dotBg: 'bg-[#be123c]' },
  { id: 'violet-purple', name: 'Violet Purple', class: 'text-purple-700 dark:text-purple-400', value: '#6d28d9', dotBg: 'bg-[#6d28d9]' },
  { id: 'amber-gold', name: 'Amber Gold', class: 'text-amber-700 dark:text-amber-400', value: '#b45309', dotBg: 'bg-[#b45309]' },
  { id: 'deep-teal', name: 'Deep Teal', class: 'text-teal-700 dark:text-teal-400', value: '#0f766e', dotBg: 'bg-[#0f766e]' },
  { id: 'coral-rose', name: 'Coral Rose', class: 'text-rose-600 dark:text-rose-400', value: '#e11d48', dotBg: 'bg-[#e11d48]' },
  { id: 'chocolate-brown', name: 'Chocolate Brown', class: 'text-yellow-950 dark:text-amber-200', value: '#78350f', dotBg: 'bg-[#78350f]' }
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
  const [noteFont, setNoteFont] = useState('Inter');
  const [noteTextColor, setNoteTextColor] = useState('default');
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
      color: 'default',
      fontFamily: 'Inter',
      textColor: 'default'
    };
    
    setEditingNote(blankNote);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setNoteColor('default');
    setNoteFont('Inter');
    setNoteTextColor('default');
    setNoteIsPinned(false);
  };

  // Load an existing note into the editor
  const handleSelectNote = (note: StandaloneNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
    setNoteColor(note.color || 'default');
    setNoteFont(note.fontFamily || 'Inter');
    setNoteTextColor(note.textColor || 'default');
    setNoteIsPinned(!!note.isPinned);
  };

  // Save/Update the active note
  const handleSaveActiveNote = async () => {
    if (!editingNote) return;
    
    const updatedTitle = noteTitle.trim() || 'Untitled Note';
    const updatedNote: StandaloneNote = {
      ...editingNote,
      title: updatedTitle,
      content: noteContent,
      tags: noteTags,
      color: noteColor,
      fontFamily: noteFont,
      textColor: noteTextColor,
      isPinned: noteIsPinned,
      updatedAt: Date.now()
    };

    const updatedList = await storage.saveNote(updatedNote);
    setNotes(updatedList);
    setEditingNote(null);
    showToast('Note saved successfully!');
  };

  // Delete a note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    const updatedList = await storage.deleteNote(id);
    setNotes(updatedList);
    
    if (editingNote?.id === id) {
      setEditingNote(null);
    }
    showToast('Note deleted.');
  };

  // Auto-copy note content
  const handleCopyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Text copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export note as text file
  const handleExportAsTxt = (note: StandaloneNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([`TITLE: ${note.title}\nCREATED: ${new Date(note.createdAt).toLocaleString()}\n\n${note.content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${note.title.replace(/\s+/g, '_') || 'note'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Downloaded as TXT file!');
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
              {editingNote ? 'Edit Note' : 'Modern Notepad'}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {editingNote ? 'Edit your note or make changes' : 'Write down anything important'}
            </p>
          </div>
        </div>
        
        {!editingNote && (
          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
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
                  <span>Pin Note</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingNote(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveActiveNote}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow active:scale-95"
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Font & Color Styling Sub-bar */}
            <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {/* Font Family Selection */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                  Font:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={noteFont}
                    onChange={(e) => setNoteFont(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    style={{ fontFamily: FONTS.find(f => f.id === noteFont)?.cssName }}
                  >
                    {FONTS.map(font => (
                      <option key={font.id} value={font.id} style={{ fontFamily: font.cssName }}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Color Selection */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                  Text Color:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {TEXT_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setNoteTextColor(color.id)}
                      className={`w-5 h-5 rounded-full border transition-all relative flex items-center justify-center ${color.dotBg} ${
                        noteTextColor === color.id 
                          ? 'ring-2 ring-indigo-500 scale-110 border-indigo-500' 
                          : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                      }`}
                      title={color.name}
                    >
                      {noteTextColor === color.id && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Input Fields (Styled with selected color) */}
            <div className={`flex-1 p-6 overflow-y-auto flex flex-col space-y-4 transition-colors ${
              NOTE_COLORS.find(c => c.id === noteColor)?.bg || 'bg-white dark:bg-slate-900'
            }`}>
              
              {/* Title input */}
              <input
                type="text"
                placeholder="Note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400/80"
                style={{ 
                  fontFamily: FONTS.find(f => f.id === noteFont)?.cssName,
                  color: TEXT_COLORS.find(c => c.id === noteTextColor)?.value || undefined
                }}
              />

              {/* Date stamp and word count */}
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(editingNote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <span>•</span>
                <span>{noteContent.trim() === '' ? 0 : noteContent.trim().split(/\s+/).length} Words</span>
                <span>•</span>
                <span>{noteContent.length} Chars</span>
              </div>

              {/* Text Area */}
              <textarea
                placeholder="Write your note details here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm leading-relaxed placeholder-slate-400/80 min-h-[250px]"
                style={{ 
                  fontFamily: FONTS.find(f => f.id === noteFont)?.cssName,
                  color: TEXT_COLORS.find(c => c.id === noteTextColor)?.value || undefined
                }}
              />

              {/* Tags Section */}
              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Tags / Categories:</span>
                </div>

                {/* Selected Tags list */}
                <div className="flex flex-wrap gap-1.5">
                  {noteTags.length === 0 ? (
                    <span className="text-[11px] italic text-slate-400">No tags added yet</span>
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
                      placeholder="Add another tag..."
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
                      Add
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
                  placeholder="Search notes by title or content..."
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
                  Tags:
                </span>
                
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                    selectedTag === null
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({notes.length})
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
                      {searchQuery || selectedTag ? 'No results!' : 'No notes yet!'}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                      {searchQuery || selectedTag 
                        ? 'No notes match your selected filter. Please try a different search query.' 
                        : 'You haven\'t written any notes yet. Click the button above to start a beautiful note!'}
                    </p>
                  </div>
                  {!searchQuery && !selectedTag && (
                    <button
                      onClick={handleCreateNewNote}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Create your first note
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {sortedNotes.map(note => {
                    const matchedColor = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
                    const noteFontObj = FONTS.find(f => f.id === note.fontFamily) || FONTS[0];
                    const noteColorObj = TEXT_COLORS.find(c => c.id === note.textColor) || TEXT_COLORS[0];
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
                          <h4 
                            className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                            style={{ 
                              fontFamily: noteFontObj.cssName,
                              color: noteColorObj.value || undefined
                            }}
                          >
                            {note.title || 'Untitled Note'}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {note.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-indigo-500 fill-current" title="Pinned Note" />
                            )}
                          </div>
                        </div>

                        {/* Note Body Excerpt */}
                        <p 
                          className="text-xs text-slate-500 dark:text-slate-400/90 line-clamp-3 mb-4 leading-relaxed flex-1"
                          style={{ 
                            fontFamily: noteFontObj.cssName,
                            color: noteColorObj.value || undefined
                          }}
                        >
                          {note.content || <em className="text-slate-400/70">Empty... add details</em>}
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
                            {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                              title="Delete"
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
