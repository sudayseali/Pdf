export interface PdfDocument {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  lastOpenedAt?: number;
}

export interface PdfMetadata {
  lastPage: number;
  bookmarks: number[];
  numPages?: number;
}

export type Screen = 'Home' | 'Library' | 'Reader';

export interface AppState {
  currentScreen: Screen;
  selectedPdfId: string | null;
  darkMode: boolean;
  autoDarkMode?: boolean;
}
