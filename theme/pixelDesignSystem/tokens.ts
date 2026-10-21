/**
 * ByteBook — Pixel Design System Tokens
 * Built on a strict 2px / 4px integer pixel grid for crisp 16-bit rendering.
 */

export const PIXEL_UNIT = 4 as const;
export const SUB_PIXEL_UNIT = 2 as const;

export const PixelSpacing = {
  none: 0,
  xxs: SUB_PIXEL_UNIT, // 2px
  xs: PIXEL_UNIT, // 4px
  sm: PIXEL_UNIT * 2, // 8px
  md: PIXEL_UNIT * 3, // 12px
  lg: PIXEL_UNIT * 4, // 16px
  xl: PIXEL_UNIT * 6, // 24px
  xxl: PIXEL_UNIT * 8, // 32px
  xxxl: PIXEL_UNIT * 12, // 48px
} as const;

export const PixelBorderWidth = {
  none: 0,
  thin: SUB_PIXEL_UNIT, // 2px
  regular: PIXEL_UNIT, // 4px
  thick: PIXEL_UNIT + SUB_PIXEL_UNIT, // 6px
} as const;

export const PixelShadowOffset = {
  none: { width: 0, height: 0 },
  xs: { width: SUB_PIXEL_UNIT, height: SUB_PIXEL_UNIT }, // 2x2px
  sm: { width: PIXEL_UNIT, height: PIXEL_UNIT }, // 4x4px
  md: { width: PIXEL_UNIT + SUB_PIXEL_UNIT, height: PIXEL_UNIT + SUB_PIXEL_UNIT }, // 6x6px
  lg: { width: PIXEL_UNIT * 2, height: PIXEL_UNIT * 2 }, // 8x8px
} as const;

export const PixelZIndex = {
  base: 1,
  inlineBadge: 10,
  stickyHeader: 50,
  translationPopover: 100,
  figureLightbox: 200,
  modalDialog: 300,
  toast: 400,
} as const;
