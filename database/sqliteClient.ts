/**
 * ByteBook — High-Capacity Local Database Engine
 * - On iOS Native: Uses `expo-sqlite`
 * - On Web / PWA: Uses Browser `IndexedDB` (supports hundreds of MBs / GBs for huge PDFs & images)
 *   with an in-memory fallback mirror so `QuotaExceededError` NEVER occurs!
 */

import { Platform } from 'react-native';
import { ParsedBookBundle } from '../services/parser';
import { ContextualTranslationResponse } from '../services/translation/types';
import { BYTEBOOK_DB_NAME, SQLITE_SCHEMA_STATEMENTS } from './schema';

export interface VocabularyBankItem {
  id: string;
  bookId?: string;
  word: string;
  phonetic?: string;
  contextualTranslationAr: string;
  lexicalMeaningAr?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  exampleSentenceEn?: string;
  technicalExplanationAr?: string;
  masteryLevel: number;
  createdAt: number;
}

const IDB_NAME = 'bytebook_indexeddb_v3';
const IDB_VERSION = 1;
const STORES = {
  BOOKS: 'books_store',
  PDF_BINARIES: 'pdf_binaries_store',
  TRANSLATION_CACHE: 'translation_cache_store',
  VOCABULARY: 'vocabulary_store',
} as const;

export class ByteBookDatabaseClient {
  private isInitialized = false;
  private nativeDb: any = null;
  private idbPromise: Promise<IDBDatabase | null> | null = null;

  // In-memory mirrors guarantee instant access and zero failures even if storage is restricted
  private memoryBooks = new Map<string, ParsedBookBundle>();
  private memoryPdfBinaries = new Map<string, Uint8Array>();
  private memoryTranslations = new Map<string, ContextualTranslationResponse>();
  private memoryVocabulary = new Map<string, VocabularyBankItem>();

  private openIndexedDB(): Promise<IDBDatabase | null> {
    if (Platform.OS !== 'web' || typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (this.idbPromise) return this.idbPromise;

    this.idbPromise = new Promise((resolve) => {
      try {
        // Clean up old 5MB localStorage key that caused QuotaExceededError
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.removeItem('bytebook_persisted_books_v2');
          } catch {
            // ignore
          }
        }

        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORES.BOOKS)) {
            db.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.PDF_BINARIES)) {
            db.createObjectStore(STORES.PDF_BINARIES);
          }
          if (!db.objectStoreNames.contains(STORES.TRANSLATION_CACHE)) {
            db.createObjectStore(STORES.TRANSLATION_CACHE);
          }
          if (!db.objectStoreNames.contains(STORES.VOCABULARY)) {
            db.createObjectStore(STORES.VOCABULARY, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.idbPromise;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (Platform.OS === 'web') {
      await this.openIndexedDB();
      this.isInitialized = true;
      return;
    }

    try {
      const SQLite = await import('expo-sqlite');
      this.nativeDb = await SQLite.openDatabaseAsync(BYTEBOOK_DB_NAME);

      for (const statement of SQLITE_SCHEMA_STATEMENTS) {
        await this.nativeDb.execAsync(statement);
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[ByteBookDB] Fallback to memory mode:', err);
      this.isInitialized = true;
    }
  }

  // ============================================================================
  // 0. RAW PDF BINARY STORAGE (FOR ON-DEMAND CHAPTER EXTRACTION)
  // ============================================================================

  public async savePdfBinary(bookId: string, bytes: Uint8Array): Promise<void> {
    this.memoryPdfBinaries.set(bookId, bytes);
    if (Platform.OS === 'web') {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORES.PDF_BINARIES, 'readwrite');
          tx.objectStore(STORES.PDF_BINARIES).put(bytes, bookId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  public async loadPdfBinary(bookId: string): Promise<Uint8Array | null> {
    const mem = this.memoryPdfBinaries.get(bookId);
    if (mem) return mem;

    if (Platform.OS === 'web') {
      const db = await this.openIndexedDB();
      if (!db) return null;
      return new Promise<Uint8Array | null>((resolve) => {
        try {
          const tx = db.transaction(STORES.PDF_BINARIES, 'readonly');
          const req = tx.objectStore(STORES.PDF_BINARIES).get(bookId);
          req.onsuccess = () => {
            if (req.result) {
              const arr =
                req.result instanceof Uint8Array
                  ? req.result
                  : new Uint8Array(req.result);
              this.memoryPdfBinaries.set(bookId, arr);
              resolve(arr);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return null;
  }

  // ============================================================================
  // 1. BOOKS & READING PROGRESS PERSISTENCE (UNLIMITED INDEXEDDB + SQLITE)
  // ============================================================================

  public async saveBookBundle(book: ParsedBookBundle): Promise<void> {
    await this.initialize();
    this.memoryBooks.set(book.id, book);

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORES.BOOKS, 'readwrite');
          tx.objectStore(STORES.BOOKS).put(book);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    try {
      const bundleJson = JSON.stringify(book);
      await this.nativeDb.runAsync(
        `INSERT OR REPLACE INTO books (
          id, title, author, format, cover_uri, cover_accent_color,
          total_chapters, total_blocks, current_chapter_index, current_block_index,
          reading_progress, last_read_snippet, domain_context, bundle_json, created_at, last_read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          book.id,
          book.title,
          book.author,
          book.format,
          book.coverUri ?? null,
          book.coverAccentColor ?? '#C84B31',
          book.chapters.length,
          book.totalBlocks ?? 0,
          book.currentChapterIndex ?? 0,
          book.currentBlockIndex ?? 0,
          book.readingProgress ?? 0,
          book.lastReadSnippet ?? '',
          book.domainContext ?? '',
          bundleJson,
          book.createdAt ?? Date.now(),
          book.lastReadAt ?? Date.now(),
        ]
      );
    } catch (err) {
      console.warn('[ByteBookDB] SQLite saveBookBundle warning:', err);
    }
  }

  public async deleteBookBundle(bookId: string): Promise<void> {
    await this.initialize();
    this.memoryBooks.delete(bookId);
    this.memoryPdfBinaries.delete(bookId);

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(
            [STORES.BOOKS, STORES.PDF_BINARIES],
            'readwrite'
          );
          tx.objectStore(STORES.BOOKS).delete(bookId);
          tx.objectStore(STORES.PDF_BINARIES).delete(bookId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    try {
      await this.nativeDb.runAsync(`DELETE FROM books WHERE id = ?;`, [bookId]);
    } catch {
      // ignore
    }
  }

  public async loadAllBooks(): Promise<ParsedBookBundle[]> {
    await this.initialize();

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) {
        return Array.from(this.memoryBooks.values());
      }
      return new Promise<ParsedBookBundle[]>((resolve) => {
        try {
          const tx = db.transaction(STORES.BOOKS, 'readonly');
          const req = tx.objectStore(STORES.BOOKS).getAll();
          req.onsuccess = () => {
            const list = (req.result || []) as ParsedBookBundle[];
            for (const b of list) {
              this.memoryBooks.set(b.id, b);
            }
            const combined = Array.from(this.memoryBooks.values()).sort(
              (a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0)
            );
            resolve(combined);
          };
          req.onerror = () => resolve(Array.from(this.memoryBooks.values()));
        } catch {
          resolve(Array.from(this.memoryBooks.values()));
        }
      });
    }

    try {
      const rows = await this.nativeDb.getAllAsync(
        `SELECT bundle_json, current_chapter_index, current_block_index, reading_progress, last_read_snippet, last_read_at FROM books ORDER BY last_read_at DESC;`
      );
      return rows
        .map((r: any) => {
          try {
            const parsed = JSON.parse(r.bundle_json) as ParsedBookBundle;
            return {
              ...parsed,
              currentChapterIndex:
                r.current_chapter_index ?? parsed.currentChapterIndex ?? 0,
              currentBlockIndex:
                r.current_block_index ?? parsed.currentBlockIndex ?? 0,
              readingProgress:
                r.reading_progress ?? parsed.readingProgress ?? 0,
              lastReadSnippet:
                r.last_read_snippet ?? parsed.lastReadSnippet ?? '',
              lastReadAt: r.last_read_at ?? parsed.lastReadAt ?? Date.now(),
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ParsedBookBundle[];
    } catch {
      return Array.from(this.memoryBooks.values());
    }
  }

  public async updateReadingPosition(
    bookId: string,
    chapterIndex: number,
    blockIndex: number,
    progress: number,
    snippet: string
  ): Promise<void> {
    await this.initialize();

    const existing = this.memoryBooks.get(bookId);
    if (existing) {
      const updated: ParsedBookBundle = {
        ...existing,
        currentChapterIndex: chapterIndex,
        currentBlockIndex: blockIndex,
        readingProgress: progress,
        lastReadSnippet: snippet,
        lastReadAt: Date.now(),
      };
      this.memoryBooks.set(bookId, updated);
      if (Platform.OS === 'web' || !this.nativeDb) {
        await this.saveBookBundle(updated);
        return;
      }
    }

    if (Platform.OS !== 'web' && this.nativeDb) {
      try {
        await this.nativeDb.runAsync(
          `UPDATE books SET current_chapter_index = ?, current_block_index = ?, reading_progress = ?, last_read_snippet = ?, last_read_at = ? WHERE id = ?;`,
          [chapterIndex, blockIndex, progress, snippet, Date.now(), bookId]
        );
      } catch {
        // ignore
      }
    }
  }

  // ============================================================================
  // 2. OFFLINE TRANSLATION CACHE
  // ============================================================================

  public async getCachedTranslation(
    cacheKey: string
  ): Promise<ContextualTranslationResponse | null> {
    await this.initialize();
    const mem = this.memoryTranslations.get(cacheKey);
    if (mem) return mem;

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return null;
      return new Promise<ContextualTranslationResponse | null>((resolve) => {
        try {
          const tx = db.transaction(STORES.TRANSLATION_CACHE, 'readonly');
          const req = tx.objectStore(STORES.TRANSLATION_CACHE).get(cacheKey);
          req.onsuccess = () => {
            if (req.result) {
              this.memoryTranslations.set(cacheKey, req.result);
              resolve(req.result as ContextualTranslationResponse);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    try {
      const row = await this.nativeDb.getFirstAsync(
        `SELECT response_json FROM translation_cache WHERE cache_key = ?;`,
        [cacheKey]
      );
      if (row?.response_json) {
        return JSON.parse(row.response_json) as ContextualTranslationResponse;
      }
    } catch {
      return null;
    }
    return null;
  }

  public async saveCachedTranslation(
    cacheKey: string,
    response: ContextualTranslationResponse
  ): Promise<void> {
    await this.initialize();
    this.memoryTranslations.set(cacheKey, response);

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORES.TRANSLATION_CACHE, 'readwrite');
          tx.objectStore(STORES.TRANSLATION_CACHE).put(response, cacheKey);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    try {
      await this.nativeDb.runAsync(
        `INSERT OR REPLACE INTO translation_cache (cache_key, granularity, selected_text, response_json, created_at) VALUES (?, ?, ?, ?, ?);`,
        [
          cacheKey,
          response.granularity,
          response.selectedText,
          JSON.stringify(response),
          Date.now(),
        ]
      );
    } catch {
      // Ignore cache write errors
    }
  }

  // ============================================================================
  // 3. VOCABULARY BANK ("بنك مفرداتي")
  // ============================================================================

  public async getVocabularyBank(): Promise<VocabularyBankItem[]> {
    await this.initialize();

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return Array.from(this.memoryVocabulary.values());
      return new Promise<VocabularyBankItem[]>((resolve) => {
        try {
          const tx = db.transaction(STORES.VOCABULARY, 'readonly');
          const req = tx.objectStore(STORES.VOCABULARY).getAll();
          req.onsuccess = () => {
            const list = ((req.result || []) as VocabularyBankItem[]).sort(
              (a, b) => b.createdAt - a.createdAt
            );
            for (const item of list) {
              this.memoryVocabulary.set(item.id, item);
            }
            resolve(list);
          };
          req.onerror = () => resolve(Array.from(this.memoryVocabulary.values()));
        } catch {
          resolve(Array.from(this.memoryVocabulary.values()));
        }
      });
    }

    try {
      const rows = await this.nativeDb.getAllAsync(
        `SELECT * FROM vocabulary_bank ORDER BY created_at DESC;`
      );
      return rows.map((r: any) => ({
        id: r.id,
        bookId: r.book_id,
        word: r.word,
        phonetic: r.phonetic,
        contextualTranslationAr: r.contextual_translation_ar,
        lexicalMeaningAr: r.lexical_meaning_ar,
        partOfSpeech: r.part_of_speech,
        contextSentence: r.context_sentence,
        exampleSentenceEn: r.example_sentence_en,
        technicalExplanationAr: r.technical_explanation_ar,
        masteryLevel: r.mastery_level ?? 1,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  public async saveToVocabularyBank(item: VocabularyBankItem): Promise<void> {
    await this.initialize();
    this.memoryVocabulary.set(item.id, item);

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORES.VOCABULARY, 'readwrite');
          tx.objectStore(STORES.VOCABULARY).put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    await this.nativeDb.runAsync(
      `INSERT OR REPLACE INTO vocabulary_bank (
        id, book_id, word, phonetic, contextual_translation_ar,
        lexical_meaning_ar, part_of_speech, context_sentence,
        example_sentence_en, technical_explanation_ar, mastery_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.bookId ?? null,
        item.word,
        item.phonetic ?? '',
        item.contextualTranslationAr,
        item.lexicalMeaningAr ?? '',
        item.partOfSpeech ?? '',
        item.contextSentence ?? '',
        item.exampleSentenceEn ?? '',
        item.technicalExplanationAr ?? '',
        item.masteryLevel ?? 1,
        item.createdAt ?? Date.now(),
      ]
    );
  }

  public async deleteFromVocabularyBank(id: string): Promise<void> {
    await this.initialize();
    this.memoryVocabulary.delete(id);

    if (Platform.OS === 'web' || !this.nativeDb) {
      const db = await this.openIndexedDB();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORES.VOCABULARY, 'readwrite');
          tx.objectStore(STORES.VOCABULARY).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    await this.nativeDb.runAsync(`DELETE FROM vocabulary_bank WHERE id = ?;`, [
      id,
    ]);
  }
}

export const byteBookDb = new ByteBookDatabaseClient();
