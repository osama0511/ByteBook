/**
 * ByteBook — Theme & Typography Zustand Store
 * Default font size increased to 22px with 1.8x line spacing for maximum clarity and eye comfort.
 */

import { create } from 'zustand';
import {
  createTypographyScale,
  DEFAULT_PIXEL_THEME,
  PIXEL_THEMES,
  PixelThemeDefinition,
  PixelThemeId,
  ReadingFontPreference,
  TypographyScale,
} from '../theme/pixelDesignSystem';

interface ThemeState {
  themeId: PixelThemeId;
  theme: PixelThemeDefinition;
  readingFontSize: number;
  lineHeightMultiplier: number;
  readingFontPreference: ReadingFontPreference;
  typography: TypographyScale;
  setThemeId: (id: PixelThemeId) => void;
  setReadingFontSize: (size: number) => void;
  setLineHeightMultiplier: (multiplier: number) => void;
  setReadingFontPreference: (pref: ReadingFontPreference) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: DEFAULT_PIXEL_THEME,
  theme: PIXEL_THEMES[DEFAULT_PIXEL_THEME],
  readingFontSize: 22,
  lineHeightMultiplier: 1.8,
  readingFontPreference: 'serif_comfortable',
  typography: createTypographyScale(22, 'serif_comfortable', 1.8),

  setThemeId: (id: PixelThemeId) => {
    set({
      themeId: id,
      theme: PIXEL_THEMES[id],
    });
  },

  setReadingFontSize: (size: number) => {
    const clamped = Math.max(16, Math.min(34, size));
    const { readingFontPreference, lineHeightMultiplier } = get();
    set({
      readingFontSize: clamped,
      typography: createTypographyScale(
        clamped,
        readingFontPreference,
        lineHeightMultiplier
      ),
    });
  },

  setLineHeightMultiplier: (multiplier: number) => {
    const clamped = Math.max(1.4, Math.min(2.4, Number(multiplier.toFixed(2))));
    const { readingFontSize, readingFontPreference } = get();
    set({
      lineHeightMultiplier: clamped,
      typography: createTypographyScale(
        readingFontSize,
        readingFontPreference,
        clamped
      ),
    });
  },

  setReadingFontPreference: (pref: ReadingFontPreference) => {
    const { readingFontSize, lineHeightMultiplier } = get();
    set({
      readingFontPreference: pref,
      typography: createTypographyScale(
        readingFontSize,
        pref,
        lineHeightMultiplier
      ),
    });
  },
}));
