/**
 * ByteBook — Pixelated Borders & Retro Hard Shadows Generator
 * Zero-blur, crisp-edge geometric styling for iOS and Web/PWA.
 */

import { Platform, ViewStyle } from 'react-native';
import { PixelColorPalette } from './palettes';
import { PixelBorderWidth, PixelShadowOffset } from './tokens';

export type ShadowElevation = 'none' | 'xs' | 'sm' | 'md' | 'lg';

/**
 * Generates a sharp, zero-blur Retro Hard Shadow style.
 */
export const createRetroHardShadow = (
  palette: PixelColorPalette,
  elevation: ShadowElevation = 'sm'
): ViewStyle => {
  const offset = PixelShadowOffset[elevation];
  if (elevation === 'none') {
    return {};
  }

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px 0px 0px ${palette.shadowHard}`,
    };
  }

  return {
    shadowColor: palette.shadowHard,
    shadowOffset: offset,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset.height,
  };
};

/**
 * Generates crisp 16-bit outer borders with zero border-radius.
 */
export const createPixelBorder = (
  palette: PixelColorPalette,
  thickness: keyof typeof PixelBorderWidth = 'thin',
  variant: 'primary' | 'accent' | 'badge' = 'primary'
): ViewStyle => {
  const borderColor =
    variant === 'accent'
      ? palette.accentPrimary
      : variant === 'badge'
      ? palette.badgeBorder
      : palette.borderOuter;

  return {
    borderWidth: PixelBorderWidth[thickness],
    borderColor,
    borderRadius: 0,
    borderStyle: 'solid',
  };
};

/**
 * Generates an inner 3D bevel highlight/shadow frame for 16-bit cards and buttons.
 */
export const createPixelBevelEdge = (
  palette: PixelColorPalette,
  inverted: boolean = false
): ViewStyle => {
  const topLeftColor = inverted ? palette.borderShadow : palette.borderHighlight;
  const bottomRightColor = inverted ? palette.borderHighlight : palette.borderShadow;

  return {
    borderTopWidth: PixelBorderWidth.thin,
    borderLeftWidth: PixelBorderWidth.thin,
    borderRightWidth: PixelBorderWidth.thin,
    borderBottomWidth: PixelBorderWidth.thin,
    borderTopColor: topLeftColor,
    borderLeftColor: topLeftColor,
    borderRightColor: bottomRightColor,
    borderBottomColor: bottomRightColor,
  };
};
