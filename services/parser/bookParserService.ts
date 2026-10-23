/**
 * ByteBook — Book Ingestion & Progressive Chapter-by-Chapter Conversion Service
 * - Preserves 100% of the book's verbatim content (NO summarization).
 * - Supports on-demand chapter extraction ("أنهيت الشابتر") for 1,000+ page PDFs/EPUBs.
 */

import { strFromU8 } from 'fflate';
import { BUILTIN_DEMO_BOOKS, RawDemoBookSpec } from './demoBookData';
import { parseEpubBuffer } from './epubParser';
import { FigureReferenceDetector } from './figureReferenceDetector';
import {
  extractPdfChapterPageRange,
  getCachedPdfBufferForBook,
  isErrorOrPlaceholderParagraph,
  parsePdfBufferToReflowable,
  parsePlainTextContent,
} from './pdfAndTextParser';
import { TokenizerEngine } from './tokenizerEngine';
import {
  BookFigureRecord,
  ContentBlockType,
  ParsedBookBundle,
  ParsedChapter,
  ParsedContentBlock,
  RawRichParagraph,
  SupportedBookFormat,
  TokenizedBlockPayload,
} from './types';

export interface RawBookImportInput {
  bookId: string;
  title: string;
  author?: string;
  format: SupportedBookFormat;
  coverAccentColor?: string;
  domainContext?: string;
  readingProgress?: number;
  currentChapterIndex?: number;
  currentBlockIndex?: number;
  lastReadSnippet?: string;
  totalPages?: number;
  rawChapters: {
    title: string;
    paragraphs: (string | RawRichParagraph)[];
    paragraphFigures?: Record<number, string[]>;
    isExtracted?: boolean;
    isCompleted?: boolean;
    startPage?: number;
    endPage?: number;
    pageRangeLabel?: string;
  }[];
  extractedFigures?: BookFigureRecord[];
}

export class BookParserService {
  /**
   * Tokenizes a single chapter's raw paragraphs and links its figure references.
   */
  public tokenizeChapterParagraphs(
    bookId: string,
    chapterId: string,
    paragraphs: (string | RawRichParagraph)[],
    figures: BookFigureRecord[],
    paragraphFigures?: Record<number, string[]>
  ): ParsedContentBlock[] {
    const detector = new FigureReferenceDetector(figures);
    const tokenizer = new TokenizerEngine(detector);

    return paragraphs.map((paraItem, bIndex) => {
      const rich: RawRichParagraph | null =
        typeof paraItem === 'string' ? null : paraItem;
      let rawText = typeof paraItem === 'string' ? paraItem : paraItem.text;
      const explicitAttached =
        typeof paraItem === 'string'
          ? paragraphFigures?.[bIndex]
          : paraItem.attachedFigureIds ?? paragraphFigures?.[bIndex];

      const blockId = `${chapterId}_blk_${bIndex}`;
      const isLegacyHeading =
        (bIndex === 0 && rawText.length < 95 && !rawText.endsWith('.')) ||
        /^—\s*Page\s+\d+\s*—$/i.test(rawText.trim());

      let blockType: ContentBlockType = isLegacyHeading
        ? 'heading'
        : 'paragraph';
      let payload: TokenizedBlockPayload;
      let referencedFigureIds: string[];

      const richType = rich?.blockType;
      if (
        richType === 'table' &&
        rich?.tableRows &&
        rich.tableRows.length > 0
      ) {
        const tokenizedTable = tokenizer.tokenizeTable(
          blockId,
          rich.tableRows,
          bookId
        );
        payload = tokenizedTable.payload;
        referencedFigureIds = tokenizedTable.referencedFigureIds;
        rawText = tokenizedTable.rawText;
        blockType = 'table';
      } else if (richType === 'code_block') {
        const tokenizedCode = tokenizer.tokenizeCodeLines(
          blockId,
          rawText,
          bookId
        );
        payload = tokenizedCode.payload;
        referencedFigureIds = tokenizedCode.referencedFigureIds;
        blockType = 'code_block';
      } else {
        const tokenized = tokenizer.tokenizeParagraph(
          blockId,
          rawText,
          bookId,
          rich?.styleRuns
        );
        payload = tokenized.payload;
        referencedFigureIds = tokenized.referencedFigureIds;

        if (
          richType === 'heading_1' ||
          richType === 'heading_2' ||
          richType === 'heading_3'
        ) {
          blockType = richType;
          payload.layout = {
            headingLevel: richType === 'heading_1' ? 1 : richType === 'heading_2' ? 2 : 3,
          };
        } else if (
          richType === 'unordered_list_item' ||
          richType === 'ordered_list_item'
        ) {
          blockType = richType;
          payload.layout = {
            listMarker: rich?.listMarker,
            indentLevel: rich?.indentLevel ?? 0,
          };
          // The verbatim text keeps its original marker
          if (rich?.listMarker) rawText = `${rich.listMarker} ${rawText}`;
        } else if (richType === 'paragraph') {
          blockType = isLegacyHeading ? 'heading' : 'paragraph';
        }
      }

      const attachedSet = new Set<string>(explicitAttached ?? []);
      for (const refFigId of referencedFigureIds) {
        const figObj = figures.find((f) => f.id === refFigId);
        if (figObj && !figObj.anchorBlockId) {
          figObj.anchorBlockId = blockId;
          attachedSet.add(figObj.id);
        }
      }

      return {
        id: blockId,
        bookId,
        chapterId,
        blockIndex: bIndex,
        blockType,
        rawText,
        tokenizedPayload: payload,
        referencedFigureIds,
        attachedFigureIds: Array.from(attachedSet),
        cachedTranslationAr: rich ? rich.translationAr : undefined,
        cachedSimplifiedConceptAr: rich ? rich.simplifiedConceptAr : undefined,
      };
    });
  }

  /**
   * Converts raw book chapters and extracted figure assets into a Reflowable Book Bundle.
   */
  public buildReflowableBookBundle(input: RawBookImportInput): ParsedBookBundle {
    const figures: BookFigureRecord[] = (input.extractedFigures ?? []).map(
      (fig) => ({ ...fig })
    );

    let totalBlocksCount = 0;

    const chapters: ParsedChapter[] = input.rawChapters.map((rawCh, cIndex) => {
      const chapterId = `${input.bookId}_ch_${cIndex}`;
      const isExtracted = rawCh.isExtracted !== false;

      const blocks: ParsedContentBlock[] = isExtracted
        ? this.tokenizeChapterParagraphs(
            input.bookId,
            chapterId,
            rawCh.paragraphs,
            figures,
            rawCh.paragraphFigures
          )
        : [];

      totalBlocksCount += blocks.length;

      return {
        id: chapterId,
        bookId: input.bookId,
        chapterIndex: cIndex,
        title: rawCh.title,
        blocks,
        isExtracted,
        isCompleted: rawCh.isCompleted ?? false,
        startPage: rawCh.startPage,
        endPage: rawCh.endPage,
        pageRangeLabel: rawCh.pageRangeLabel,
      };
    });

    const firstParagraphBlock =
      chapters[0]?.blocks.find((b) => b.blockType === 'paragraph') ??
      chapters[0]?.blocks[0];

    return {
      id: input.bookId,
      title: input.title,
      author: input.author ?? 'Unknown Author',
      format: input.format,
      coverAccentColor: input.coverAccentColor ?? '#C84B31',
      domainContext:
        input.domainContext ?? 'Computer Science & Technical Literature',
      chapters,
      figures,
      currentChapterIndex: input.currentChapterIndex ?? 0,
      currentBlockIndex: input.currentBlockIndex ?? 0,
      readingProgress: input.readingProgress ?? 0.05,
      lastReadSnippet:
        input.lastReadSnippet ??
        (firstParagraphBlock
          ? `${firstParagraphBlock.rawText.slice(0, 120)}...`
          : ''),
      totalBlocks: totalBlocksCount,
      totalPages: input.totalPages,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
    };
  }

  /**
   * On-Demand Chapter Extractor ("أنهيت الشابتر"):
   * Extracts and tokenizes a specific chapter when the user advances to it,
   * recognizing all text, sentences, words, and figures for that chapter without overloading memory.
   */
  public async extractChapterOnDemand(
    book: ParsedBookBundle,
    targetChapterIndex: number,
    forceReExtract: boolean = false
  ): Promise<ParsedBookBundle> {
    const targetChapter = book.chapters[targetChapterIndex];
    if (!targetChapter) return book;

    const hasOnlyPlaceholder =
      targetChapter.blocks.length === 1 &&
      isErrorOrPlaceholderParagraph(targetChapter.blocks[0].rawText);

    // If already extracted with real content and not forced, return as-is
    if (
      !forceReExtract &&
      targetChapter.isExtracted &&
      targetChapter.blocks.length > 0 &&
      !hasOnlyPlaceholder
    ) {
      return book;
    }

    const pdfBytes = await getCachedPdfBufferForBook(book.id);
    if (book.format === 'pdf' && pdfBytes) {
      const startPage = targetChapter.startPage ?? targetChapterIndex + 1;
      const endPage = targetChapter.endPage ?? startPage;

      const extracted = await extractPdfChapterPageRange(
        pdfBytes,
        book.id,
        targetChapterIndex,
        startPage,
        endPage
      );

      const mergedFigures = [...book.figures];
      for (const newFig of extracted.figures) {
        if (!mergedFigures.some((f) => f.id === newFig.id)) {
          mergedFigures.push(newFig);
        }
      }

      const tokenizedBlocks = this.tokenizeChapterParagraphs(
        book.id,
        targetChapter.id,
        extracted.paragraphs,
        mergedFigures,
        extracted.paragraphFigures
      );

      const updatedChapters = book.chapters.map((ch, idx) =>
        idx === targetChapterIndex
          ? {
              ...ch,
              blocks: tokenizedBlocks,
              isExtracted: true,
            }
          : ch
      );

      return {
        ...book,
        chapters: updatedChapters,
        figures: mergedFigures,
      };
    }

    return book;
  }

  /**
   * Builds the pre-bundled interactive demo books.
   */
  public getBuiltInDemoBooks(): ParsedBookBundle[] {
    return BUILTIN_DEMO_BOOKS.map((spec: RawDemoBookSpec) =>
      this.buildReflowableBookBundle({
        bookId: spec.bookId,
        title: spec.title,
        author: spec.author,
        format: spec.format,
        coverAccentColor: spec.coverAccentColor,
        domainContext: spec.domainContext,
        readingProgress: spec.readingProgress,
        currentChapterIndex: spec.currentChapterIndex,
        currentBlockIndex: spec.currentBlockIndex,
        lastReadSnippet: spec.lastReadSnippet,
        rawChapters: spec.rawChapters,
        extractedFigures: spec.figures,
      })
    );
  }

  /**
   * Imports an external book file (EPUB, PDF, or TXT) from a local/web URI
   * and converts it into a native Reflowable Book Bundle (preserving 100% verbatim text).
   */
  public async importBookFromUri(
    uri: string,
    fileName: string
  ): Promise<ParsedBookBundle> {
    const bookId = `book_${Date.now()}`;
    const lowerName = fileName.toLowerCase();
    const format: SupportedBookFormat = lowerName.endsWith('.epub')
      ? 'epub'
      : lowerName.endsWith('.pdf')
      ? 'pdf'
      : 'txt';

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (format === 'epub') {
      const epubData = parseEpubBuffer(bytes, bookId, fileName);
      return this.buildReflowableBookBundle({
        bookId,
        title: epubData.title,
        author: epubData.author,
        format: 'epub',
        coverAccentColor: '#2D6A4F',
        domainContext: 'Original Verbatim EPUB Book',
        rawChapters: epubData.chapters,
        extractedFigures: epubData.figures,
      });
    }

    if (format === 'pdf') {
      const pdfData = await parsePdfBufferToReflowable(bytes, bookId, fileName);
      return this.buildReflowableBookBundle({
        bookId,
        title: pdfData.title,
        author: pdfData.author,
        format: 'pdf',
        coverAccentColor: '#8C3B2B',
        domainContext: 'Original Verbatim PDF Book (Chapter-by-Chapter)',
        totalPages: pdfData.totalPages,
        rawChapters: pdfData.chapters,
        extractedFigures: pdfData.figures,
      });
    }

    const textString = strFromU8(bytes);
    const txtData = parsePlainTextContent(textString, bookId, fileName);
    return this.buildReflowableBookBundle({
      bookId,
      title: txtData.title,
      author: txtData.author,
      format: 'txt',
      coverAccentColor: '#3D5A6C',
      domainContext: 'Original Verbatim Text Book',
      rawChapters: txtData.chapters,
      extractedFigures: txtData.figures,
    });
  }
}

export const bookParserService = new BookParserService();
