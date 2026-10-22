/**
 * ByteBook — Persistent Theme & Typography Zustand Store
 * Wrapped with `persist` middleware backed by AsyncStorage + LocalStorage fallback
 * for seamless cross-platform persistence across iOS and Web/PWA.
 * Default font size set to 16px and default theme to 'classic_manuscript'.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import {
  createTypographyScale,
  DEFAULT_PIXEL_THEME,
  PIXEL_THEMES,
  PixelThemeDefinition,
  PixelThemeId,
  ReadingFontPreference,
  TypographyScale,
} from '../theme/pixelDesignSystem';

export const THEME_STORAGE_KEY = 'bytebook_reader_theme_storage';

/**
 * Robust cross-platform StateStorage implementation:
 * Uses AsyncStorage on native platforms (iOS / Android),
 * and localStorage on Web/PWA with defensive fallback.
 */
const crossPlatformThemeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (value !== null) return value;
    } catch {
      // Fallback below
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Fallback below
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(name, value);
      } catch {
        // Ignore quota/access errors
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Fallback below
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Ignore
      }
    }
  },
};

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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: DEFAULT_PIXEL_THEME,
      theme: PIXEL_THEMES[DEFAULT_PIXEL_THEME],
      readingFontSize: 16,
      lineHeightMultiplier: 1.8,
      readingFontPreference: 'serif_comfortable',
      typography: createTypographyScale(16, 'serif_comfortable', 1.8),

      setThemeId: (id: PixelThemeId) => {
        const themeDef = PIXEL_THEMES[id] ?? PIXEL_THEMES[DEFAULT_PIXEL_THEME];
        set({
          themeId: id,
          theme: themeDef,
        });
      },

      setReadingFontSize: (size: number) => {
        const clamped = Math.max(12, Math.min(36, size));
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
        const clamped = Math.max(
          1.4,
          Math.min(2.4, Number(multiplier.toFixed(2)))
        );
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
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => crossPlatformThemeStorage),
      partialize: (state) => ({
        themeId: state.themeId,
        readingFontSize: state.readingFontSize,
        lineHeightMultiplier: state.lineHeightMultiplier,
        readingFontPreference: state.readingFontPreference,
      }),
      merge: (persistedState: any, currentState: ThemeState): ThemeState => {
        const themeId: PixelThemeId =
          persistedState?.themeId &&
          PIXEL_THEMES[persistedState.themeId as PixelThemeId]
            ? (persistedState.themeId as PixelThemeId)
            : DEFAULT_PIXEL_THEME;
        const readingFontSize: number =
          typeof persistedState?.readingFontSize === 'number'
            ? persistedState.readingFontSize
            : 16;
        const lineHeightMultiplier: number =
          typeof persistedState?.lineHeightMultiplier === 'number'
            ? persistedState.lineHeightMultiplier
            : 1.8;
        const readingFontPreference: ReadingFontPreference =
          persistedState?.readingFontPreference === 'pixel_retro'
            ? 'pixel_retro'
            : 'serif_comfortable';

        return {
          ...currentState,
          themeId,
          theme: PIXEL_THEMES[themeId],
          readingFontSize,
          lineHeightMultiplier,
          readingFontPreference,
          typography: createTypographyScale(
            readingFontSize,
            readingFontPreference,
            lineHeightMultiplier
          ),
        };
      },
    }
  )
);
