/**
 * ByteBook — Smart Figure & Image Reference Detector
 * Automatically detects any figure reference inside flowing text:
 * - Explicit English: "Figure 3", "Fig. 3", "Figs. 2", "Diagram 1", "Chart 4", "Plate 2"
 * - Explicit Arabic: "شكل 3", "الشكل 3", "صورة 2", "رسم 1"
 * - Numeric Brackets/Parentheses: "[1]", "[2]", "[3]", "(1)", "(2)", "(3)"
 * Converts them into interactive Pixel Badges linked to the exact BookFigureRecord.
 */

import { BookFigureRecord } from './types';

export interface DetectedFigureSpan {
  startIndex: number;
  endIndex: number;
  matchedText: string;
  figureNumber: string;
  figureId: string;
  badgeLabel: string;
}

/**
 * Matches explicit English & Arabic figure mentions:
 * "Figure 3", "Fig. 3.2", "Diagram 2", "Chart 1", "شكل 3", "الشكل 2"
 */
const EXPLICIT_FIGURE_REGEX =
  /(?:\b(?:Figures?|Figs?\.?|Diagrams?|Charts?|Plates?|Exhibits?|Illustrations?)|(?:ال)?(?:شكل|صورة|رسم))\s*#?\s*(\d+(?:[.\-]\d+)?[a-zA-Z]?|[IVXLCDM]+)\b/gi;

/**
 * Matches bracketed or parenthetical numeric references like [1], [2], [3], (1), (2), (3)
 */
const BRACKET_OR_PAREN_NUMBER_REGEX =
  /(\[(\d{1,2}(?:[.\-]\d+)?)\]|\((\d{1,2}(?:[.\-]\d+)?)\))/g;

/**
 * Contextual cues that indicate a parenthetical number e.g. "(3)" is a figure reference
 */
const VISUAL_CONTEXT_CUE_REGEX =
  /(?:see|shown|illustrated|depicted|refer|diagram|figure|fig|chart|architecture|pipeline|table|view|انظر|شكل|توضيح)/i;

export class FigureReferenceDetector {
  private figureLookupMap: Map<string, BookFigureRecord> = new Map();

  constructor(figures: BookFigureRecord[] = []) {
    this.indexFigures(figures);
  }

  public indexFigures(figures: BookFigureRecord[]): void {
    this.figureLookupMap.clear();
    for (const fig of figures) {
      const normalizedNum = fig.figureNumber.trim().toLowerCase();
      this.figureLookupMap.set(normalizedNum, fig);
      for (const key of fig.normalizedKeys) {
        this.figureLookupMap.set(key.trim().toLowerCase(), fig);
      }
    }
  }

  public detectReferences(
    sentence: string,
    fallbackBookId: string = 'book'
  ): DetectedFigureSpan[] {
    const spans: DetectedFigureSpan[] = [];

    // Pass 1: Explicit mentions ("Figure 2", "Fig. 3", "شكل 3")
    EXPLICIT_FIGURE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = EXPLICIT_FIGURE_REGEX.exec(sentence)) !== null) {
      const fullMatch = match[0];
      const figNum = match[1];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      const resolvedFigure = this.figureLookupMap.get(figNum.toLowerCase());
      const figureId = resolvedFigure
        ? resolvedFigure.id
        : `${fallbackBookId}_fig_${figNum}`;

      spans.push({
        startIndex,
        endIndex,
        matchedText: fullMatch,
        figureNumber: figNum,
        figureId,
        badgeLabel: `FIG.${figNum.toUpperCase()}`,
      });
    }

    // Pass 2: Bracketed [1], [3] or Parenthetical (3) references
    BRACKET_OR_PAREN_NUMBER_REGEX.lastIndex = 0;
    while ((match = BRACKET_OR_PAREN_NUMBER_REGEX.exec(sentence)) !== null) {
      const fullBracket = match[1];
      const bracketNum = match[2]; // from [N]
      const parenNum = match[3]; // from (N)
      const figNum = bracketNum || parenNum;
      if (!figNum) continue;

      const startIndex = match.index;
      const endIndex = startIndex + fullBracket.length;

      // Avoid overlapping with Pass 1
      const overlaps = spans.some(
        (s) => startIndex < s.endIndex && endIndex > s.startIndex
      );
      if (overlaps) continue;

      const resolvedFigure = this.figureLookupMap.get(figNum.toLowerCase());
      const isSquareBracket = Boolean(bracketNum);
      const prefixContext = sentence.slice(Math.max(0, startIndex - 45), startIndex);
      const hasVisualCue = VISUAL_CONTEXT_CUE_REGEX.test(prefixContext);

      // Square brackets [1], [3] always link if a figure exists or visual cue is present;
      // Parentheses (3) link if a matching figure exists in the book or visual cue precedes it.
      if (isSquareBracket || resolvedFigure || hasVisualCue) {
        const figureId = resolvedFigure
          ? resolvedFigure.id
          : `${fallbackBookId}_fig_${figNum}`;

        spans.push({
          startIndex,
          endIndex,
          matchedText: fullBracket,
          figureNumber: figNum,
          figureId,
          badgeLabel: `FIG.${figNum}`,
        });
      }
    }

    return spans.sort((a, b) => a.startIndex - b.startIndex);
  }
}
