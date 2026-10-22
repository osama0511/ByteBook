/**
 * ByteBook — Multi-Granular Hierarchical Text Tokenizer
 * Decomposes each paragraph into:
 *   1. Paragraph Block
 *   2. Abbreviation-aware Sentence Nodes
 *   3. Interactive Word Tokens, Punctuation, and Figure Badges
 */

import { FigureReferenceDetector } from './figureReferenceDetector';
import {
  InlineStyleRun,
  InlineTextStyle,
  InlineToken,
  TableCell,
  TokenizedBlockPayload,
  TokenizedSentenceNode,
} from './types';

/**
 * Common academic & technical abbreviations that end with a period
 * but should NOT split a sentence.
 */
const PROTECTED_ABBREVIATIONS = new Set([
  'fig.',
  'figs.',
  'eq.',
  'eqs.',
  'dr.',
  'mr.',
  'mrs.',
  'ms.',
  'prof.',
  'inc.',
  'ltd.',
  'vs.',
  'etc.',
  'e.g.',
  'i.e.',
  'cf.',
  'al.',
  'ch.',
  'sec.',
  'vol.',
  'no.',
  'pp.',
]);

const WORD_OR_PUNCT_REGEX = /([A-Za-z0-9\u00C0-\u024F']+(?:-[A-Za-z0-9\u00C0-\u024F']+)*|\s+|[^\sA-Za-z0-9\u00C0-\u024F']+)/g;

export class TokenizerEngine {
  private figureDetector: FigureReferenceDetector;

  constructor(figureDetector: FigureReferenceDetector = new FigureReferenceDetector()) {
    this.figureDetector = figureDetector;
  }

  /**
   * Splits a paragraph into sentences while protecting technical abbreviations (e.g., "Fig. 3").
   */
  public splitIntoSentences(paragraphText: string): string[] {
    const trimmed = paragraphText.trim();
    if (!trimmed) return [];

    const rawParts = trimmed.split(/(?<=[.!?])\s+/);
    const mergedSentences: string[] = [];

    for (const part of rawParts) {
      if (mergedSentences.length === 0) {
        mergedSentences.push(part);
        continue;
      }

      const prevSentence = mergedSentences[mergedSentences.length - 1];
      const lastWordMatch = prevSentence.match(/(\S+)$/);
      const lastWordLower = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';

      if (PROTECTED_ABBREVIATIONS.has(lastWordLower)) {
        mergedSentences[mergedSentences.length - 1] = `${prevSentence} ${part}`;
      } else {
        mergedSentences.push(part);
      }
    }

    return mergedSentences;
  }

  /**
   * Finds the style (if any) covering the character at `offset` of the block's raw text.
   */
  private styleAt(
    runs: InlineStyleRun[] | undefined,
    offset: number
  ): InlineTextStyle | undefined {
    if (!runs || runs.length === 0 || offset < 0) return undefined;
    let merged: InlineTextStyle | undefined;
    for (const run of runs) {
      if (offset >= run.start && offset < run.end) {
        merged = { ...(merged ?? {}), ...run.style };
      }
    }
    return merged;
  }

  /**
   * Tokenizes ONE sentence/line into interactive tokens (words, spaces, punctuation, figure badges).
   * `baseOffset` is the sentence's character offset in the block's raw text (-1 = unknown → no styles).
   */
  private buildSentenceNode(
    sentenceId: string,
    rawSentence: string,
    bookId: string,
    baseOffset: number,
    runs: InlineStyleRun[] | undefined,
    referencedFigureIds: Set<string>
  ): TokenizedSentenceNode {
    const figureSpans = this.figureDetector.detectReferences(rawSentence, bookId);
    const tokens: InlineToken[] = [];

    let cursor = 0;
    let tokenCounter = 0;

    const tokenizeTextSegment = (segmentText: string, segmentStart: number) => {
      WORD_OR_PUNCT_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = WORD_OR_PUNCT_REGEX.exec(segmentText)) !== null) {
        const piece = match[0];
        const tokenId = `${sentenceId}_t${tokenCounter++}`;
        const style = this.styleAt(
          runs,
          baseOffset < 0 ? -1 : baseOffset + segmentStart + match.index
        );

        if (/^\s+$/.test(piece)) {
          tokens.push({
            id: tokenId,
            type: 'space',
            text: piece,
            ...(style ? { style } : {}),
          });
        } else if (/^[A-Za-z0-9\u00C0-\u024F']/.test(piece)) {
          tokens.push({
            id: tokenId,
            type: 'word',
            text: piece,
            cleanWord: piece.toLowerCase().replace(/^'+|'+$/g, ''),
            sentenceId,
            ...(style ? { style } : {}),
          });
        } else {
          tokens.push({
            id: tokenId,
            type: 'punctuation',
            text: piece,
            ...(style ? { style } : {}),
          });
        }
      }
    };

    for (const span of figureSpans) {
      if (span.startIndex > cursor) {
        tokenizeTextSegment(rawSentence.slice(cursor, span.startIndex), cursor);
      }

      referencedFigureIds.add(span.figureId);
      tokens.push({
        id: `${sentenceId}_t${tokenCounter++}`,
        type: 'figure_badge',
        text: span.matchedText,
        figureId: span.figureId,
        figureNumber: span.figureNumber,
        badgeLabel: span.badgeLabel,
      });

      cursor = span.endIndex;
    }

    if (cursor < rawSentence.length) {
      tokenizeTextSegment(rawSentence.slice(cursor), cursor);
    }

    return { sentenceId, rawSentence, tokens };
  }

  /**
   * Tokenizes a paragraph into a hierarchical AST payload with inline Figure Badges.
   * Optional `styleRuns` (character ranges of the raw paragraph) attach bold / italic /
   * underline / code styles to the produced tokens without affecting tap handling.
   */
  public tokenizeParagraph(
    blockId: string,
    rawParagraph: string,
    bookId: string = 'book',
    styleRuns?: InlineStyleRun[]
  ): { payload: TokenizedBlockPayload; referencedFigureIds: string[] } {
    const sentenceStrings = this.splitIntoSentences(rawParagraph);
    const referencedFigureIds = new Set<string>();

    // Locate every sentence inside the raw paragraph to map style runs → tokens
    let searchFrom = rawParagraph.length - rawParagraph.trimStart().length;

    const sentences: TokenizedSentenceNode[] = sentenceStrings.map(
      (rawSentence, sIndex) => {
        const sentenceId = `${blockId}_s${sIndex}`;
        let baseOffset = -1;
        if (styleRuns && styleRuns.length > 0) {
          const found = rawParagraph.indexOf(rawSentence, searchFrom);
          if (found >= 0) {
            baseOffset = found;
            searchFrom = found + rawSentence.length;
          }
        }
        return this.buildSentenceNode(
          sentenceId,
          rawSentence,
          bookId,
          baseOffset,
          styleRuns,
          referencedFigureIds
        );
      }
    );

    return {
      payload: {
        blockId,
        sentences,
      },
      referencedFigureIds: Array.from(referencedFigureIds),
    };
  }

  /**
   * Tokenizes a code block: every source line is its own "sentence" so indentation and line
   * breaks are preserved verbatim, while words remain tappable for translation.
   */
  public tokenizeCodeLines(
    blockId: string,
    rawCode: string,
    bookId: string = 'book'
  ): { payload: TokenizedBlockPayload; referencedFigureIds: string[] } {
    const referencedFigureIds = new Set<string>();
    const lines = rawCode.split(/\r?\n/);
    const sentences = lines.map((line, idx) =>
      this.buildSentenceNode(
        `${blockId}_s${idx}`,
        line,
        bookId,
        -1,
        undefined,
        referencedFigureIds
      )
    );
    return {
      payload: { blockId, sentences },
      referencedFigureIds: Array.from(referencedFigureIds),
    };
  }

  /**
   * Tokenizes a 2D table: each cell passes through the same hierarchical tokenizer as a normal
   * paragraph so every word/sentence inside a cell stays tappable and contextually translatable.
   */
  public tokenizeTable(
    blockId: string,
    rows: string[][],
    bookId: string = 'book'
  ): {
    payload: TokenizedBlockPayload;
    referencedFigureIds: string[];
    rawText: string;
  } {
    const referencedFigureIds = new Set<string>();
    const tableRows: TableCell[][] = rows.map((row, rIdx) =>
      row.map((cellText, cIdx) => {
        const cellId = `${blockId}_r${rIdx}_c${cIdx}`;
        const { payload, referencedFigureIds: refs } = this.tokenizeParagraph(
          cellId,
          cellText,
          bookId
        );
        refs.forEach((r) => referencedFigureIds.add(r));
        return {
          cellId,
          rawText: cellText,
          isHeader: rIdx === 0,
          sentences: payload.sentences,
        };
      })
    );

    return {
      payload: {
        blockId,
        sentences: [],
        layout: { rows: tableRows },
      },
      referencedFigureIds: Array.from(referencedFigureIds),
      rawText: rows.map((r) => r.join(' | ')).join('\n'),
    };
  }
}
