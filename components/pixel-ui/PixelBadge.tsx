/**
 * ByteBook — PixelBadge Component
 * Inline & standalone interactive 8-bit badge used for Figure References (e.g., [FIG.3])
 * and metadata tags.
 */

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useThemeStore } from '../../store';
import { PixelBorderWidth, PixelSpacing } from '../../theme/pixelDesignSystem';

export interface PixelBadgeProps {
  label: string;
  onPress?: () => void;
  variant?: 'figure' | 'accent' | 'gold' | 'muted';
  style?: StyleProp<ViewStyle>;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  label,
  onPress,
  variant = 'figure',
  style,
}) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;

  const bg =
    variant === 'figure'
      ? colors.badgeBackground
      : variant === 'accent'
      ? colors.accentPrimary
      : variant === 'gold'
      ? colors.accentGold
      : colors.surfaceInset;

  const textColor =
    variant === 'figure'
      ? colors.badgeText
      : variant === 'accent'
      ? '#FFFDF7'
      : variant === 'gold'
      ? '#1E140C'
      : colors.textSecondary;

  const borderColor =
    variant === 'figure'
      ? colors.badgeBorder
      : colors.borderOuter;

  const handlePress = () => {
    if (!onPress) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      disabled={!onPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: bg,
          borderColor,
          transform: pressed && onPress ? [{ translateY: 1 }] : undefined,
        },
        style,
      ]}
    >
      <Text style={[typography.pixelBadgeLabel, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: PixelBorderWidth.thin,
    paddingHorizontal: PixelSpacing.xs + 2,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
