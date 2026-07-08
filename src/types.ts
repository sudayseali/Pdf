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

export type Screen = 'Home' | 'Library' | 'Reader';

export interface AppState {
  currentScreen: Screen;
  selectedPdfId: string | null;
  darkMode: boolean;
  autoDarkMode?: boolean;
}
