/**
 * ByteBook — 4-Layer Unstoppable PDF Page & Figure Extractor (10 Pages per Batch)
 *
 * Engineered to handle both Digital Illustrated Books (e.g., Grokking Algorithms)
 * and Scanned PDFs:
 * - Fixes "Pages tree contains circular reference." via patched in-thread PDF.js worker + per-page fault isolation.
 * - Layer 1: Native PDF.js Text-Layer + Viewport Line & Paragraph Position Reconstruction (`pdfjs-dist`).
 * - Inline Geometric Illustration Detector: Detects vertical illustration gaps between paragraphs on digital PDF
 *   pages, verifies real ink presence (ignoring blank whitespace), crops ONLY the diagram/illustration, and attaches
 *   it right after the exact paragraph above it!
 * - Layer 2: Gemini 2.5 Flash Multi-Modal OCR & Figure Detector (`gemini-2.5-flash` with `thinkingBudget: 0`).
 * - Layer 3: Groq Vision OCR Fallback (`meta-llama/llama-4-scout-17b-16e-instruct`).
 * - Layer 4: Built-In On-Device / Browser Local OCR (`tesseract.js`) automatic fallback for scanned pages.
 */

import { byteBookDb } from '../../database';
import { SECURE_KEYS, secureVault } from '../../storage';
import {
  analyzePageLayout,
  computeModalFontSize,
  detectFontFlagsFromName,
  PageFragment,
} from './layoutAnalyzer';
import { BookFigureRecord, RawRichParagraph } from './types';

export const PAGES_PER_BATCH = 1;

export interface ExtractedChapterRaw {
  title: string;
  paragraphs: (string | RawRichParagraph)[];
  paragraphFigures?: Record<number, string[]>;
  isExtracted: boolean;
  startPage?: number;
  endPage?: number;
  pageRangeLabel?: string;
}

export interface ExtractedTextBookData {
  title: string;
  author: string;
  totalPages?: number;
  chapters: ExtractedChapterRaw[];
  figures: BookFigureRecord[];
}

const pdfRawBufferCache = new Map<string, Uint8Array>();

export const cachePdfBufferForBook = (bookId: string, bytes: Uint8Array) => {
  pdfRawBufferCache.set(bookId, bytes);
  byteBookDb.savePdfBinary(bookId, bytes).catch(() => {});
};

export const getCachedPdfBufferForBook = async (
  bookId: string
): Promise<Uint8Array | undefined> => {
  const mem = pdfRawBufferCache.get(bookId);
  if (mem) return mem;
  const persisted = await byteBookDb.loadPdfBinary(bookId);
  if (persisted) {
    pdfRawBufferCache.set(bookId, persisted);
    return persisted;
  }
  return undefined;
};

/**
 * Checks whether a block of text is an error/placeholder rather than real book content.
 */
export const isErrorOrPlaceholderParagraph = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (
    trimmed.includes('لم يتم العثور على نصوص في الصفحات') ||
    trimmed.includes('فارغة أو عبارة عن أغلفة/فواصل خالية من النصوص') ||
    trimmed.includes('هذا الجزء من ملف الـ PDF قد يكون عبارة عن صفحات ممسوحة') ||
    trimmed.includes('صفحة مصورة / شكل توضيحي كامل من ملف الـ PDF') ||
    trimmed.includes('لا تحتوي على طبقة نصية مباشرة')
  ) {
    return true;
  }
  return false;
};

export const isCleanHumanReadableText = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isErrorOrPlaceholderParagraph(trimmed)) return false;
  const noisySymbols = (trimmed.match(/[~^`{}|\\@#$%&_+=<>]/g) || []).length;
  if (trimmed.length > 20 && noisySymbols / trimmed.length > 0.15) {
    return false;
  }
  return true;
};

/**
 * Loads PDF.js (`pdfjs-dist/legacy/build/pdf.js`) with our patched in-thread worker
 * so "Pages tree contains circular reference." never occurs.
 */
const loadPdfJsLibrary = async (): Promise<any> => {
  const g: any = globalThis as any;
  if (!g.pdfjsWorker) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      g.pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');
    } catch {
      // Ignore if unavailable
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  if (pdfjsLib.PDFWorkerUtil && g.pdfjsWorker) {
    pdfjsLib.PDFWorkerUtil.isWorkerDisabled = true;
  }
  if (
    pdfjsLib.GlobalWorkerOptions &&
    !pdfjsLib.GlobalWorkerOptions.workerSrc &&
    !g.pdfjsWorker
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return pdfjsLib;
};

const openPdfDocument = async (pdfBytes: Uint8Array): Promise<any> => {
  const pdfjsLib = await loadPdfJsLibrary();
  const dataCopy = pdfBytes.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl:
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
    useSystemFonts: true,
    isEvalSupported: false,
    stopAtErrors: false,
  });
  return await loadingTask.promise;
};

interface PositionedParagraph {
  text: string;
  topY: number;
  bottomY: number;
  /** Rich layout block (heading / list / table / code / styled paragraph) */
  rich: RawRichParagraph;
}

interface PageFragmentsResult {
  fragments: PageFragment[];
  pageHeight: number;
  pageWidth: number;
}

interface ResolvedFontFlags {
  bold: boolean;
  italic: boolean;
  mono: boolean;
  symbol: boolean;
}

/**
 * Collects thin horizontal strokes / rectangles (underline candidates) from the page operator list,
 * expressed in viewport coordinates. Fully defensive: any failure simply yields no underlines.
 */
const extractUnderlineSegments = (
  opList: any,
  pdfjsLib: any,
  viewportTransform: number[]
): { x1: number; x2: number; y: number }[] => {
  const segments: { x1: number; x2: number; y: number }[] = [];
  try {
    const OPS = pdfjsLib?.OPS;
    const Util = pdfjsLib?.Util;
    if (!OPS || !Util || !opList?.fnArray) return segments;

    const paintOps = new Set<number>([
      OPS.stroke,
      OPS.closeStroke,
      OPS.fill,
      OPS.eoFill,
      OPS.fillStroke,
      OPS.eoFillStroke,
      OPS.closeFillStroke,
      OPS.closeEOFillStroke,
    ]);

    let ctm: number[] = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    let subpaths: { x: number; y: number }[][] = [];

    const toViewport = (x: number, y: number) => {
      const m: number[] = Util.transform(viewportTransform, ctm);
      return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
    };

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === OPS.save) {
        stack.push(ctm.slice());
      } else if (fn === OPS.restore) {
        ctm = stack.pop() ?? ctm;
      } else if (fn === OPS.transform && Array.isArray(args)) {
        ctm = Util.transform(ctm, args);
      } else if (fn === OPS.constructPath && Array.isArray(args)) {
        const ops: number[] = args[0] || [];
        const coords: number[] = args[1] || [];
        let ci = 0;
        for (const op of ops) {
          if (op === OPS.moveTo) {
            subpaths.push([toViewport(coords[ci], coords[ci + 1])]);
            ci += 2;
          } else if (op === OPS.lineTo) {
            const cur = subpaths[subpaths.length - 1];
            if (cur) cur.push(toViewport(coords[ci], coords[ci + 1]));
            ci += 2;
          } else if (op === OPS.rectangle) {
            const [rx, ry, rw, rh] = [coords[ci], coords[ci + 1], coords[ci + 2], coords[ci + 3]];
            subpaths.push([
              toViewport(rx, ry),
              toViewport(rx + rw, ry),
              toViewport(rx + rw, ry + rh),
              toViewport(rx, ry + rh),
            ]);
            ci += 4;
          } else if (op === OPS.curveTo) {
            ci += 6;
          } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
            ci += 4;
          }
        }
      } else if (paintOps.has(fn)) {
        for (const sp of subpaths) {
          if (sp.length < 2) continue;
          const xs = sp.map((p) => p.x);
          const ys = sp.map((p) => p.y);
          const w = Math.max(...xs) - Math.min(...xs);
          const h = Math.max(...ys) - Math.min(...ys);
          if (h <= 2.2 && w >= 4 && w <= 500) {
            segments.push({
              x1: Math.min(...xs),
              x2: Math.max(...xs),
              y: (Math.max(...ys) + Math.min(...ys)) / 2,
            });
          }
        }
        subpaths = [];
      } else if (fn === OPS.endPath) {
        subpaths = [];
      }
      if (segments.length > 3000) break;
    }
  } catch {
    // Underline detection is best-effort only
  }
  return segments;
};

/**
 * Layer 1: Extracts every positioned text fragment of a PDF page (viewport coordinates,
 * `width`, font size and font flags: bold / italic / monospace / symbol / underline).
 */
const extractPageFragments = async (
  page: any,
  pdfjsLib: any
): Promise<PageFragmentsResult> => {
  const viewport = page.getViewport({ scale: 1.0 });
  const pageHeight = viewport.height || 800;
  const pageWidth = viewport.width || 600;
  try {
    const textContent = await page.getTextContent({
      includeMarkedContent: false,
      disableCombineTextItems: false,
    });
    const items: any[] = textContent?.items || [];
    const styles: Record<string, any> = textContent?.styles || {};

    // Resolving real font names requires the operator list (it also gives us underline strokes)
    let opList: any = null;
    try {
      opList = await page.getOperatorList();
    } catch {
      opList = null;
    }

    const fontCache = new Map<string, ResolvedFontFlags>();
    const resolveFont = (fontId: string): ResolvedFontFlags => {
      const cached = fontCache.get(fontId);
      if (cached) return cached;

      let realName = '';
      let bold = false;
      let italic = false;
      try {
        if (page.commonObjs?.has?.(fontId)) {
          const fontObj = page.commonObjs.get(fontId);
          realName = `${fontObj?.name ?? ''} ${fontObj?.fallbackName ?? ''}`;
          bold = Boolean(fontObj?.bold || fontObj?.black);
          italic = Boolean(fontObj?.italic);
        }
      } catch {
        // Font not yet resolved → rely on style family below
      }
      const family: string = styles[fontId]?.fontFamily ?? '';
      const flags = detectFontFlagsFromName(`${realName} ${fontId}`);
      const resolved: ResolvedFontFlags = {
        bold: bold || flags.bold,
        italic: italic || flags.italic,
        mono: flags.mono || /monospace/i.test(family) || /monospace/i.test(realName),
        symbol: flags.symbol,
      };
      fontCache.set(fontId, resolved);
      return resolved;
    };

    const fragments: PageFragment[] = [];
    for (const item of items) {
      const rawStr = typeof item.str === 'string' ? item.str : '';
      if (!rawStr || !rawStr.trim()) continue;

      const tx =
        pdfjsLib.Util && Array.isArray(item.transform)
          ? pdfjsLib.Util.transform(viewport.transform, item.transform)
          : item.transform || [12, 0, 0, 12, 0, 0];

      const fontSize = Math.max(
        6,
        Math.round(Math.hypot(tx[2] || 0, tx[3] || 12) * 10) / 10
      );
      const flags = resolveFont(String(item.fontName ?? ''));

      fragments.push({
        str: rawStr,
        x: tx[4] || 0,
        y: tx[5] || 0,
        width: typeof item.width === 'number' ? Math.abs(item.width) : 0,
        fontSize,
        bold: flags.bold,
        italic: flags.italic,
        mono: flags.mono,
        symbol: flags.symbol,
        underline: false,
      });
    }

    // Underline detection: a thin horizontal stroke just below the baseline, about as long as the text
    const strokes = extractUnderlineSegments(opList, pdfjsLib, viewport.transform);
    if (strokes.length > 0 && strokes.length < 3000) {
      for (const f of fragments) {
        if (f.width <= 0) continue;
        const fEnd = f.x + f.width;
        for (const s of strokes) {
          if (s.y < f.y + 0.3 || s.y > f.y + f.fontSize * 0.3 + 2) continue;
          const overlap = Math.min(s.x2, fEnd) - Math.max(s.x1, f.x);
          if (overlap < f.width * 0.6) continue;
          if (s.x2 - s.x1 > f.width * 1.3 + 6) continue;
          f.underline = true;
          break;
        }
      }
    }

    return { fragments, pageHeight, pageWidth };
  } catch {
    return { fragments: [], pageHeight, pageWidth };
  }
};

/**
 * Converts the page fragments into rich, layout-aware paragraphs (headings, lists, tables, code,
 * styled paragraphs) that still keep their vertical `topY` / `bottomY` coordinates so inline
 * illustrations can be attached right after the exact paragraph above them.
 */
const reconstructPositionedParagraphs = (
  fragments: PageFragment[],
  pageWidth: number,
  pageHeight: number,
  bodyFontSize?: number
): PositionedParagraph[] =>
  analyzePageLayout(fragments, { bodyFontSize, pageWidth, pageHeight }).map(
    (p) => ({
      text: p.rich.text,
      topY: p.topY,
      bottomY: p.bottomY,
      rich: p.rich,
    })
  );

/**
 * Renders a PDF page onto an offscreen canvas with an explicit pure white background (`#FFFFFF`).
 */
const renderPageToOffscreenCanvas = async (
  page: any,
  scale: number = 1.45
): Promise<HTMLCanvasElement | null> => {
  if (typeof document === 'undefined') return null;
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      background: 'rgb(255,255,255)',
    }).promise;
    return canvas;
  } catch {
    return null;
  }
};

/**
 * Crops ONLY a specific `[ymin, xmin, ymax, xmax]` (0..1000 scale) figure bounding box
 * from an existing offscreen canvas. If `requireVisibleInk` is true, verifies that the cropped
 * region actually contains drawn graphics/ink (ignoring blank white margins).
 */
const cropBoxFromCanvas = (
  fullCanvas: HTMLCanvasElement,
  box: { ymin: number; xmin: number; ymax: number; xmax: number },
  requireVisibleInk: boolean = false
): string | undefined => {
  try {
    const x = Math.max(0, Math.floor((box.xmin / 1000) * fullCanvas.width));
    const y = Math.max(0, Math.floor((box.ymin / 1000) * fullCanvas.height));
    const w = Math.min(
      fullCanvas.width - x,
      Math.floor(((box.xmax - box.xmin) / 1000) * fullCanvas.width)
    );
    const h = Math.min(
      fullCanvas.height - y,
      Math.floor(((box.ymax - box.ymin) / 1000) * fullCanvas.height)
    );

    if (w < 50 || h < 50) return undefined;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = w;
    croppedCanvas.height = h;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return undefined;

    croppedCtx.fillStyle = '#FFFFFF';
    croppedCtx.fillRect(0, 0, w, h);
    croppedCtx.drawImage(fullCanvas, x, y, w, h, 0, 0, w, h);

    if (requireVisibleInk) {
      const imgData = croppedCtx.getImageData(
        Math.floor(w * 0.05),
        Math.floor(h * 0.05),
        Math.max(1, Math.floor(w * 0.9)),
        Math.max(1, Math.floor(h * 0.9))
      ).data;
      let inkPixels = 0;
      const totalSampled = Math.max(1, Math.floor(imgData.length / 16));
      for (let i = 0; i < imgData.length; i += 16) {
        if (imgData[i] < 225 || imgData[i + 1] < 225 || imgData[i + 2] < 225) {
          inkPixels++;
        }
      }
      const inkRatio = inkPixels / totalSampled;
      if (inkRatio < 0.004) {
        return undefined; // Just empty white space!
      }
    }

    return croppedCanvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return undefined;
  }
};

interface AiExtractedFigureSpec {
  figureNumber: string;
  title: string;
  caption: string;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

interface AiExtractedPageResult {
  pageNum: number;
  paragraphs: string[];
  figures: AiExtractedFigureSpec[];
}

/**
 * Splits raw OCR/AI text into clean, readable book paragraphs.
 */
const splitRawTextIntoCleanParagraphs = (rawBody: string): string[] => {
  const cleaned = rawBody
    .replace(/===\s*PAGE_(?:START|END)[^=\n]*===/gi, '')
    .replace(/===\s*FIGURE:[^\n=]+===/gi, '')
    .replace(/^```[a-z]*\s*/gim, '')
    .replace(/```\s*$/gim, '')
    .replace(/^NONE$/gim, '')
    .replace(/^EMPTY_PAGE$/gim, '')
    .trim();

  if (!cleaned) return [];

  let blocks = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(
      (p) =>
        p.length > 1 &&
        p.toUpperCase() !== 'EMPTY_PAGE' &&
        !p.startsWith('[Verbatim paragraphs')
    );

  if (blocks.length === 1 && blocks[0].length > 550 && cleaned.includes('\n')) {
    const lines = cleaned
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const regrouped: string[] = [];
    let acc = '';
    for (const line of lines) {
      acc = acc ? `${acc} ${line}` : line;
      if (/[.!?؟:"]$/.test(line) && acc.length >= 200) {
        regrouped.push(acc);
        acc = '';
      }
    }
    if (acc) regrouped.push(acc);
    if (regrouped.length > 1) {
      blocks = regrouped;
    }
  }

  return blocks;
};

/**
 * Parses Gemini's response with Fault-Tolerant Delimiter & Relative-Page Mapping.
 */
const parseGeminiMultiPageResponse = (
  rawOutput: string,
  pageNumbers: number[]
): Map<number, AiExtractedPageResult> => {
  const resultMap = new Map<number, AiExtractedPageResult>();
  for (const pNum of pageNumbers) {
    resultMap.set(pNum, { pageNum: pNum, paragraphs: [], figures: [] });
  }

  const trimmed = rawOutput.trim();
  if (!trimmed) return resultMap;

  const pageBlockRegex =
    /===\s*PAGE_START\s*:\s*(?:Page\s*)?(\d+)\s*===([\s\S]*?)(?:===\s*PAGE_END\s*:\s*(?:Page\s*)?\1\s*===|(?====\s*PAGE_START)|$)/gi;
  let match: RegExpExecArray | null;
  let blockOccurrenceIndex = 0;

  while ((match = pageBlockRegex.exec(trimmed)) !== null) {
    const rawNum = parseInt(match[1], 10);
    const body = match[2].trim();

    let resolvedPageNum = rawNum;
    if (!resultMap.has(resolvedPageNum)) {
      if (rawNum >= 1 && rawNum <= pageNumbers.length) {
        resolvedPageNum = pageNumbers[rawNum - 1];
      } else if (blockOccurrenceIndex < pageNumbers.length) {
        resolvedPageNum = pageNumbers[blockOccurrenceIndex];
      }
    }
    blockOccurrenceIndex++;

    const entry = resultMap.get(resolvedPageNum) ?? {
      pageNum: resolvedPageNum,
      paragraphs: [],
      figures: [],
    };

    const figLinesRegex = /===\s*FIGURE\s*:([^\n=]+)===/gi;
    let figMatch: RegExpExecArray | null;
    while ((figMatch = figLinesRegex.exec(body)) !== null) {
      const specStr = figMatch[1];
      const num =
        specStr.match(/num\s*=\s*([^|]+)/i)?.[1]?.trim() ||
        `${resolvedPageNum}`;
      const title =
        specStr.match(/title\s*=\s*([^|]+)/i)?.[1]?.trim() || `Figure ${num}`;
      const caption =
        specStr.match(/caption\s*=\s*([^|]+)/i)?.[1]?.trim() || title;
      const boxStr = specStr.match(/box\s*=\s*([\d,\s]+)/i)?.[1] || '';
      const coords = boxStr
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));

      if (coords.length === 4) {
        entry.figures.push({
          figureNumber: num,
          title,
          caption,
          ymin: coords[0],
          xmin: coords[1],
          ymax: coords[2],
          xmax: coords[3],
        });
      }
    }

    const paras = splitRawTextIntoCleanParagraphs(body);
    if (paras.length > 0) {
      entry.paragraphs.push(...paras);
    }

    resultMap.set(resolvedPageNum, entry);
  }

  let totalMappedParagraphs = 0;
  for (const pNum of pageNumbers) {
    totalMappedParagraphs += resultMap.get(pNum)?.paragraphs.length || 0;
  }

  if (totalMappedParagraphs === 0 && pageNumbers.length > 0) {
    const fallbackParas = splitRawTextIntoCleanParagraphs(trimmed);
    if (fallbackParas.length > 0) {
      const firstEntry = resultMap.get(pageNumbers[0])!;
      firstEntry.paragraphs.push(...fallbackParas);
    }
  }

  return resultMap;
};

/**
 * Layer 2: Sends 1 or 2 rendered PDF pages to Gemini (`gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash`).
 */
const analyzePagesBatchWithGemini = async (
  pagesBatch: { pageNum: number; canvas: HTMLCanvasElement }[],
  apiKey: string,
  preferredModel: string
): Promise<Map<number, AiExtractedPageResult>> => {
  const pageNums = pagesBatch.map((p) => p.pageNum);
  const emptyMap = new Map<number, AiExtractedPageResult>();
  for (const n of pageNums) {
    emptyMap.set(n, { pageNum: n, paragraphs: [], figures: [] });
  }

  if (pagesBatch.length === 0) return emptyMap;

  const instructionPrompt = [
    `You are an Accessibility Document OCR & Reading Assistant.`,
    `Please transcribe all visible text from the attached document page image(s) (${pageNums
      .map((n) => `Page ${n}`)
      .join(', ')}) so a visually impaired student can read and translate them.`,
    `Rules:`,
    `1. Transcribe every paragraph, heading, bullet point, and caption on the page in exact reading order. Do NOT summarize, skip, or shorten anything.`,
    `2. Separate paragraphs with a blank line.`,
    `3. If a page contains a genuine scientific/technical diagram, chart, or illustration (ignore decorative borders, headers, or blank space), add a single line with its 0-1000 bounding box: ===FIGURE: num=1 | title=Short Title | box=ymin,xmin,ymax,xmax | caption=Caption===`,
    `4. If a page is completely blank or only a decorative cover with no text, write EMPTY_PAGE.`,
    `5. Wrap each page's transcription using these exact markers:`,
    ...pageNums.map(
      (n) =>
        `===PAGE_START:${n}===\n(full text of page ${n})\n===PAGE_END:${n}===`
    ),
  ].join('\n');

  const parts: any[] = [{ text: instructionPrompt }];
  for (const item of pagesBatch) {
    const b64 = item.canvas
      .toDataURL('image/jpeg', 0.8)
      .replace(/^data:image\/jpeg;base64,/, '');
    parts.push({ text: `Document Image for Page ${item.pageNum}:` });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: b64,
      },
    });
  }

  const modelsToTry = Array.from(
    new Set([
      preferredModel || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ])
  );

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  ];

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;

    const isGemini25 = modelName.includes('2.5');

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const generationConfig: Record<string, any> = {
          temperature: 0.0,
          maxOutputTokens: 8192,
        };
        if (isGemini25 && attempt === 0) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig,
            safetySettings,
          }),
        });

        if (res.status === 429 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        if (!res.ok) {
          if (res.status === 400 && isGemini25 && attempt === 0) {
            continue;
          }
          break;
        }

        const data = await res.json();
        const candidateParts: any[] =
          data?.candidates?.[0]?.content?.parts || [];

        const nonThoughtTexts = candidateParts
          .filter((p) => !p?.thought && typeof p?.text === 'string')
          .map((p) => p.text);

        const rawTextOutput = nonThoughtTexts.join('\n').trim();

        if (rawTextOutput) {
          const parsed = parseGeminiMultiPageResponse(rawTextOutput, pageNums);
          let hasAnyText = false;
          parsed.forEach((v) => {
            if (v.paragraphs.length > 0) hasAnyText = true;
          });
          if (hasAnyText || rawTextOutput.includes('EMPTY_PAGE')) {
            return parsed;
          }
        }
      } catch {
        // Try next attempt/model
      }
    }
  }

  return emptyMap;
};

/**
 * Layer 3: Groq Vision OCR Fallback (`meta-llama/llama-4-scout-17b-16e-instruct`)
 */
const analyzeSinglePageWithGroqVision = async (
  pageNum: number,
  canvas: HTMLCanvasElement,
  groqKey: string
): Promise<string[]> => {
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0.0,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Transcribe 100% of the readable text on this book page (Page ${pageNum}) verbatim, paragraph by paragraph, separated by blank lines. Do not summarize or omit anything. If the page has no text at all, output EMPTY_PAGE.`,
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content || '';
    return splitRawTextIntoCleanParagraphs(content);
  } catch {
    return [];
  }
};

/**
 * Layer 4: Built-In Local On-Device / Browser OCR (`tesseract.js`)
 */
let sharedTesseractWorkerPromise: Promise<any> | null = null;

const getOrCreateLocalOcrWorker = async (): Promise<any | null> => {
  if (sharedTesseractWorkerPromise) return sharedTesseractWorkerPromise;
  sharedTesseractWorkerPromise = (async () => {
    try {
      const Tesseract = await import('tesseract.js');
      const createWorkerFn =
        Tesseract.createWorker || (Tesseract as any).default?.createWorker;
      if (!createWorkerFn) return null;
      const worker = await createWorkerFn('eng');
      return worker;
    } catch {
      sharedTesseractWorkerPromise = null;
      return null;
    }
  })();
  return sharedTesseractWorkerPromise;
};

const extractPageTextWithLocalOcr = async (
  canvas: HTMLCanvasElement
): Promise<string[]> => {
  try {
    const worker = await getOrCreateLocalOcrWorker();
    if (!worker) return [];
    const result = await worker.recognize(canvas);
    const rawText: string = result?.data?.text || '';
    if (!rawText || rawText.trim().length < 10) return [];

    const cleaned = rawText
      .replace(/\r\n/g, '\n')
      .replace(/([a-z])-\n([a-z])/gi, '$1$2');

    return splitRawTextIntoCleanParagraphs(cleaned);
  } catch {
    return [];
  }
};

/**
 * Smart Inline Geometric Illustration Detector for Digital PDFs (e.g., Grokking Algorithms):
 * Finds vertical illustration gaps (`>= 18%` of page height) between text paragraphs,
 * verifies that the cropped gap contains actual drawn ink (ignoring empty white space),
 * and returns the cropped illustration along with `precedingParaIndex` so it appears
 * right after the exact paragraph that introduces it!
 */
const detectAndCropGeometricFiguresOnPage = async (
  page: any,
  positionedParas: PositionedParagraph[],
  pageHeight: number,
  pageNumber: number
): Promise<
  {
    figureNumber: string;
    caption: string;
    croppedDataUri: string;
    precedingParaIndex: number;
  }[]
> => {
  if (typeof document === 'undefined') {
    return [];
  }

  // 1. Scan for any figure/diagram mentions or captions across the page text
  const figureMentions: {
    figNum: string;
    paraIndex: number;
    isCaption: boolean;
    captionText: string;
  }[] = [];
  const figRegex = /(?:Figure|Fig\.|Diagram|Illustration|شكل|مخطط)\s*([0-9]+[A-Za-z0-9_.-]*)/i;
  const captionRegex = /^\s*(?:Figure|Fig\.|Diagram|Illustration|شكل|مخطط)\s*([0-9]+[A-Za-z0-9_.-]*)/i;

  positionedParas.forEach((p, idx) => {
    const isCaption = captionRegex.test(p.text);
    const match = p.text.match(figRegex);
    if (match) {
      figureMentions.push({
        figNum: match[1].replace(/[.:,]$/, ''),
        paraIndex: idx,
        isCaption,
        captionText: p.text.slice(0, 100),
      });
    }
  });

  // 2. Discover potential visual illustration gaps (vector paths, diagrams, schemas)
  const candidateGaps: {
    gapTop: number;
    gapBottom: number;
    precedingParaIndex: number;
    explicitFigNum?: string;
    explicitCaption?: string;
  }[] = [];

  const minGapRatio = figureMentions.length > 0 ? 0.05 : 0.08;

  for (let i = 0; i <= positionedParas.length; i++) {
    const gapTop =
      i === 0 ? pageHeight * 0.05 : positionedParas[i - 1].bottomY + 4;
    const gapBottom =
      i === positionedParas.length
        ? pageHeight * 0.94
        : positionedParas[i].topY - 4;
    const gapHeight = gapBottom - gapTop;

    if (gapHeight >= pageHeight * minGapRatio && gapHeight <= pageHeight * 0.88) {
      // Check if this gap is directly adjacent to a figure caption
      const adjacentMention = figureMentions.find(
        (m) => m.paraIndex === i || m.paraIndex === i - 1
      );

      candidateGaps.push({
        gapTop,
        gapBottom,
        precedingParaIndex: Math.max(0, i - 1),
        explicitFigNum: adjacentMention?.figNum,
        explicitCaption: adjacentMention?.captionText,
      });
    }
  }

  // If no gaps between paragraphs, but page has figure mentions or very few paragraphs, check whole center page
  if (candidateGaps.length === 0 && (figureMentions.length > 0 || positionedParas.length <= 2)) {
    candidateGaps.push({
      gapTop: pageHeight * 0.12,
      gapBottom: pageHeight * 0.88,
      precedingParaIndex: 0,
      explicitFigNum: figureMentions[0]?.figNum,
      explicitCaption: figureMentions[0]?.captionText,
    });
  }

  if (candidateGaps.length === 0) return [];

  // Sort: prioritize gaps with explicit figure mentions first, then largest gaps
  candidateGaps.sort((a, b) => {
    if (a.explicitFigNum && !b.explicitFigNum) return -1;
    if (!a.explicitFigNum && b.explicitFigNum) return 1;
    return b.gapBottom - b.gapTop - (a.gapBottom - a.gapTop);
  });

  const topGaps = candidateGaps.slice(0, 3);
  const canvas = await renderPageToOffscreenCanvas(page, 1.55);
  if (!canvas) return [];

  const detected: {
    figureNumber: string;
    caption: string;
    croppedDataUri: string;
    precedingParaIndex: number;
  }[] = [];

  const usedFigNums = new Set<string>();

  topGaps.forEach((gap, idx) => {
    const ymin = Math.max(35, Math.round((gap.gapTop / pageHeight) * 1000));
    const ymax = Math.min(965, Math.round((gap.gapBottom / pageHeight) * 1000));
    if (ymax - ymin < 65) return;

    const croppedUri = cropBoxFromCanvas(
      canvas,
      {
        ymin,
        xmin: 40,
        ymax,
        xmax: 960,
      },
      true // Require visible ink
    );

    if (croppedUri) {
      let figNum = gap.explicitFigNum;
      if (!figNum || usedFigNums.has(figNum)) {
        figNum =
          topGaps.length === 1 ? `${pageNumber}` : `${pageNumber}.${idx + 1}`;
      }
      usedFigNums.add(figNum);

      const contextText =
        gap.explicitCaption ||
        positionedParas[gap.precedingParaIndex]?.text.slice(0, 95) ||
        `Figure on Page ${pageNumber}`;

      detected.push({
        figureNumber: figNum,
        caption: `Figure ${figNum} (Page ${pageNumber}) — "${contextText}"`,
        croppedDataUri: croppedUri,
        precedingParaIndex: gap.precedingParaIndex,
      });
    }
  });

  return detected;
};

/**
 * Extracts a 10-page batch `[startPage .. endPage]` using all 4 extraction layers.
 */
export const extractPdfChapterPageRange = async (
  pdfBytes: Uint8Array,
  bookId: string,
  chapterIndex: number,
  startPage: number,
  endPage: number
): Promise<{
  paragraphs: (string | RawRichParagraph)[];
  figures: BookFigureRecord[];
  paragraphFigures: Record<number, string[]>;
}> => {
  const paragraphs: (string | RawRichParagraph)[] = [];
  const figures: BookFigureRecord[] = [];
  const paragraphFigures: Record<number, string[]> = {};
  const seenFigureNums = new Set<string>();
  const chapterId = `${bookId}_ch_${chapterIndex}`;

  const pdfjsLib = await loadPdfJsLibrary();
  const pdfDoc = await openPdfDocument(pdfBytes);
  const safeEnd = Math.min(endPage, pdfDoc.numPages);

  const geminiKey = await secureVault.getSecret(SECURE_KEYS.GEMINI_API_KEY);
  const groqKey = await secureVault.getSecret(SECURE_KEYS.GROQ_API_KEY);
  const preferredGeminiModel =
    (await secureVault.getSecret(SECURE_KEYS.GEMINI_MODEL_NAME)) ||
    'gemini-2.5-flash';

  interface PageSlot {
    pageNum: number;
    pageObj: any;
    fragments: PageFragment[];
    positionedParas: PositionedParagraph[];
    pageHeight: number;
    pageWidth: number;
    pdfJsParagraphs: RawRichParagraph[];
    offscreenCanvas?: HTMLCanvasElement | null;
  }

  const pageSlots: PageSlot[] = [];
  let totalBatchNativeChars = 0;

  // Step 1 (Layer 1): Inspect all pages in this 10-page range with PDF.js (with per-page fault isolation)
  for (let pageNum = startPage; pageNum <= safeEnd; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const { fragments, pageHeight, pageWidth } = await extractPageFragments(
        page,
        pdfjsLib
      );

      pageSlots.push({
        pageNum,
        pageObj: page,
        fragments,
        positionedParas: [],
        pageHeight,
        pageWidth,
        pdfJsParagraphs: [],
      });
    } catch (pageErr) {
      // Fault isolation: if a single page in the PDF has a broken XRef/circular ref, skip it without failing the batch
      console.warn(`[ByteBook PDF] Skipped malformed page ${pageNum}:`, pageErr);
    }
  }

  // Layout-aware analysis: the dominant body font size is computed over the whole batch
  // so headings are classified consistently across pages.
  const batchBodyFontSize = computeModalFontSize(
    pageSlots.map((s) => s.fragments)
  );
  for (const slot of pageSlots) {
    try {
      slot.positionedParas = reconstructPositionedParagraphs(
        slot.fragments,
        slot.pageWidth,
        slot.pageHeight,
        batchBodyFontSize
      );
    } catch (layoutErr) {
      console.warn(
        `[ByteBook PDF] Layout analysis failed on page ${slot.pageNum}:`,
        layoutErr
      );
      slot.positionedParas = [];
    }
    slot.pdfJsParagraphs = slot.positionedParas.map((p) => p.rich);
    totalBatchNativeChars += slot.positionedParas
      .map((p) => p.text)
      .join('').length;
  }

  // Determine whether this 10-page batch is a Scanned PDF (no digital text layer)
  // vs. a Digital Text PDF (like Grokking Algorithms, where PDF.js already extracted the text!)
  const isScannedBatch = totalBatchNativeChars < 120;

  const pagesNeedingVision: { pageNum: number; canvas: HTMLCanvasElement }[] =
    [];

  if (isScannedBatch) {
    for (const slot of pageSlots) {
      if (slot.pdfJsParagraphs.map((p) => p.text).join('').length < 40) {
        const canvas = await renderPageToOffscreenCanvas(slot.pageObj, 1.45);
        if (canvas) {
          slot.offscreenCanvas = canvas;
          pagesNeedingVision.push({ pageNum: slot.pageNum, canvas });
        }
      }
    }
  }

  // Step 2 (Layer 2): Gemini 2.5 Vision OCR (used when batch is scanned)
  const aiResultsByPage = new Map<number, AiExtractedPageResult>();

  if (geminiKey && pagesNeedingVision.length > 0) {
    const AI_CHUNK_SIZE = 2;
    for (let i = 0; i < pagesNeedingVision.length; i += AI_CHUNK_SIZE) {
      const chunk = pagesNeedingVision.slice(i, i + AI_CHUNK_SIZE);
      const batchMap = await analyzePagesBatchWithGemini(
        chunk,
        geminiKey,
        preferredGeminiModel
      );
      batchMap.forEach((val, key) => {
        aiResultsByPage.set(key, val);
      });

      if (chunk.length > 1) {
        for (const item of chunk) {
          const existing = aiResultsByPage.get(item.pageNum);
          if (!existing || existing.paragraphs.length === 0) {
            const singleMap = await analyzePagesBatchWithGemini(
              [item],
              geminiKey,
              preferredGeminiModel
            );
            const singleRes = singleMap.get(item.pageNum);
            if (singleRes && singleRes.paragraphs.length > 0) {
              aiResultsByPage.set(item.pageNum, singleRes);
            }
          }
        }
      }
    }
  }

  // Step 3 (Layer 3 & Layer 4): Groq Vision & Local OCR (`tesseract.js`) fallback for scanned batches
  for (const item of pagesNeedingVision) {
    const existingAi = aiResultsByPage.get(item.pageNum);
    if (existingAi && existingAi.paragraphs.length > 0) {
      continue;
    }

    let fallbackParas: string[] = [];
    if (groqKey) {
      fallbackParas = await analyzeSinglePageWithGroqVision(
        item.pageNum,
        item.canvas,
        groqKey
      );
    }

    if (fallbackParas.length === 0) {
      fallbackParas = await extractPageTextWithLocalOcr(item.canvas);
    }

    if (fallbackParas.length > 0) {
      aiResultsByPage.set(item.pageNum, {
        pageNum: item.pageNum,
        paragraphs: fallbackParas,
        figures: existingAi?.figures || [],
      });
    }
  }

  // Step 4: Assemble all 10 pages in exact order (paragraphs + inline cropped illustrations)
  for (const slot of pageSlots) {
    const aiPage = aiResultsByPage.get(slot.pageNum);
    const finalPageParas =
      aiPage && aiPage.paragraphs.length > 0
        ? aiPage.paragraphs
        : slot.pdfJsParagraphs;

    let firstParaGlobalIdx = paragraphs.length;

    if (finalPageParas.length > 0) {
      if (startPage !== safeEnd) {
        paragraphs.push(`— Page ${slot.pageNum} —`);
      }
      firstParaGlobalIdx = paragraphs.length;
      for (const para of finalPageParas) {
        paragraphs.push(para);
      }
    }

    const lastParaIdx = Math.max(0, paragraphs.length - 1);

    // Attach AI-detected cropped contextual figures if any
    if (aiPage && aiPage.figures.length > 0 && slot.offscreenCanvas) {
      for (const aiFig of aiPage.figures) {
        const figNum = aiFig.figureNumber || `${slot.pageNum}`;
        if (seenFigureNums.has(figNum)) continue;

        const croppedUri = cropBoxFromCanvas(
          slot.offscreenCanvas,
          {
            ymin: aiFig.ymin,
            xmin: aiFig.xmin,
            ymax: aiFig.ymax,
            xmax: aiFig.xmax,
          },
          true
        );

        if (croppedUri) {
          seenFigureNums.add(figNum);
          const figId = `${bookId}_fig_${figNum}`;
          figures.push({
            id: figId,
            bookId,
            chapterId,
            figureNumber: figNum,
            normalizedKeys: [
              figNum.toLowerCase(),
              `fig.${figNum.toLowerCase()}`,
              `figure ${figNum.toLowerCase()}`,
              `شكل ${figNum}`,
            ],
            title: aiFig.title || `Figure ${figNum} (Page ${slot.pageNum})`,
            caption: aiFig.caption || `Figure ${figNum}`,
            localUri: croppedUri,
          });

          if (!paragraphFigures[lastParaIdx]) {
            paragraphFigures[lastParaIdx] = [];
          }
          paragraphFigures[lastParaIdx].push(figId);
        }
      }
    } else if (slot.positionedParas.length > 0) {
      // Attach inline cropped illustrations right after the exact paragraph that introduces them!
      const geoFigures = await detectAndCropGeometricFiguresOnPage(
        slot.pageObj,
        slot.positionedParas,
        slot.pageHeight,
        slot.pageNum
      );

      for (const gf of geoFigures) {
        if (seenFigureNums.has(gf.figureNumber)) continue;
        seenFigureNums.add(gf.figureNumber);

        const figId = `${bookId}_fig_${gf.figureNumber}`;
        figures.push({
          id: figId,
          bookId,
          chapterId,
          figureNumber: gf.figureNumber,
          normalizedKeys: [
            gf.figureNumber.toLowerCase(),
            `fig.${gf.figureNumber.toLowerCase()}`,
            `figure ${gf.figureNumber.toLowerCase()}`,
            `شكل ${gf.figureNumber}`,
          ],
          title: `Illustration ${gf.figureNumber} (Page ${slot.pageNum})`,
          caption: gf.caption,
          localUri: gf.croppedDataUri,
        });

        const targetGlobalIdx = Math.min(
          lastParaIdx,
          firstParaGlobalIdx + gf.precedingParaIndex
        );
        if (!paragraphFigures[targetGlobalIdx]) {
          paragraphFigures[targetGlobalIdx] = [];
        }
        paragraphFigures[targetGlobalIdx].push(figId);
      }
    }
  }

  if (paragraphs.length === 0) {
    if (startPage === safeEnd) {
      paragraphs.push(
        `الصفحة (${startPage}) فارغة أو عبارة عن غلاف/فاصل خالٍ من النصوص. اضغط على زر الصفحة التالية بالأسفل للمتابعة.`
      );
    } else {
      paragraphs.push(
        `الصفحات (${startPage}–${safeEnd}) فارغة أو عبارة عن أغلفة/فواصل خالية من النصوص. اضغط على زر الصفحة التالية بالأسفل للمتابعة.`
      );
    }
  }

  return {
    paragraphs,
    figures,
    paragraphFigures,
  };
};

/**
 * Main PDF Ingestion Pipeline:
 * Divides the entire PDF from Page 1 to `totalPages` into clean 10-page batches.
 */
export const parsePdfBufferToReflowable = async (
  pdfBytes: Uint8Array,
  bookId: string,
  fallbackTitle: string
): Promise<ExtractedTextBookData> => {
  cachePdfBufferForBook(bookId, pdfBytes);

  const pdfDoc = await openPdfDocument(pdfBytes);
  const totalPages: number = pdfDoc.numPages || 1;

  const firstBatch = await extractPdfChapterPageRange(
    pdfBytes,
    bookId,
    0,
    1,
    1
  );

  const chapters: ExtractedChapterRaw[] = [];

  for (let p = 1; p <= totalPages; p++) {
    const pageIdx = p - 1;
    const rangeLabel = `صفحة ${p} من ${totalPages}`;

    if (pageIdx === 0) {
      chapters.push({
        title: `الصفحة 1 من ${totalPages}`,
        paragraphs: firstBatch.paragraphs,
        paragraphFigures: firstBatch.paragraphFigures,
        isExtracted: true,
        startPage: 1,
        endPage: 1,
        pageRangeLabel: rangeLabel,
      });
    } else {
      chapters.push({
        title: `الصفحة ${p} من ${totalPages}`,
        paragraphs: [],
        paragraphFigures: {},
        isExtracted: false,
        startPage: p,
        endPage: p,
        pageRangeLabel: rangeLabel,
      });
    }
  }

  return {
    title: fallbackTitle.replace(/\.pdf$/i, ''),
    author: `كتاب PDF كامل (${totalPages} صفحة)`,
    totalPages,
    chapters,
    figures: firstBatch.figures,
  };
};

/**
 * Parses plain text or Markdown content verbatim into 10-page-equivalent batches.
 */
export const parsePlainTextContent = (
  rawContent: string,
  bookId: string,
  fallbackTitle: string
): ExtractedTextBookData => {
  const normalized = rawContent.replace(/\r\n/g, '\n').trim();
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter((b) => b.length > 0);

  const chapters: ExtractedChapterRaw[] = [];
  const PARAS_PER_BATCH = 35;
  const totalBatches = Math.max(
    1,
    Math.ceil(rawBlocks.length / PARAS_PER_BATCH)
  );

  for (let i = 0; i < totalBatches; i++) {
    const slice = rawBlocks.slice(
      i * PARAS_PER_BATCH,
      (i + 1) * PARAS_PER_BATCH
    );
    chapters.push({
      title: `الجزء ${i + 1} (الفقرات ${i * PARAS_PER_BATCH + 1}–${
        i * PARAS_PER_BATCH + slice.length
      })`,
      paragraphs: slice,
      paragraphFigures: {},
      isExtracted: true,
    });
  }

  return {
    title: fallbackTitle.replace(/\.(txt|md)$/i, ''),
    author: 'Text Book',
    chapters,
    figures: [],
  };
};
