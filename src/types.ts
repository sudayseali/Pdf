export interface PdfDocument {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  lastOpenedAt?: number;
  isSensitive?: boolean;
  tags?: string[];
  isFavorite?: boolean;
}

export interface PdfMetadata {
  lastPage: number;
  bookmarks: number[];
  numPages?: number;
  notes?: string;
  invertColors?: boolean;
  pageTheme?: 'normal' | 'night' | 'sepia' | 'eye-care';
}

export type Screen = 'Home' | 'Library' | 'Reader' | 'Notes' | 'Flashcards';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  box: number; // 1 to 5 for Leitner system
  category: string;
  createdAt: number;
  lastReviewed?: number;
}

export interface StandaloneNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isPinned: boolean;
  color?: string;
  fontFamily?: string;
  textColor?: string;
}

export interface AppState {
  currentScreen: Screen;
  selectedPdfId: string | null;
  darkMode: boolean;
  autoDarkMode?: boolean;
}
