import localforage from 'localforage';
import { PdfDocument, PdfMetadata } from '../types';

// Storage Instances
const pdfStore = localforage.createInstance({ name: 'pdf_data', storeName: 'blobs' });
const metaStore = localforage.createInstance({ name: 'pdf_meta', storeName: 'metadata' });
const libraryStore = localforage.createInstance({ name: 'pdf_library', storeName: 'index' });
const settingsStore = localforage.createInstance({ name: 'app_settings', storeName: 'prefs' });

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
  }
};
