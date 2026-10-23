/**
 * ByteBook — Interactive Reader State Store (Zustand)
 * Tracks active word/sentence selection, inline paragraph translations,
 * scientific concept simplifications, active Figure Lightbox, and return-to-reading anchors.
 */

import { create } from 'zustand';
import { BookFigureRecord } from '../services/parser';
import {
  ContextualTranslationResponse,
  TranslationGranularity,
} from '../services/translation';

export interface ActiveTextSelection {
  blockId: string;
  sentenceId?: string;
  tokenId?: string;
  granularity: TranslationGranularity;
  selectedText: string;
  surroundingSentence: string;
  paragraphContext: string;
}

export interface InlineParagraphTranslationState {
  translationAr: string;
  simplifiedConceptAr?: string;
  showSimplified: boolean;
  activeMode?: 'translate' | 'explain';
  isLoading: boolean;
  providerUsed?: string;
}

export interface ReturnReadingAnchor {
  blockId: string;
  blockIndex: number;
  chapterIndex: number;
  snippet: string;
}

interface ReaderState {
  activeBookId: string | null;
  activeChapterIndex: number;
  selection: ActiveTextSelection | null;
  activeTranslation: ContextualTranslationResponse | null;
  isTranslating: boolean;
  paragraphTranslations: Record<string, InlineParagraphTranslationState>;
  activeFigure: BookFigureRecord | null;
  returnAnchor: ReturnReadingAnchor | null;

  setActiveBook: (bookId: string, chapterIndex?: number) => void;
  setActiveChapterIndex: (chapterIndex: number) => void;
  selectTextNode: (selection: ActiveTextSelection | null) => void;
  setTranslationResult: (result: ContextualTranslationResponse | null) => void;
  setIsTranslating: (loading: boolean) => void;
  setParagraphTranslation: (
    blockId: string,
    state: Partial<InlineParagraphTranslationState> | null
  ) => void;
  openFigureModal: (
    figure: BookFigureRecord,
    returnAnchor?: ReturnReadingAnchor
  ) => void;
  closeFigureModal: () => void;
  setReturnAnchor: (anchor: ReturnReadingAnchor | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  activeBookId: null,
  activeChapterIndex: 0,
  selection: null,
  activeTranslation: null,
  isTranslating: false,
  paragraphTranslations: {},
  activeFigure: null,
  returnAnchor: null,

  setActiveBook: (bookId, chapterIndex = 0) =>
    set({
      activeBookId: bookId,
      activeChapterIndex: chapterIndex,
      selection: null,
      activeTranslation: null,
      returnAnchor: null,
    }),

  setActiveChapterIndex: (activeChapterIndex) =>
    set({
      activeChapterIndex,
      selection: null,
      activeTranslation: null,
    }),

  selectTextNode: (selection) =>
    set({
      selection,
      activeTranslation: null,
    }),

  setTranslationResult: (activeTranslation) =>
    set({
      activeTranslation,
      isTranslating: false,
    }),

  setIsTranslating: (isTranslating) => set({ isTranslating }),

  setParagraphTranslation: (blockId, partialState) =>
    set((state) => {
      if (partialState === null) {
        const next = { ...state.paragraphTranslations };
        delete next[blockId];
        return { paragraphTranslations: next };
      }
      const existing = state.paragraphTranslations[blockId] ?? {
        translationAr: '',
        showSimplified: false,
        isLoading: false,
      };
      return {
        paragraphTranslations: {
          ...state.paragraphTranslations,
          [blockId]: { ...existing, ...partialState },
        },
      };
    }),

  openFigureModal: (figure, returnAnchor) =>
    set((state) => ({
      activeFigure: figure,
      returnAnchor: returnAnchor ?? state.returnAnchor,
    })),

  closeFigureModal: () =>
    set({
      activeFigure: null,
    }),

  setReturnAnchor: (returnAnchor) => set({ returnAnchor }),
}));
