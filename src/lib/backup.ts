import localforage from 'localforage';
import { storage } from './storage';
import { PdfDocument, StandaloneNote } from '../types';

// Access the underlying localforage instances matching storage.ts
const pdfStore = localforage.createInstance({ name: 'pdf_data', storeName: 'blobs' });
const metaStore = localforage.createInstance({ name: 'pdf_meta', storeName: 'metadata' });
const libraryStore = localforage.createInstance({ name: 'pdf_library', storeName: 'index' });
const settingsStore = localforage.createInstance({ name: 'app_settings', storeName: 'prefs' });
const drawingStore = localforage.createInstance({ name: 'pdf_drawings', storeName: 'drawings' });
const audioStore = localforage.createInstance({ name: 'pdf_audio_memos', storeName: 'memos' });
const notesStore = localforage.createInstance({ name: 'app_notes', storeName: 'notes' });

// Base64 helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataURLtoBlob(dataurl: string): Promise<Blob> {
  const res = await fetch(dataurl);
  return await res.blob();
}

export interface BackupData {
  version: number;
  timestamp: number;
  isFullBackup: boolean;
  library: PdfDocument[];
  metadataList: Record<string, any>;
  drawings: Record<string, any[]>;
  audioMemosIndex: Record<string, any[]>;
  audioMemosBlobs?: Record<string, string>; // base64 representation of audio blobs
  standaloneNotes: StandaloneNote[];
  settings: Record<string, any>;
  pdfBlobs?: Record<string, string>; // base64 representation of pdf files (Full Backup only)
}

export const backupEngine = {
  /**
   * Generates a backup object from local database stores.
   * @param includeFiles If true, performs a full backup including large PDF binaries and Audio blobs.
   */
  async generateBackup(includeFiles: boolean): Promise<BackupData> {
    // 1. Get library index
    const library = await storage.getLibrary();

    // 2. Get settings
    const settings: Record<string, any> = {};
    const settingsKeys = await settingsStore.keys();
    for (const key of settingsKeys) {
      settings[key] = await settingsStore.getItem(key);
    }

    // 3. Get metadata for each PDF
    const metadataList: Record<string, any> = {};
    const metaKeys = await metaStore.keys();
    for (const key of metaKeys) {
      metadataList[key] = await metaStore.getItem(key);
    }

    // 4. Get drawings/annotations
    const drawings: Record<string, any[]> = {};
    const drawingKeys = await drawingStore.keys();
    for (const key of drawingKeys) {
      drawings[key] = (await drawingStore.getItem<any[]>(key)) || [];
    }

    // 5. Get voice memos index
    const audioMemosIndex: Record<string, any[]> = {};
    const audioKeys = await audioStore.keys();
    // memos can either be index metadata or the actual voice recording blobs
    const indexKeys = audioKeys.filter(k => k.startsWith('memos_'));
    for (const key of indexKeys) {
      audioMemosIndex[key] = (await audioStore.getItem<any[]>(key)) || [];
    }

    // 6. Get standalone notes
    const standaloneNotes = await storage.getNotes();

    const backup: BackupData = {
      version: 1,
      timestamp: Date.now(),
      isFullBackup: includeFiles,
      library,
      metadataList,
      drawings,
      audioMemosIndex,
      standaloneNotes,
      settings
    };

    // 7. If Full Backup, include files
    if (includeFiles) {
      // PDF Binary Files
      const pdfBlobs: Record<string, string> = {};
      const pdfKeys = await pdfStore.keys();
      for (const id of pdfKeys) {
        const buffer = await pdfStore.getItem<ArrayBuffer>(id);
        if (buffer) {
          pdfBlobs[id] = arrayBufferToBase64(buffer);
        }
      }
      backup.pdfBlobs = pdfBlobs;

      // Audio Memo Recording Blobs
      const audioMemosBlobs: Record<string, string> = {};
      const blobKeys = audioKeys.filter(k => k.startsWith('blob_'));
      for (const key of blobKeys) {
        const blob = await audioStore.getItem<Blob>(key);
        if (blob) {
          const b64 = await blobToBase64(blob);
          audioMemosBlobs[key] = b64;
        }
      }
      backup.audioMemosBlobs = audioMemosBlobs;
    }

    return backup;
  },

  /**
   * Restores database state from backup data, overwriting or merging duplicate items gracefully.
   */
  async restoreBackup(backup: BackupData): Promise<{ success: boolean; restoredCount: number; message: string }> {
    if (!backup || backup.version !== 1) {
      return { success: false, restoredCount: 0, message: 'The backup file is invalid or of an incorrect format.' };
    }

    let restoredCount = 0;

    // 1. Restore library index (Merge)
    const existingLib = await storage.getLibrary();
    const libMap = new Map(existingLib.map(item => [item.id, item]));
    
    for (const item of backup.library) {
      libMap.set(item.id, item);
      restoredCount++;
    }
    await libraryStore.setItem('documents', Array.from(libMap.values()));

    // 2. Restore PDF Metadata
    if (backup.metadataList) {
      for (const [id, meta] of Object.entries(backup.metadataList)) {
        await metaStore.setItem(id, meta);
      }
    }

    // 3. Restore drawings/annotations
    if (backup.drawings) {
      for (const [key, strokes] of Object.entries(backup.drawings)) {
        await drawingStore.setItem(key, strokes);
      }
    }

    // 4. Restore audio index
    if (backup.audioMemosIndex) {
      for (const [key, memos] of Object.entries(backup.audioMemosIndex)) {
        await audioStore.setItem(key, memos);
      }
    }

    // 5. Restore settings
    if (backup.settings) {
      for (const [key, val] of Object.entries(backup.settings)) {
        await settingsStore.setItem(key, val);
      }
    }

    // 6. Restore standalone notes (Merge by ID)
    const existingNotes = await storage.getNotes();
    const notesMap = new Map(existingNotes.map(n => [n.id, n]));
    
    for (const note of backup.standaloneNotes) {
      notesMap.set(note.id, note);
    }
    await notesStore.setItem('all_notes', Array.from(notesMap.values()));

    // 7. If Full Backup, restore binaries
    if (backup.isFullBackup) {
      // Restore PDF Binaries
      if (backup.pdfBlobs) {
        for (const [id, b64] of Object.entries(backup.pdfBlobs)) {
          const buffer = base64ToArrayBuffer(b64);
          await pdfStore.setItem(id, buffer);
        }
      }

      // Restore Audio Memo Blobs
      if (backup.audioMemosBlobs) {
        for (const [key, b64] of Object.entries(backup.audioMemosBlobs)) {
          const blob = await dataURLtoBlob(b64);
          await audioStore.setItem(key, blob);
        }
      }
    }

    return { 
      success: true, 
      restoredCount, 
      message: `Backup data successfully restored! ${restoredCount} files and all custom annotations/notes are active.` 
    };
  }
};
