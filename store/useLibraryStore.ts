/**
 * ByteBook — Library, Chapter-by-Chapter Progression & Vocabulary Bank Store
 */

import { create } from 'zustand';
import { byteBookDb, VocabularyBankItem } from '../database';
import {
  bookParserService,
  isCleanHumanReadableText,
  ParsedBookBundle,
} from '../services/parser';

interface LibraryState {
  books: ParsedBookBundle[];
  vocabulary: VocabularyBankItem[];
  isInitialized: boolean;
  isImporting: boolean;
  importStatusMessage: string | null;

  initializeLibrary: () => Promise<void>;
  addOrUpdateBook: (book: ParsedBookBundle) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  completeChapterAndLoadNext: (
    bookId: string,
    completedChapterIndex: number
  ) => Promise<number>;
  ensureChapterExtracted: (
    bookId: string,
    targetChapterIndex: number,
    forceReExtract?: boolean
  ) => Promise<void>;
  updateBookProgress: (
    bookId: string,
    chapterIndex: number,
    blockIndex: number,
    progress: number,
    snippet: string
  ) => Promise<void>;
  setImportState: (isImporting: boolean, message?: string | null) => void;
  saveWordToVocabulary: (
    item: Omit<VocabularyBankItem, 'id' | 'createdAt' | 'masteryLevel'>
  ) => Promise<void>;
  deleteVocabularyItem: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: bookParserService.getBuiltInDemoBooks(),
  vocabulary: [],
  isInitialized: false,
  isImporting: false,
  importStatusMessage: null,

  initializeLibrary: async () => {
    if (get().isInitialized) return;
    await byteBookDb.initialize();

    const demoBooks = bookParserService.getBuiltInDemoBooks();
    const persistedBooks = await byteBookDb.loadAllBooks();
    const vocabList = await byteBookDb.getVocabularyBank();

    // Filter out any corrupted or full-page-image books that were saved by an older parser
    const validPersistedBooks: ParsedBookBundle[] = [];
    for (const b of persistedBooks) {
      if (b.id === 'bytebook_cs_ai_masterpiece') continue;
      const hasOldPageImagePlaceholder = b.chapters?.[0]?.blocks?.some((blk) =>
        blk.rawText.includes('صفحة مصورة / شكل توضيحي كامل')
      );
      const firstBlk = b.chapters?.[0]?.blocks?.[0]?.rawText;
      if (
        hasOldPageImagePlaceholder ||
        (firstBlk && !isCleanHumanReadableText(firstBlk))
      ) {
        await byteBookDb.deleteBookBundle(b.id);
        continue;
      }
      validPersistedBooks.push(b);
    }

    const mergedMap = new Map<string, ParsedBookBundle>();
    for (const demo of demoBooks) {
      mergedMap.set(demo.id, demo);
    }
    for (const saved of validPersistedBooks) {
      mergedMap.set(saved.id, saved);
    }

    const finalBooks = Array.from(mergedMap.values());
    for (const demo of demoBooks) {
      await byteBookDb.saveBookBundle(demo);
    }

    set({
      books: finalBooks,
      vocabulary: vocabList,
      isInitialized: true,
    });
  },

  addOrUpdateBook: async (book: ParsedBookBundle) => {
    await byteBookDb.saveBookBundle(book);
    set((state) => {
      const filtered = state.books.filter((b) => b.id !== book.id);
      return { books: [book, ...filtered] };
    });
  },

  deleteBook: async (bookId: string) => {
    await byteBookDb.deleteBookBundle(bookId);
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
    }));
  },

  /**
   * Marks the current chapter as Completed ("أنهيت الشابتر") and extracts
   * the next chapter's text and figures on-demand so large PDFs stay fast.
   */
  completeChapterAndLoadNext: async (bookId, completedChapterIndex) => {
    const state = get();
    const book = state.books.find((b) => b.id === bookId);
    if (!book) return completedChapterIndex;

    const nextChapterIndex = Math.min(
      book.chapters.length - 1,
      completedChapterIndex + 1
    );

    // 1. Mark current chapter as completed
    let updatedBook: ParsedBookBundle = {
      ...book,
      chapters: book.chapters.map((ch, idx) =>
        idx === completedChapterIndex ? { ...ch, isCompleted: true } : ch
      ),
    };

    // 2. Extract next chapter on-demand if needed
    updatedBook = await bookParserService.extractChapterOnDemand(
      updatedBook,
      nextChapterIndex
    );

    const completedCount = updatedBook.chapters.filter(
      (c) => c.isCompleted
    ).length;
    const progress = Math.min(
      1,
      Math.max(0.05, completedCount / Math.max(1, updatedBook.chapters.length))
    );
    const nextFirstBlock =
      updatedBook.chapters[nextChapterIndex]?.blocks?.[0]?.rawText ?? '';

    updatedBook = {
      ...updatedBook,
      currentChapterIndex: nextChapterIndex,
      currentBlockIndex: 0,
      readingProgress: progress,
      lastReadSnippet: nextFirstBlock
        ? `${nextFirstBlock.slice(0, 120)}...`
        : updatedBook.lastReadSnippet,
      lastReadAt: Date.now(),
    };

    await byteBookDb.saveBookBundle(updatedBook);
    set((s) => ({
      books: s.books.map((b) => (b.id === bookId ? updatedBook : b)),
    }));

    return nextChapterIndex;
  },

  ensureChapterExtracted: async (
    bookId,
    targetChapterIndex,
    forceReExtract = false
  ) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;
    const updatedBook = await bookParserService.extractChapterOnDemand(
      book,
      targetChapterIndex,
      forceReExtract
    );
    await byteBookDb.saveBookBundle(updatedBook);
    set((s) => ({
      books: s.books.map((b) => (b.id === bookId ? updatedBook : b)),
    }));
  },

  updateBookProgress: async (
    bookId,
    chapterIndex,
    blockIndex,
    progress,
    snippet
  ) => {
    const clampedProgress = Math.max(0.01, Math.min(1, progress));
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              currentChapterIndex: chapterIndex,
              currentBlockIndex: blockIndex,
              readingProgress: clampedProgress,
              lastReadSnippet: snippet || b.lastReadSnippet,
              lastReadAt: Date.now(),
            }
          : b
      ),
    }));

    await byteBookDb.updateReadingPosition(
      bookId,
      chapterIndex,
      blockIndex,
      clampedProgress,
      snippet
    );
  },

  setImportState: (isImporting, message = null) =>
    set({ isImporting, importStatusMessage: message }),

  saveWordToVocabulary: async (item) => {
    const newEntry: VocabularyBankItem = {
      ...item,
      id: `vocab_${item.word.toLowerCase()}_${Date.now()}`,
      masteryLevel: 1,
      createdAt: Date.now(),
    };
    await byteBookDb.saveToVocabularyBank(newEntry);
    const updated = await byteBookDb.getVocabularyBank();
    set({ vocabulary: updated });
  },

  deleteVocabularyItem: async (id) => {
    await byteBookDb.deleteFromVocabularyBank(id);
    const updated = await byteBookDb.getVocabularyBank();
    set({ vocabulary: updated });
  },
}));
