/**
 * ByteBook — Multi-Granular Hierarchical Text Tokenizer
 * Decomposes each paragraph into:
 *   1. Paragraph Block
 *   2. Abbreviation-aware Sentence Nodes
 *   3. Interactive Word Tokens, Punctuation, and Figure Badges
 */

import { FigureReferenceDetector } from './figureReferenceDetector';
import {
  InlineToken,
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
   * Tokenizes a paragraph into a hierarchical AST payload with inline Figure Badges.
   */
  public tokenizeParagraph(
    blockId: string,
    rawParagraph: string,
    bookId: string = 'book'
  ): { payload: TokenizedBlockPayload; referencedFigureIds: string[] } {
    const sentenceStrings = this.splitIntoSentences(rawParagraph);
    const referencedFigureIds = new Set<string>();

    const sentences: TokenizedSentenceNode[] = sentenceStrings.map(
      (rawSentence, sIndex) => {
        const sentenceId = `${blockId}_s${sIndex}`;
        const figureSpans = this.figureDetector.detectReferences(rawSentence, bookId);
        const tokens: InlineToken[] = [];

        let cursor = 0;
        let tokenCounter = 0;

        const tokenizeTextSegment = (segmentText: string) => {
          WORD_OR_PUNCT_REGEX.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = WORD_OR_PUNCT_REGEX.exec(segmentText)) !== null) {
            const piece = match[0];
            const tokenId = `${sentenceId}_t${tokenCounter++}`;

            if (/^\s+$/.test(piece)) {
              tokens.push({
                id: tokenId,
                type: 'space',
                text: piece,
              });
            } else if (/^[A-Za-z0-9\u00C0-\u024F']/.test(piece)) {
              tokens.push({
                id: tokenId,
                type: 'word',
                text: piece,
                cleanWord: piece.toLowerCase().replace(/^'+|'+$/g, ''),
                sentenceId,
              });
            } else {
              tokens.push({
                id: tokenId,
                type: 'punctuation',
                text: piece,
              });
            }
          }
        };

        for (const span of figureSpans) {
          if (span.startIndex > cursor) {
            tokenizeTextSegment(rawSentence.slice(cursor, span.startIndex));
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
          tokenizeTextSegment(rawSentence.slice(cursor));
        }

        return {
          sentenceId,
          rawSentence,
          tokens,
        };
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
}
