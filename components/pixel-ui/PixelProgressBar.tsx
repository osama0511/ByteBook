/**
 * ByteBook — Segmented 8-Bit XP / Reading Progress Bar
 * Renders discrete retro pixel blocks with percentage & XP styling.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeStore } from '../../store';
import { PixelBorderWidth } from '../../theme/pixelDesignSystem';

export interface PixelProgressBarProps {
  /** Progress between 0 and 1 (or 0 to 100) */
  progress: number;
  segments?: number;
  label?: string;
  showPercentage?: boolean;
  height?: number;
}

export const PixelProgressBar: React.FC<PixelProgressBarProps> = ({
  progress,
  segments = 14,
  label,
  showPercentage = true,
  height = 14,
}) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;

  const normalized = progress > 1 ? Math.min(100, progress) / 100 : Math.max(0, Math.min(1, progress));
  const filledCount = Math.round(normalized * segments);
  const percentText = `${Math.round(normalized * 100)}% XP`;

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.headerRow}>
          {label ? (
            <Text style={[typography.pixelBadgeLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
          ) : <View />}
          {showPercentage && (
            <Text style={[typography.pixelBadgeLabel, { color: colors.accentPrimary }]}>
              {percentText}
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.barOuter,
          {
            height,
            borderColor: colors.borderOuter,
            backgroundColor: colors.surfaceInset,
          },
        ]}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const isFilled = index < filledCount;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor: isFilled
                    ? index === filledCount - 1
                      ? colors.accentGold
                      : colors.accentSecondary
                    : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barOuter: {
    flexDirection: 'row',
    borderWidth: PixelBorderWidth.thin,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: '100%',
  },
});
