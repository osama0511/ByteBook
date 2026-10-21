/**
 * ByteBook — Local SQLite Database Schema
 * Designed for high-speed reflowable block streaming, figure ID indexing,
 * offline translation cache, and the user's personal Vocabulary Bank.
 */

export const BYTEBOOK_DB_NAME = 'bytebook_v2.db';

export const SQLITE_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    format TEXT NOT NULL,
    cover_uri TEXT,
    cover_accent_color TEXT,
    total_chapters INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,
    current_chapter_index INTEGER DEFAULT 0,
    current_block_index INTEGER DEFAULT 0,
    reading_progress REAL DEFAULT 0,
    last_read_snippet TEXT,
    domain_context TEXT,
    bundle_json TEXT,
    created_at INTEGER NOT NULL,
    last_read_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS translation_cache (
    cache_key TEXT PRIMARY KEY NOT NULL,
    granularity TEXT NOT NULL,
    selected_text TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS vocabulary_bank (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT,
    word TEXT NOT NULL,
    phonetic TEXT,
    contextual_translation_ar TEXT NOT NULL,
    lexical_meaning_ar TEXT,
    part_of_speech TEXT,
    context_sentence TEXT,
    example_sentence_en TEXT,
    technical_explanation_ar TEXT,
    mastery_level INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary_bank(word);`,
];
