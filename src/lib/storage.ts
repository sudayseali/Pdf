import localforage from 'localforage';
import { PdfDocument, PdfMetadata, StandaloneNote } from '../types';

// Storage Instances
const pdfStore = localforage.createInstance({ name: 'pdf_data', storeName: 'blobs' });
const metaStore = localforage.createInstance({ name: 'pdf_meta', storeName: 'metadata' });
const libraryStore = localforage.createInstance({ name: 'pdf_library', storeName: 'index' });
const settingsStore = localforage.createInstance({ name: 'app_settings', storeName: 'prefs' });
const drawingStore = localforage.createInstance({ name: 'pdf_drawings', storeName: 'drawings' });
const audioStore = localforage.createInstance({ name: 'pdf_audio_memos', storeName: 'memos' });
const notesStore = localforage.createInstance({ name: 'app_notes', storeName: 'notes' });

export const storage = {
  // --- Library & File Management ---
  async savePdf(file: File): Promise<PdfDocument> {
    const id = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    
    await pdfStore.setItem(id, buffer);
    
    const doc: PdfDocument = {
      id,
      name: file.name,
      size: file.size,
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };
    
    const library = await this.getLibrary();
    library.unshift(doc); // Add to top
    await libraryStore.setItem('documents', library);
    
    // Default metadata
    await metaStore.setItem(id, { lastPage: 1, bookmarks: [] });
    
    return doc;
  },

  async updateLastOpened(id: string) {
    const library = await this.getLibrary();
    const docIndex = library.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      library[docIndex].lastOpenedAt = Date.now();
      await libraryStore.setItem('documents', library);
    }
  },

  async toggleSensitive(id: string, isSensitive: boolean) {
    const library = await this.getLibrary();
    const docIndex = library.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      library[docIndex].isSensitive = isSensitive;
      await libraryStore.setItem('documents', library);
    }
  },

  async updateTags(id: string, tags: string[]) {
    const library = await this.getLibrary();
    const docIndex = library.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      library[docIndex].tags = tags;
      await libraryStore.setItem('documents', library);
    }
  },

  async toggleFavorite(id: string, isFavorite: boolean) {
    const library = await this.getLibrary();
    const docIndex = library.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      library[docIndex].isFavorite = isFavorite;
      await libraryStore.setItem('documents', library);
    }
  },

  async getLibrary(): Promise<PdfDocument[]> {
    const docs = await libraryStore.getItem<PdfDocument[]>('documents');
    return docs || [];
  },

  async getPdfData(id: string): Promise<ArrayBuffer | null> {
    return await pdfStore.getItem<ArrayBuffer>(id);
  },

  async deletePdf(id: string) {
    await pdfStore.removeItem(id);
    await metaStore.removeItem(id);
    const library = await this.getLibrary();
    await libraryStore.setItem('documents', library.filter(d => d.id !== id));
  },

  // --- Metadata (Bookmarks & Progress) ---
  async getPdfMetadata(id: string): Promise<PdfMetadata> {
    const meta = await metaStore.getItem<PdfMetadata>(id);
    return meta || { lastPage: 1, bookmarks: [] };
  },

  async savePdfMetadata(id: string, meta: PdfMetadata) {
    await metaStore.setItem(id, meta);
  },

  // --- App Settings ---
  async getDarkMode(): Promise<boolean> {
    const mode = await settingsStore.getItem<boolean>('darkMode');
    return mode ?? false;
  },

  async setDarkMode(isDark: boolean) {
    await settingsStore.setItem('darkMode', isDark);
  },

  async getAutoDarkMode(): Promise<boolean> {
    const auto = await settingsStore.getItem<boolean>('autoDarkMode');
    return auto ?? true;
  },

  async setAutoDarkMode(isAuto: boolean) {
    await settingsStore.setItem('autoDarkMode', isAuto);
  },

  async getPin(): Promise<string | null> {
    return await settingsStore.getItem<string>('app_pin');
  },

  async setPin(pin: string | null) {
    if (pin) {
      await settingsStore.setItem('app_pin', pin);
    } else {
      await settingsStore.removeItem('app_pin');
    }
  },

  // --- Drawings & Ink Annotations ---
  async getPageDrawings(pdfId: string, pageNumber: number): Promise<any[]> {
    const drawings = await drawingStore.getItem<any[]>(`drawings_${pdfId}_${pageNumber}`);
    return drawings || [];
  },

  async savePageDrawings(pdfId: string, pageNumber: number, strokes: any[]) {
    await drawingStore.setItem(`drawings_${pdfId}_${pageNumber}`, strokes);
  },

  async clearPageDrawings(pdfId: string, pageNumber: number) {
    await drawingStore.removeItem(`drawings_${pdfId}_${pageNumber}`);
  },

  // --- Voice Recording Memos ---
  async getAudioMemos(pdfId: string): Promise<any[]> {
    const memos = await audioStore.getItem<any[]>(`memos_${pdfId}`);
    return memos || [];
  },

  async saveAudioMemo(pdfId: string, memo: { id: string; name: string; addedAt: number; duration?: number }, audioBlob: Blob) {
    const currentMemos = await this.getAudioMemos(pdfId);
    currentMemos.push(memo);
    await audioStore.setItem(`memos_${pdfId}`, currentMemos);
    await audioStore.setItem(`blob_${memo.id}`, audioBlob);
  },

  async getAudioMemoBlob(memoId: string): Promise<Blob | null> {
    return await audioStore.getItem<Blob>(`blob_${memoId}`);
  },

  async deleteAudioMemo(pdfId: string, memoId: string) {
    const currentMemos = await this.getAudioMemos(pdfId);
    const updated = currentMemos.filter(m => m.id !== memoId);
    await audioStore.setItem(`memos_${pdfId}`, updated);
    await audioStore.removeItem(`blob_${memoId}`);
  },

  // --- Standalone Notes ---
  async getNotes(): Promise<StandaloneNote[]> {
    const notes = await notesStore.getItem<StandaloneNote[]>('all_notes');
    return notes || [];
  },

  async saveNote(note: StandaloneNote): Promise<StandaloneNote[]> {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notes[index] = { ...note, updatedAt: Date.now() };
    } else {
      notes.unshift(note);
    }
    await notesStore.setItem('all_notes', notes);
    return notes;
  },

  async deleteNote(id: string): Promise<StandaloneNote[]> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    await notesStore.setItem('all_notes', filtered);
    return filtered;
  }
};
