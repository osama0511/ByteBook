/**
 * ByteBook — Layout-Aware Heuristic PDF Analyzer (Phase 4: Rich Document Layout)
 *
 * Pure (DOM-free, pdfjs-free) geometry engine. It receives the positioned text fragments that
 * `pdfjs` extracted from ONE page (`str`, `transform` → x/y, `width`, font size and font flags) and
 * rebuilds the visual structure of the page:
 *
 *   • Headings (H1/H2/H3) from the font-size ratio against the dominant body font size
 *   • Inline rich styles (bold / italic / underline / code) as character runs
 *   • Ordered & unordered lists with indentation level and the ORIGINAL list marker
 *   • 2D tables rebuilt from shared-Y fragments that form parallel X-columns
 *   • Code blocks from consecutive monospace lines (indentation preserved)
 *
 * NOTHING is summarized or dropped: every character of the page text ends up in exactly one block.
 */

import { InlineStyleRun, InlineTextStyle, RawRichParagraph } from './types';

/** One text item of the page, already converted to viewport (top-down) coordinates. */
export interface PageFragment {
  str: string;
  /** Left edge (viewport px) */
  x: number;
  /** Baseline (viewport px, grows downward) */
  y: number;
  /** Horizontal advance of the text item (0 when unknown) */
  width: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  /** Monospace font → code */
  mono: boolean;
  /** Mathematical / technical symbol font → inline code style */
  symbol: boolean;
  underline: boolean;
}

export interface LayoutParagraph {
  rich: RawRichParagraph;
  topY: number;
  bottomY: number;
  /** Internal: x of the list marker (used to compute the indent level) */
  markerX?: number;
}

export interface PageAnalysisOptions {
  /** Dominant body font size (chapter-wide). Falls back to the page's own mode. */
  bodyFontSize?: number;
  pageWidth: number;
  pageHeight: number;
}

/* -------------------------------------------------------------------------- */
/*  Font-name heuristics                                                      */
/* -------------------------------------------------------------------------- */

const BOLD_NAME_RE =
  /bold|heavy|black|semibold|demi(?:bold)?|(?:^|[-,_+ ])(?:bd|med|medium)(?:$|[-,_+ ])/i;
const ITALIC_NAME_RE =
  /italic|oblique|slanted|(?:^|[-,_+ ])it(?:$|[-,_+ ])|-it$/i;
const MONO_NAME_RE =
  /mono|courier|consolas|menlo|monaco|typewriter|lucidaconsole|inconsolata|source ?code|fira ?code|(?:^|[-,_+ ])code(?:$|[-,_+ ])/i;
const SYMBOL_NAME_RE = /math|symbol|cmsy|cmmi|cmex|stix|mtmi|mtsy|wingding|dingbat/i;

export const detectFontFlagsFromName = (
  fontName: string
): { bold: boolean; italic: boolean; mono: boolean; symbol: boolean } => {
  const name = fontName || '';
  return {
    bold: BOLD_NAME_RE.test(name),
    italic: ITALIC_NAME_RE.test(name),
    mono: MONO_NAME_RE.test(name),
    symbol: SYMBOL_NAME_RE.test(name),
  };
};

/* -------------------------------------------------------------------------- */
/*  Rich text builder (collapses whitespace while tracking style runs)         */
/* -------------------------------------------------------------------------- */

const hasAnyStyle = (s?: InlineTextStyle): s is InlineTextStyle =>
  Boolean(s && (s.bold || s.italic || s.underline || s.code));

const sameStyle = (a: InlineTextStyle, b: InlineTextStyle): boolean =>
  Boolean(a.bold) === Boolean(b.bold) &&
  Boolean(a.italic) === Boolean(b.italic) &&
  Boolean(a.underline) === Boolean(b.underline) &&
  Boolean(a.code) === Boolean(b.code);

const fragmentStyle = (f: PageFragment): InlineTextStyle | undefined => {
  const style: InlineTextStyle = {};
  if (f.bold) style.bold = true;
  if (f.italic) style.italic = true;
  if (f.underline) style.underline = true;
  if (f.mono || f.symbol) style.code = true;
  return hasAnyStyle(style) ? style : undefined;
};

class RichTextBuilder {
  public text = '';
  public runs: InlineStyleRun[] = [];

  private pushChar(ch: string, style?: InlineTextStyle) {
    const pos = this.text.length;
    this.text += ch;
    if (hasAnyStyle(style)) {
      const last = this.runs[this.runs.length - 1];
      if (last && last.end === pos && sameStyle(last.style, style)) {
        last.end = pos + ch.length;
      } else {
        this.runs.push({ start: pos, end: pos + ch.length, style: { ...style } });
      }
    }
  }

  /** Appends text, collapsing runs of whitespace into a single space. */
  public append(str: string, style?: InlineTextStyle) {
    for (const ch of str) {
      if (/\s/.test(ch)) {
        if (this.text.length === 0 || this.text.endsWith(' ')) continue;
        this.pushChar(' ', style);
      } else {
        this.pushChar(ch, style);
      }
    }
  }

  /** Inserts a separator space (inherits the style of the following text for continuity). */
  public separator(nextStyle?: InlineTextStyle) {
    if (this.text.length === 0 || this.text.endsWith(' ')) return;
    const last = this.runs[this.runs.length - 1];
    const continues =
      last &&
      last.end === this.text.length &&
      hasAnyStyle(nextStyle) &&
      sameStyle(last.style, nextStyle);
    this.pushChar(' ', continues ? nextStyle : undefined);
  }

  public dropLastChar() {
    if (!this.text) return;
    this.text = this.text.slice(0, -1);
    const len = this.text.length;
    this.runs = this.runs
      .map((r) => (r.end > len ? { ...r, end: len } : r))
      .filter((r) => r.end > r.start);
  }

  public seed(text: string, runs: InlineStyleRun[]) {
    this.text = text;
    this.runs = runs.map((r) => ({ ...r, style: { ...r.style } }));
  }

  public get length() {
    return this.text.length;
  }

  public finish(): { text: string; runs: InlineStyleRun[] } {
    let text = this.text;
    while (text.endsWith(' ')) text = text.slice(0, -1);
    const len = text.length;
    const runs = this.runs
      .map((r) => ({ ...r, end: Math.min(r.end, len) }))
      .filter((r) => r.end > r.start);
    return { text, runs };
  }
}

const sliceResult = (
  text: string,
  runs: InlineStyleRun[],
  from: number
): { text: string; runs: InlineStyleRun[] } => ({
  text: text.slice(from),
  runs: runs
    .map((r) => ({
      ...r,
      start: Math.max(0, r.start - from),
      end: r.end - from,
    }))
    .filter((r) => r.end > r.start),
});

/* -------------------------------------------------------------------------- */
/*  Lines                                                                     */
/* -------------------------------------------------------------------------- */

interface LayoutCell {
  x: number;
  text: string;
}

interface LayoutLine {
  frags: PageFragment[];
  y: number;
  x: number;
  right: number;
  fontSize: number;
  text: string;
  chars: number;
  boldRatio: number;
  monoRatio: number;
  cells: LayoutCell[];
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
};

/** Modal (most frequent, weighted by character count) font size of a set of pages. */
export const computeModalFontSize = (pages: PageFragment[][]): number => {
  const histogram = new Map<number, number>();
  for (const frags of pages) {
    for (const f of frags) {
      const key = Math.round(f.fontSize * 2) / 2;
      histogram.set(key, (histogram.get(key) ?? 0) + f.str.trim().length);
    }
  }
  let best = 12;
  let bestCount = -1;
  histogram.forEach((count, size) => {
    if (count > bestCount) {
      bestCount = count;
      best = size;
    }
  });
  return best;
};

const needsSpaceBetween = (prev: PageFragment, cur: PageFragment): boolean => {
  if (/\s$/.test(prev.str) || /^\s/.test(cur.str)) return false;
  if (prev.width > 0) {
    const gap = cur.x - (prev.x + prev.width);
    const fs = Math.max(prev.fontSize, cur.fontSize);
    if (prev.str.endsWith('-') && gap < fs * 0.5) return false;
    return gap > fs * 0.12;
  }
  return !prev.str.endsWith('-');
};

const appendFragments = (b: RichTextBuilder, frags: PageFragment[]) => {
  frags.forEach((f, idx) => {
    const style = fragmentStyle(f);
    if (idx > 0 && needsSpaceBetween(frags[idx - 1], f)) b.separator(style);
    b.append(f.str, style);
  });
};

const groupIntoLines = (fragments: PageFragment[]): LayoutLine[] => {
  const sorted = fragments
    .filter((f) => f.str.trim().length > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const groups: PageFragment[][] = [];
  let refY = -Infinity;
  let refFs = 12;
  for (const f of sorted) {
    const tolerance = Math.max(2.5, Math.min(5, refFs * 0.4));
    if (groups.length > 0 && Math.abs(f.y - refY) <= tolerance) {
      groups[groups.length - 1].push(f);
    } else {
      groups.push([f]);
      refY = f.y;
      refFs = f.fontSize;
    }
  }

  const lines: LayoutLine[] = [];
  for (const grp of groups) {
    grp.sort((a, b) => a.x - b.x);

    const sizeHistogram = new Map<number, number>();
    let chars = 0;
    let boldChars = 0;
    let monoChars = 0;
    for (const f of grp) {
      const n = f.str.trim().length;
      chars += n;
      if (f.bold) boldChars += n;
      if (f.mono) monoChars += n;
      const key = Math.round(f.fontSize * 2) / 2;
      sizeHistogram.set(key, (sizeHistogram.get(key) ?? 0) + n);
    }
    let fontSize = grp[0].fontSize;
    let bestCount = -1;
    sizeHistogram.forEach((count, size) => {
      if (count > bestCount) {
        bestCount = count;
        fontSize = size;
      }
    });

    const b = new RichTextBuilder();
    appendFragments(b, grp);
    const text = b.finish().text;
    if (!text) continue;

    // Split the line into cells at wide horizontal gaps (table / column candidates)
    const cellGap = Math.max(fontSize * 1.8, 18);
    const cells: LayoutCell[] = [];
    let curFrags: PageFragment[] = [];
    const flushCell = () => {
      if (curFrags.length === 0) return;
      const cb = new RichTextBuilder();
      appendFragments(cb, curFrags);
      const cellText = cb.finish().text;
      if (cellText) cells.push({ x: curFrags[0].x, text: cellText });
      curFrags = [];
    };
    grp.forEach((f, idx) => {
      if (idx > 0) {
        const prev = grp[idx - 1];
        const canMeasure = prev.width > 0;
        const gap = f.x - (prev.x + prev.width);
        if (canMeasure && gap > cellGap) flushCell();
      }
      curFrags.push(f);
    });
    flushCell();

    const last = grp[grp.length - 1];
    lines.push({
      frags: grp,
      y: grp[0].y,
      x: grp[0].x,
      right: last.x + (last.width > 0 ? last.width : last.str.length * fontSize * 0.5),
      fontSize,
      text,
      chars,
      boldRatio: chars > 0 ? boldChars / chars : 0,
      monoRatio: chars > 0 ? monoChars / chars : 0,
      cells,
    });
  }
  return lines;
};

/* -------------------------------------------------------------------------- */
/*  Classification helpers                                                    */
/* -------------------------------------------------------------------------- */

const BULLET_RE = /^([•●○◦▪▫▸▹►▶◆◇■□‣∙·\-–—*])\s+/;
const ORDERED_RE =
  /^(\d{1,3}(?:\.\d{1,3}){1,3}\.?|\d{1,3}[.)]|\(\d{1,3}\)|\([A-Za-z]\)|[A-Za-z][.)]|[IVXivx]{2,5}[.)]|\([IVXivx]{1,5}\))\s+/;
const CHAPTER_RE =
  /^(?:chapter|part|appendix|lesson|الفصل|الباب|الجزء)\s+(?:\d+|[ivxlcIVXLC]+|[A-Z])\b/i;
const TERMINAL_RE = /[.!?؟:;"”')\]]$/;
const PAGE_NUMBER_RE = /^(?:page\s*)?\d{1,4}$/i;

interface ListMatch {
  marker: string;
  ordered: boolean;
  weak: boolean;
  markerLength: number;
}

const matchListMarker = (text: string): ListMatch | null => {
  const bullet = text.match(BULLET_RE);
  if (bullet) {
    return {
      marker: bullet[1],
      ordered: false,
      weak: false,
      markerLength: bullet[0].length,
    };
  }
  const ordered = text.match(ORDERED_RE);
  if (ordered) {
    const marker = ordered[1];
    return {
      marker,
      ordered: true,
      weak: /^\(?[A-Za-z]/.test(marker),
      markerLength: ordered[0].length,
    };
  }
  return null;
};

const classifyHeading = (
  line: LayoutLine,
  prev: LayoutLine | undefined,
  next: LayoutLine | undefined,
  bodySize: number
): 1 | 2 | 3 | null => {
  const len = line.text.length;
  if (len > 160 || len < 2 || !/[\p{L}\p{N}]/u.test(line.text)) return null;
  const ratio = line.fontSize / bodySize;

  if (ratio >= 1.35) return 1;
  if (
    CHAPTER_RE.test(line.text) &&
    len < 100 &&
    (ratio >= 1.08 || line.boldRatio >= 0.8)
  ) {
    return 1;
  }
  if (ratio >= 1.18) return 2;
  if (ratio >= 1.05 && line.boldRatio >= 0.8 && len <= 120) {
    const gapNext = next ? next.y - line.y : Infinity;
    const gapPrev = prev ? line.y - prev.y : Infinity;
    const standalone =
      gapNext > line.fontSize * 1.45 || gapPrev > line.fontSize * 1.45;
    if (standalone && !/[.,;]$/.test(line.text)) return 3;
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/*  Table reconstruction                                                      */
/* -------------------------------------------------------------------------- */

const LIST_MARKER_ONLY_RE =
  /^(?:\(?\d{1,3}[.)]?\)?|[•●○◦▪▫▸▹►▶◆◇■□‣∙·\-–—*]|[A-Za-z][.)]|\([A-Za-z]\))$/;

/**
 * Tries to read lines `[start..]` as a 2D table. Returns the rows and the index AFTER the table,
 * or `null` when the lines do not form parallel X-columns.
 */
const tryBuildTable = (
  lines: LayoutLine[],
  start: number
): { rows: string[][]; end: number } | null => {
  if (lines[start].cells.length < 2) return null;

  let end = start;
  while (
    end < lines.length &&
    lines[end].cells.length >= 2 &&
    (end === start ||
      lines[end].y - lines[end - 1].y <=
        2.6 * Math.max(lines[end].fontSize, lines[end - 1].fontSize))
  ) {
    end++;
  }
  const rowCount = end - start;
  if (rowCount < 2) return null;

  const run = lines.slice(start, end);

  // Column anchors: cluster the X start of all cells (tolerance 10px)
  const starts: number[] = [];
  run.forEach((l) => l.cells.forEach((c) => starts.push(c.x)));
  starts.sort((a, b) => a - b);
  const clusters: { sum: number; count: number }[] = [];
  for (const sx of starts) {
    const last = clusters[clusters.length - 1];
    if (last && sx - last.sum / last.count <= 10) {
      last.sum += sx;
      last.count++;
    } else {
      clusters.push({ sum: sx, count: 1 });
    }
  }
  const anchors = clusters.filter((c) => c.count >= 2).map((c) => c.sum / c.count);
  if (anchors.length < 2) return null;

  // Assign every cell to its nearest anchor; measure consistency
  let matched = 0;
  let total = 0;
  const rows: string[][] = run.map((l) => {
    const row: string[] = new Array(anchors.length).fill('');
    for (const cell of l.cells) {
      total++;
      let bestIdx = 0;
      let bestDist = Infinity;
      anchors.forEach((ax, idx) => {
        const d = Math.abs(ax - cell.x);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      if (bestDist <= 12) matched++;
      row[bestIdx] = row[bestIdx] ? `${row[bestIdx]} ${cell.text}` : cell.text;
    }
    return row;
  });
  if (total === 0 || matched / total < 0.75) return null;

  // Guard 1: a numbered/bulleted list laid out as [marker][text] is NOT a table
  const firstColumn = rows.map((r) => r[0]).filter(Boolean);
  if (
    firstColumn.length > 0 &&
    firstColumn.every((c) => LIST_MARKER_ONLY_RE.test(c.trim()))
  ) {
    return null;
  }

  // Guard 2: a 2-column page layout has very long "cells" → not a table
  const longCells = rows.flat().filter((c) => c.length > 90).length;
  const nonEmpty = rows.flat().filter(Boolean).length;
  if (nonEmpty === 0 || longCells / nonEmpty > 0.35) return null;

  // Guard 3: need a real grid (≥3 rows or one row with ≥3 columns)
  const maxCols = Math.max(...run.map((l) => l.cells.length));
  if (rowCount < 3 && maxCols < 3) return null;

  return { rows, end };
};

/* -------------------------------------------------------------------------- */
/*  Code blocks                                                               */
/* -------------------------------------------------------------------------- */

const buildCodeLine = (line: LayoutLine, baseX: number, charWidth: number): string => {
  const indent = Math.max(0, Math.round((line.x - baseX) / charWidth));
  let out = ' '.repeat(indent);
  line.frags.forEach((f, idx) => {
    if (idx > 0) {
      const prev = line.frags[idx - 1];
      if (prev.width > 0) {
        const gap = f.x - (prev.x + prev.width);
        let pad = gap > charWidth * 0.5 ? Math.round(gap / charWidth) : 0;
        const trailing = (prev.str.match(/ *$/)?.[0].length ?? 0);
        const leading = (f.str.match(/^ */)?.[0].length ?? 0);
        pad = Math.max(0, pad - trailing - leading);
        out += ' '.repeat(pad);
      }
    }
    out += f.str;
  });
  return out.replace(/\s+$/, '');
};

/* -------------------------------------------------------------------------- */
/*  Main page analysis                                                        */
/* -------------------------------------------------------------------------- */

export const analyzePageLayout = (
  fragments: PageFragment[],
  options: PageAnalysisOptions
): LayoutParagraph[] => {
  let lines = groupIntoLines(fragments);
  if (lines.length === 0) return [];

  // Drop isolated page numbers at the very top/bottom of the page (same as legacy behavior)
  if (lines.length > 2) {
    const trimmed = lines.slice();
    if (PAGE_NUMBER_RE.test(trimmed[trimmed.length - 1].text)) trimmed.pop();
    if (trimmed.length > 0 && PAGE_NUMBER_RE.test(trimmed[0].text)) trimmed.shift();
    lines = trimmed;
  }
  if (lines.length === 0) return [];

  const bodySize =
    options.bodyFontSize && options.bodyFontSize > 0
      ? options.bodyFontSize
      : median(lines.map((l) => l.fontSize)) || 12;

  const bodyLines = lines.filter((l) => l.chars >= 25 && l.monoRatio < 0.6);
  const rightMargin =
    bodyLines.length > 0
      ? percentile(
          bodyLines.map((l) => l.right),
          0.9
        )
      : options.pageWidth * 0.9;

  const out: LayoutParagraph[] = [];

  type OpenBlock =
    | {
        kind: 'para';
        b: RichTextBuilder;
        topY: number;
        bottomY: number;
        lastLine: LayoutLine;
      }
    | {
        kind: 'list';
        b: RichTextBuilder;
        topY: number;
        bottomY: number;
        lastLine: LayoutLine;
        marker: string;
        ordered: boolean;
        markerX: number;
      };

  let open = null as OpenBlock | null;
  let lastHeading = null as { outIndex: number; line: LayoutLine; level: number } | null;

  const flushOpen = () => {
    if (!open) return;
    const { text, runs } = open.b.finish();
    if (text) {
      if (open.kind === 'list') {
        out.push({
          rich: {
            text,
            blockType: open.ordered ? 'ordered_list_item' : 'unordered_list_item',
            listMarker: open.marker,
            indentLevel: 0,
            ...(runs.length ? { styleRuns: runs } : {}),
          },
          topY: open.topY,
          bottomY: open.bottomY,
          markerX: open.markerX,
        });
      } else {
        out.push({
          rich: {
            text,
            blockType: 'paragraph',
            ...(runs.length ? { styleRuns: runs } : {}),
          },
          topY: open.topY,
          bottomY: open.bottomY,
        });
      }
    }
    open = null;
  };

  const continuesBlock = (prev: LayoutLine, cur: LayoutLine): boolean => {
    const fsRef = Math.max(prev.fontSize, cur.fontSize);
    const dist = cur.y - prev.y;
    if (dist > fsRef * 1.6) return false;
    if (cur.x - prev.x > fsRef * 1.1 && TERMINAL_RE.test(prev.text)) return false;
    if (
      prev.right < rightMargin - fsRef * 5 &&
      TERMINAL_RE.test(prev.text) &&
      /^[A-Z0-9“"(]/.test(cur.text)
    ) {
      return false;
    }
    return true;
  };

  const appendLineToOpen = (line: LayoutLine) => {
    if (!open) return;
    const b = open.b;
    if (b.text.endsWith('-') && /^[a-z]/.test(line.text)) {
      b.dropLastChar();
    } else {
      b.separator(fragmentStyle(line.frags[0]));
    }
    appendFragments(b, line.frags);
    open.bottomY = line.y + 4;
    open.lastLine = line;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : undefined;
    const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;
    const topY = Math.max(0, line.y - line.fontSize);

    // 1) Tables (2D coordinate reconstruction)
    const table = tryBuildTable(lines, i);
    if (table) {
      flushOpen();
      lastHeading = null;
      const lastLine = lines[table.end - 1];
      out.push({
        rich: {
          text: table.rows.map((r) => r.join(' | ')).join('\n'),
          blockType: 'table',
          tableRows: table.rows,
        },
        topY,
        bottomY: lastLine.y + 4,
      });
      i = table.end;
      continue;
    }

    // 2) Code blocks (consecutive monospace lines)
    if (line.monoRatio >= 0.6 && line.chars >= 2) {
      flushOpen();
      lastHeading = null;
      let end = i + 1;
      while (
        end < lines.length &&
        lines[end].monoRatio >= 0.5 &&
        lines[end].y - lines[end - 1].y <=
          2.4 * Math.max(lines[end].fontSize, lines[end - 1].fontSize)
      ) {
        end++;
      }
      const codeLines = lines.slice(i, end);
      const baseX = Math.min(...codeLines.map((l) => l.x));
      const widths: number[] = [];
      codeLines.forEach((l) =>
        l.frags.forEach((f) => {
          if (f.width > 0 && f.str.length > 0) widths.push(f.width / f.str.length);
        })
      );
      const charWidth = Math.max(3, median(widths) || bodySize * 0.6);

      // Preserve blank lines between code lines
      const textLines: string[] = [];
      codeLines.forEach((l, idx) => {
        if (idx > 0) {
          const gapLines = Math.round(
            (l.y - codeLines[idx - 1].y) / (Math.max(l.fontSize, 8) * 1.25)
          );
          for (let k = 1; k < gapLines; k++) textLines.push('');
        }
        textLines.push(buildCodeLine(l, baseX, charWidth));
      });

      out.push({
        rich: { text: textLines.join('\n'), blockType: 'code_block' },
        topY,
        bottomY: codeLines[codeLines.length - 1].y + 4,
      });
      i = end;
      continue;
    }

    // 3) Headings
    const level = classifyHeading(line, prevLine, nextLine, bodySize);
    if (level) {
      flushOpen();
      if (
        lastHeading &&
        lastHeading.level === level &&
        out.length - 1 === lastHeading.outIndex &&
        line.y - lastHeading.line.y <= line.fontSize * 1.6
      ) {
        const prevPara = out[lastHeading.outIndex];
        prevPara.rich.text = `${prevPara.rich.text} ${line.text}`;
        prevPara.bottomY = line.y + 4;
        lastHeading = { outIndex: lastHeading.outIndex, line, level };
      } else {
        out.push({
          rich: {
            text: line.text,
            blockType: level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3',
            headingLevel: level,
          },
          topY,
          bottomY: line.y + 4,
        });
        lastHeading = { outIndex: out.length - 1, line, level };
      }
      i++;
      continue;
    }
    lastHeading = null;

    // 4) Lists
    const listMatch = matchListMarker(line.text);
    const prevEndsBlock =
      !open || TERMINAL_RE.test(open.lastLine.text) || open.kind === 'list';
    const isListStart = Boolean(listMatch && (!listMatch.weak || prevEndsBlock));
    if (listMatch && isListStart) {
      flushOpen();
      const lb = new RichTextBuilder();
      appendFragments(lb, line.frags);
      const full = lb.finish();
      const body = sliceResult(full.text, full.runs, listMatch.markerLength);
      const nb = new RichTextBuilder();
      nb.seed(body.text, body.runs);
      open = {
        kind: 'list',
        b: nb,
        topY,
        bottomY: line.y + 4,
        lastLine: line,
        marker: listMatch.marker,
        ordered: listMatch.ordered,
        markerX: line.x,
      };
      i++;
      continue;
    }

    // 5) Paragraph text (or list-item continuation)
    if (open) {
      const stillSame =
        continuesBlock(open.lastLine, line) &&
        (open.kind !== 'list' || line.x >= open.markerX - 2);
      if (stillSame) {
        appendLineToOpen(line);
        const endsPara = TERMINAL_RE.test(line.text) && open.b.length >= 600;
        if (endsPara) flushOpen();
        i++;
        continue;
      }
      flushOpen();
    }

    const pb = new RichTextBuilder();
    appendFragments(pb, line.frags);
    open = {
      kind: 'para',
      b: pb,
      topY,
      bottomY: line.y + 4,
      lastLine: line,
    };
    i++;
  }
  flushOpen();

  // Indent levels for consecutive list items (relative to the run's left-most marker)
  let runStart = -1;
  const closeRun = (runEnd: number) => {
    if (runStart < 0) return;
    const run = out.slice(runStart, runEnd);
    const base = Math.min(...run.map((p) => p.markerX ?? 0));
    run.forEach((p) => {
      const off = (p.markerX ?? base) - base;
      p.rich.indentLevel = off < 10 ? 0 : off < 32 ? 1 : 2;
    });
    runStart = -1;
  };
  out.forEach((p, idx) => {
    if (p.markerX !== undefined) {
      if (runStart < 0) runStart = idx;
    } else {
      closeRun(idx);
    }
  });
  closeRun(out.length);

  return out;
};
