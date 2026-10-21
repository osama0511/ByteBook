/**
 * ByteBook — 16-Bit Retro Theme Palettes
 * Includes:
 * 1. Classic Manuscript (ثيم المخطوطة الكلاسيكية)
 * 2. Night Phosphor CRT (ثيم شاشة الفوسفور الليلية)
 * 3. Aged Paper Grimoire (ثيم الورق القديم)
 */

export type PixelThemeId = 'classic_manuscript' | 'night_phosphor' | 'aged_paper';

export interface PixelColorPalette {
  backgroundPrimary: string;
  backgroundSecondary: string;
  surfaceElevated: string;
  surfaceInset: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGold: string;
  borderOuter: string;
  borderInner: string;
  borderHighlight: string;
  borderShadow: string;
  shadowHard: string;
  selectionHighlight: string;
  badgeBackground: string;
  badgeText: string;
  badgeBorder: string;
  success: string;
  warning: string;
  danger: string;
}

export interface PixelThemeDefinition {
  id: PixelThemeId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  isDark: boolean;
  colors: PixelColorPalette;
}

export const PIXEL_THEMES: Record<PixelThemeId, PixelThemeDefinition> = {
  classic_manuscript: {
    id: 'classic_manuscript',
    nameAr: 'المخطوطة الكلاسيكية',
    nameEn: 'Classic Manuscript',
    descriptionAr: 'رقّ مخطوطة دافئ بإطارات حبر داكنة وأختام ملكية مستوحاة من ألعاب RPG الكلاسيكية.',
    isDark: false,
    colors: {
      backgroundPrimary: '#F4ECD8',
      backgroundSecondary: '#EAE0C8',
      surfaceElevated: '#FFFDF7',
      surfaceInset: '#DFD3B6',
      textPrimary: '#2B1E16',
      textSecondary: '#5C4636',
      textMuted: '#8A725E',
      accentPrimary: '#C84B31',
      accentSecondary: '#2D6A4F',
      accentGold: '#D99B26',
      borderOuter: '#2B1E16',
      borderInner: '#6E5540',
      borderHighlight: '#FFF9EB',
      borderShadow: '#C7B898',
      shadowHard: '#2B1E16',
      selectionHighlight: '#F7D08A',
      badgeBackground: '#2D6A4F',
      badgeText: '#FFFDF7',
      badgeBorder: '#1B4332',
      success: '#2D6A4F',
      warning: '#D97706',
      danger: '#B91C1C',
    },
  },
  night_phosphor: {
    id: 'night_phosphor',
    nameAr: 'شاشة الفوسفور الليلية',
    nameEn: 'Night Phosphor CRT',
    descriptionAr: 'شاشة CRT فوسفورية خضراء وكهرمانية مريحة للعين في القراءة الليلية العميقة.',
    isDark: true,
    colors: {
      backgroundPrimary: '#0D130F',
      backgroundSecondary: '#141E18',
      surfaceElevated: '#1B2921',
      surfaceInset: '#080C09',
      textPrimary: '#72F1B8',
      textSecondary: '#48A87D',
      textMuted: '#2E6F52',
      accentPrimary: '#FFB000',
      accentSecondary: '#00E5FF',
      accentGold: '#FFD166',
      borderOuter: '#346856',
      borderInner: '#214539',
      borderHighlight: '#72F1B8',
      borderShadow: '#09100C',
      shadowHard: '#040705',
      selectionHighlight: '#234E3B',
      badgeBackground: '#133840',
      badgeText: '#00E5FF',
      badgeBorder: '#00E5FF',
      success: '#72F1B8',
      warning: '#FFB000',
      danger: '#FF5C5C',
    },
  },
  aged_paper: {
    id: 'aged_paper',
    nameAr: 'الورق القديم المعتّق',
    nameEn: 'Aged Paper Tome',
    descriptionAr: 'درجات السيبيا والورق القديم منخفض التوهج لقراءة الكتب التخصصية لساعات طويلة.',
    isDark: false,
    colors: {
      backgroundPrimary: '#E6D7B9',
      backgroundSecondary: '#D8C6A3',
      surfaceElevated: '#EFE3CA',
      surfaceInset: '#CBB68E',
      textPrimary: '#36261B',
      textSecondary: '#634B3A',
      textMuted: '#8C705B',
      accentPrimary: '#8C3B2B',
      accentSecondary: '#3D5A6C',
      accentGold: '#B8860B',
      borderOuter: '#3E2C1E',
      borderInner: '#705642',
      borderHighlight: '#F4E9D2',
      borderShadow: '#BDA882',
      shadowHard: '#2A1D13',
      selectionHighlight: '#D4B475',
      badgeBackground: '#3D5A6C',
      badgeText: '#F4E9D2',
      badgeBorder: '#243845',
      success: '#386641',
      warning: '#BC6C25',
      danger: '#9B2226',
    },
  },
};

export const DEFAULT_PIXEL_THEME: PixelThemeId = 'classic_manuscript';
