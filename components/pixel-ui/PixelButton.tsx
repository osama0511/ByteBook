/**
 * ByteBook — PixelButton Component
 * Upgraded with larger, ultra-clear Arabic & English typography, tactile 16-bit press displacement,
 * and crisp retro hard shadows.
 */

import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useThemeStore } from '../../store';
import {
  createPixelBevelEdge,
  createPixelBorder,
  createRetroHardShadow,
  PixelSpacing,
  SUB_PIXEL_UNIT,
} from '../../theme/pixelDesignSystem';
import { PixelIcon, PixelIconName } from './PixelIcon';

export interface PixelButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'gold' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: PixelIconName;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const [pressed, setPressed] = useState(false);
  const { theme, typography } = useThemeStore();
  const { colors } = theme;

  const bg =
    variant === 'primary'
      ? colors.accentPrimary
      : variant === 'accent'
      ? colors.accentSecondary
      : variant === 'gold'
      ? colors.accentGold
      : variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
      ? colors.backgroundSecondary
      : colors.surfaceElevated;

  const textColor =
    variant === 'primary' || variant === 'accent' || variant === 'danger'
      ? '#FFFDF7'
      : variant === 'gold'
      ? '#1E140C'
      : colors.textPrimary;

  const paddingHorizontal =
    size === 'sm'
      ? PixelSpacing.sm + 4
      : size === 'lg'
      ? PixelSpacing.lg + 4
      : PixelSpacing.md + 4;

  const paddingVertical =
    size === 'sm'
      ? PixelSpacing.xs + 2
      : size === 'lg'
      ? PixelSpacing.md
      : PixelSpacing.sm + 2;

  const handlePressIn = () => {
    setPressed(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.wrapper,
        fullWidth ? styles.fullWidth : null,
        pressed ? styles.pressedOffset : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <View
        style={[
          styles.buttonSurface,
          {
            backgroundColor: bg,
            paddingHorizontal,
            paddingVertical,
          },
          createPixelBorder(colors, 'thin', 'primary'),
          !pressed
            ? createRetroHardShadow(colors, size === 'sm' ? 'xs' : 'sm')
            : null,
          createPixelBevelEdge(colors, pressed),
        ]}
      >
        {icon ? (
          <View style={label ? styles.iconWrap : undefined}>
            <PixelIcon
              name={icon}
              size={size === 'sm' ? 14 : 16}
              color={textColor}
            />
          </View>
        ) : null}
        {label ? (
          <Text
            style={[
              size === 'sm'
                ? typography.pixelBadgeLabel
                : typography.pixelButtonLabel,
              {
                color: textColor,
                fontSize: size === 'sm' ? 14 : size === 'lg' ? 17 : 15,
                lineHeight: size === 'sm' ? 20 : size === 'lg' ? 24 : 22,
              },
            ]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  pressedOffset: {
    transform: [
      { translateX: SUB_PIXEL_UNIT },
      { translateY: SUB_PIXEL_UNIT },
    ],
  },
  buttonSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 6,
  },
  disabled: {
    opacity: 0.45,
  },
});
