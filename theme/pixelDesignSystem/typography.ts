/**
 * ByteBook — High-Clarity Dual Typography System
 * Upgraded with larger, clearer font sizes for effortless reading and crisp Arabic/English UI buttons.
 */

import { Platform, TextStyle } from 'react-native';

export const PixelFontFamilies = {
  /** Primary 8-bit Arcade Header Font */
  pixelDisplay: 'PressStart2P_400Regular',
  /** Crisp 16-bit UI & Inline Badge Font */
  pixelUiRegular: 'Silkscreen_400Regular',
  pixelUiBold: 'Silkscreen_700Bold',
  /** Retro Terminal / Counter / Monospace Font */
  pixelTerminal: 'VT323_400Regular',
  /** Comfortable Reflowable English Book Body Font */
  readingSerifRegular: 'Literata_400Regular',
  readingSerifItalic: 'Literata_400Regular_Italic',
  readingSerifBold: 'Literata_700Bold',
  /** Crisp Arabic Contextual Translation & UI Font */
  arabicRegular: 'IBMPlexSansArabic_400Regular',
  arabicBold: 'IBMPlexSansArabic_700Bold',
  /** System Monospace Fallback for Code Blocks */
  codeMono: Platform.select({
    ios: 'Menlo',
    web: 'monospace',
    default: 'monospace',
  }),
} as const;

export type ReadingFontPreference = 'serif_comfortable' | 'pixel_retro';

export interface TypographyScale {
  pixelHeroTitle: TextStyle;
  pixelSectionTitle: TextStyle;
  pixelButtonLabel: TextStyle;
  pixelBadgeLabel: TextStyle;
  pixelTerminalStat: TextStyle;
  readingParagraph: TextStyle;
  readingHeading: TextStyle;
  readingCodeBlock: TextStyle;
  arabicTranslationBody: TextStyle;
  arabicTranslationBold: TextStyle;
}

export const createTypographyScale = (
  readingFontSize: number = 22,
  readingFontPreference: ReadingFontPreference = 'serif_comfortable',
  lineHeightMultiplier: number = 1.8
): TypographyScale => {
  const isRetroBody = readingFontPreference === 'pixel_retro';
  const effectiveFontSize = isRetroBody ? readingFontSize + 4 : readingFontSize;
  const effectiveMultiplier = isRetroBody
    ? Math.max(1.45, lineHeightMultiplier - 0.1)
    : lineHeightMultiplier;

  return {
    pixelHeroTitle: {
      fontFamily: PixelFontFamilies.pixelDisplay,
      fontSize: 18,
      lineHeight: 28,
      letterSpacing: 0.8,
    },
    pixelSectionTitle: {
      fontFamily: PixelFontFamilies.arabicBold,
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '700',
    },
    pixelButtonLabel: {
      fontFamily: PixelFontFamilies.arabicBold,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '700',
    },
    pixelBadgeLabel: {
      fontFamily: PixelFontFamilies.arabicBold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },
    pixelTerminalStat: {
      fontFamily: PixelFontFamilies.pixelTerminal,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: 0.6,
    },
    readingParagraph: {
      fontFamily: isRetroBody
        ? PixelFontFamilies.pixelTerminal
        : PixelFontFamilies.readingSerifRegular,
      fontSize: effectiveFontSize,
      lineHeight: Math.round(effectiveFontSize * effectiveMultiplier),
    },
    readingHeading: {
      fontFamily: isRetroBody
        ? PixelFontFamilies.pixelDisplay
        : PixelFontFamilies.readingSerifBold,
      fontSize: Math.round(readingFontSize * (isRetroBody ? 1.1 : 1.35)),
      lineHeight: Math.round(readingFontSize * 1.8),
      fontWeight: '700',
    },
    readingCodeBlock: {
      fontFamily: PixelFontFamilies.pixelTerminal,
      fontSize: Math.max(18, readingFontSize),
      lineHeight: Math.round(Math.max(18, readingFontSize) * 1.5),
    },
    arabicTranslationBody: {
      fontFamily: PixelFontFamilies.arabicRegular,
      fontSize: Math.max(18, readingFontSize - 1),
      lineHeight: Math.round(Math.max(18, readingFontSize - 1) * 1.8),
      writingDirection: 'rtl',
    },
    arabicTranslationBold: {
      fontFamily: PixelFontFamilies.arabicBold,
      fontSize: Math.max(19, readingFontSize),
      lineHeight: Math.round(Math.max(19, readingFontSize) * 1.8),
      writingDirection: 'rtl',
      fontWeight: '700',
    },
  };
};
