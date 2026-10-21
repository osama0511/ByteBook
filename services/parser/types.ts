/**
 * ByteBook — Book Parser & Reflowable Tokenization Types
 * Supports Chapter-by-Chapter progressive extraction for huge 1000+ page books.
 */

export type SupportedBookFormat = 'epub' | 'pdf' | 'txt';

export type ContentBlockType =
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'quote'
  | 'list_item'
  | 'figure_anchor';

export type InlineTokenType = 'word' | 'space' | 'punctuation' | 'figure_badge';

export interface BaseInlineToken {
  id: string;
  type: InlineTokenType;
  text: string;
}

export interface WordInlineToken extends BaseInlineToken {
  type: 'word';
  /** Normalized lowercase lemma/stem for dictionary & cache lookups */
  cleanWord: string;
  sentenceId: string;
}

export interface SpaceOrPunctuationToken extends BaseInlineToken {
  type: 'space' | 'punctuation';
}

export interface FigureBadgeInlineToken extends BaseInlineToken {
  type: 'figure_badge';
  figureId: string;
  figureNumber: string;
  badgeLabel: string;
}

export type InlineToken =
  | WordInlineToken
  | SpaceOrPunctuationToken
  | FigureBadgeInlineToken;

export interface TokenizedSentenceNode {
  sentenceId: string;
  rawSentence: string;
  tokens: InlineToken[];
}

export interface TokenizedBlockPayload {
  blockId: string;
  sentences: TokenizedSentenceNode[];
}

export interface BookFigureRecord {
  id: string;
  bookId: string;
  chapterId: string;
  /** e.g., "1", "2", "3", "3.2" */
  figureNumber: string;
  /** Normalized lookup keys e.g., ["3", "fig.3", "figure 3", "شكل 3"] */
  normalizedKeys: string[];
  title?: string;
  caption: string;
  captionAr?: string;
  localUri: string;
  /** Built-in pixel schematic key for procedural 16-bit technical diagrams */
  svgDiagramKey?:
    | 'transformer_attention'
    | 'memory_hierarchy'
    | 'jit_compiler_pipeline'
    | 'raft_consensus'
    | 'btree_storage'
    | 'zk_proof_circuit';
  width?: number;
  height?: number;
  anchorBlockId?: string;
}

export interface ParsedContentBlock {
  id: string;
  bookId: string;
  chapterId: string;
  blockIndex: number;
  blockType: ContentBlockType;
  rawText: string;
  tokenizedPayload: TokenizedBlockPayload;
  referencedFigureIds: string[];
  /** Figures that are visually anchored immediately after this paragraph */
  attachedFigureIds?: string[];
  /** Pre-cached or user-generated verbatim paragraph translation */
  cachedTranslationAr?: string;
  /** Optional explanation of difficult terms in the paragraph */
  cachedSimplifiedConceptAr?: string;
}

export interface ParsedChapter {
  id: string;
  bookId: string;
  chapterIndex: number;
  title: string;
  blocks: ParsedContentBlock[];
  /** Whether the user has finished reading this chapter */
  isCompleted?: boolean;
  /** Whether this chapter's text & figures have been extracted and tokenized */
  isExtracted?: boolean;
  /** For huge PDFs: start & end page numbers of this chapter chunk */
  startPage?: number;
  endPage?: number;
  pageRangeLabel?: string;
}

export interface ParsedBookBundle {
  id: string;
  title: string;
  author: string;
  format: SupportedBookFormat;
  coverUri?: string;
  coverAccentColor?: string;
  domainContext: string;
  chapters: ParsedChapter[];
  figures: BookFigureRecord[];
  currentChapterIndex?: number;
  currentBlockIndex?: number;
  readingProgress?: number;
  lastReadSnippet?: string;
  totalBlocks?: number;
  totalPages?: number;
  createdAt?: number;
  lastReadAt?: number;
}
