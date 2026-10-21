/**
 * ByteBook — PixelFrame Component
 * 16-bit container with sharp stepped borders, 3D inner bevel highlight, and retro hard shadow.
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useThemeStore } from '../../store';
import {
  createPixelBevelEdge,
  createPixelBorder,
  createRetroHardShadow,
  PixelSpacing,
  ShadowElevation,
} from '../../theme/pixelDesignSystem';

export interface PixelFrameProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated' | 'inset';
  elevation?: ShadowElevation;
  bevel?: boolean;
  padding?: keyof typeof PixelSpacing;
  style?: StyleProp<ViewStyle>;
}

export const PixelFrame: React.FC<PixelFrameProps> = ({
  children,
  variant = 'primary',
  elevation = 'sm',
  bevel = true,
  padding = 'md',
  style,
}) => {
  const { theme } = useThemeStore();
  const { colors } = theme;

  const backgroundColor =
    variant === 'elevated'
      ? colors.surfaceElevated
      : variant === 'secondary'
      ? colors.backgroundSecondary
      : variant === 'inset'
      ? colors.surfaceInset
      : colors.backgroundPrimary;

  return (
    <View
      style={[
        styles.outer,
        { backgroundColor },
        createPixelBorder(colors, 'thin', 'primary'),
        createRetroHardShadow(colors, elevation),
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          bevel ? createPixelBevelEdge(colors, variant === 'inset') : null,
          { padding: PixelSpacing[padding] },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  inner: {
    width: '100%',
  },
});
