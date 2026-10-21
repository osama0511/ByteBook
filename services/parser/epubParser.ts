/**
 * ByteBook — Native & Web EPUB Decompression & Reflowable Extraction Engine
 * Uses `fflate` to unzip EPUB archives in memory, parses OPF manifest/spine,
 * extracts embedded images as base64 Data URIs, and converts XHTML into reflowable paragraphs.
 */

import { strFromU8, unzipSync } from 'fflate';
import { BookFigureRecord } from './types';

export interface ExtractedEpubData {
  title: string;
  author: string;
  chapters: {
    title: string;
    paragraphs: string[];
    paragraphFigures?: Record<number, string[]>;
  }[];
  figures: BookFigureRecord[];
}

const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const uint8ToBase64 = (bytes: Uint8Array): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < len ? chars[b3 & 63] : '=';
  }
  return result;
};

const resolveRelativeZipPath = (baseDir: string, relativeHref: string): string => {
  const cleanHref = relativeHref.split('#')[0].split('?')[0];
  if (!baseDir) return cleanHref;
  const parts = `${baseDir}/${cleanHref}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join('/');
};

export const parseEpubBuffer = (
  zipBytes: Uint8Array,
  bookId: string,
  fallbackTitle: string
): ExtractedEpubData => {
  const unzipped = unzipSync(zipBytes);
  const fileKeys = Object.keys(unzipped);

  // 1. Locate OPF file via container.xml or .opf extension
  let opfPath = fileKeys.find((k) => k.toLowerCase().endsWith('.opf')) || '';
  const containerKey = fileKeys.find(
    (k) => k.toLowerCase() === 'meta-inf/container.xml'
  );
  if (containerKey && unzipped[containerKey]) {
    const containerXml = strFromU8(unzipped[containerKey]);
    const match = containerXml.match(/full-path=["']([^"']+)["']/i);
    if (match && match[1]) {
      opfPath = match[1];
    }
  }

  let title = fallbackTitle.replace(/\.epub$/i, '');
  let author = 'Imported EPUB Author';
  const opfDir = opfPath.includes('/')
    ? opfPath.slice(0, opfPath.lastIndexOf('/'))
    : '';

  const manifestMap = new Map<string, { href: string; mediaType: string }>();
  const spineIds: string[] = [];

  if (opfPath && unzipped[opfPath]) {
    const opfXml = strFromU8(unzipped[opfPath]);
    const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    if (titleMatch?.[1]) title = stripHtmlTags(titleMatch[1]);

    const creatorMatch = opfXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    if (creatorMatch?.[1]) author = stripHtmlTags(creatorMatch[1]);

    const itemRegex = /<item\s+([^>]+?)\/?>/gi;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
      const attrs = itemMatch[1];
      const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
      const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || '';
      if (id && href) {
        manifestMap.set(id, {
          href: resolveRelativeZipPath(opfDir, decodeURIComponent(href)),
          mediaType,
        });
      }
    }

    const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
    let refMatch: RegExpExecArray | null;
    while ((refMatch = itemrefRegex.exec(opfXml)) !== null) {
      spineIds.push(refMatch[1]);
    }
  }

  // 2. Extract embedded images into a lookup map (zipPath -> dataUri)
  const imageUriByZipPath = new Map<string, string>();
  for (const key of fileKeys) {
    const lower = key.toLowerCase();
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif')
    ) {
      const mime = lower.endsWith('.png')
        ? 'image/png'
        : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.gif')
        ? 'image/gif'
        : 'image/jpeg';
      const b64 = uint8ToBase64(unzipped[key]);
      imageUriByZipPath.set(key, `data:${mime};base64,${b64}`);
    }
  }

  // 3. Determine ordered XHTML chapter files
  let orderedHtmlPaths = spineIds
    .map((id) => manifestMap.get(id)?.href)
    .filter((p): p is string => Boolean(p && unzipped[p]));

  if (orderedHtmlPaths.length === 0) {
    orderedHtmlPaths = fileKeys
      .filter((k) => /\.(xhtml|html|htm)$/i.test(k))
      .sort();
  }

  const chapters: ExtractedEpubData['chapters'] = [];
  const figures: BookFigureRecord[] = [];
  let figureCounter = 1;

  orderedHtmlPaths.forEach((htmlPath) => {
    const rawHtml = strFromU8(unzipped[htmlPath]);
    const htmlDir = htmlPath.includes('/')
      ? htmlPath.slice(0, htmlPath.lastIndexOf('/'))
      : '';

    const headingMatch = rawHtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const chapterTitle = headingMatch
      ? stripHtmlTags(headingMatch[1])
      : `Chapter ${chapters.length + 1}`;

    const paragraphs: string[] = [];
    const paragraphFigures: Record<number, string[]> = {};
    const chapterId = `${bookId}_ch_${chapters.length}`;

    // Extract block elements and images in reading order
    const blockRegex =
      /<(h[1-6]|p|blockquote|pre|li|figure|img)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*\/?>/gi;
    let blkMatch: RegExpExecArray | null;

    while ((blkMatch = blockRegex.exec(rawHtml)) !== null) {
      const fullTag = blkMatch[0];
      const imgMatch = fullTag.match(/\bsrc=["']([^"']+)["']/i);

      if (imgMatch?.[1]) {
        const resolvedImgPath = resolveRelativeZipPath(
          htmlDir,
          decodeURIComponent(imgMatch[1])
        );
        const dataUri = imageUriByZipPath.get(resolvedImgPath);
        if (dataUri) {
          const figNum = String(figureCounter++);
          const figId = `${bookId}_fig_${figNum}`;
          const altOrCaption =
             stripHtmlTags(fullTag) ||
            fullTag.match(/\balt=["']([^"']+)["']/i)?.[1] ||
            `Figure ${figNum} from ${chapterTitle}`;

          figures.push({
            id: figId,
            bookId,
            chapterId,
            figureNumber: figNum,
            normalizedKeys: [
              figNum,
              `fig.${figNum}`,
              `figure ${figNum}`,
              `شكل ${figNum}`,
            ],
            title: `Figure ${figNum}`,
            caption: altOrCaption,
            localUri: dataUri,
          });

          const targetParaIdx = Math.max(0, paragraphs.length - 1);
          if (!paragraphFigures[targetParaIdx]) {
            paragraphFigures[targetParaIdx] = [];
          }
          paragraphFigures[targetParaIdx].push(figId);
        }
      }

      const cleanText = stripHtmlTags(fullTag);
      if (cleanText.length >= 12) {
        paragraphs.push(cleanText);
      }
    }

    if (paragraphs.length > 0) {
      chapters.push({
        title: chapterTitle || `Section ${chapters.length + 1}`,
        paragraphs,
        paragraphFigures,
      });
    }
  });

  if (chapters.length === 0) {
    chapters.push({
      title: 'Chapter 1',
      paragraphs: [
        'This EPUB file was imported into ByteBook. Tap any word or paragraph to translate.',
      ],
    });
  }

  return {
    title,
    author,
    chapters,
    figures,
  };
};
