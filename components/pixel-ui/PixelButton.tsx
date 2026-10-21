/**
 * ByteBook — PixelButton Component
 * Upgraded with responsive mobile-first layout, comfortable touch targets (min 40-48px),
 * text wrapping for long Arabic/English labels, tactile 16-bit press displacement,
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
  flex?: boolean;
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
  flex = false,
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
      ? PixelSpacing.md + 6
      : PixelSpacing.md + 2;

  const paddingVertical =
    size === 'sm'
      ? PixelSpacing.xs + 4
      : size === 'lg'
      ? PixelSpacing.sm + 6
      : PixelSpacing.sm + 4;

  const minHeight = size === 'sm' ? 38 : size === 'lg' ? 50 : 44;

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
      hitSlop={4}
      style={[
        styles.wrapper,
        fullWidth ? styles.fullWidth : null,
        flex ? styles.flexButton : null,
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
            minHeight,
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
              styles.labelText,
              {
                color: textColor,
                fontSize: size === 'sm' ? 14 : size === 'lg' ? 16 : 15,
                lineHeight: size === 'sm' ? 20 : size === 'lg' ? 23 : 21,
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
    maxWidth: '100%',
    flexShrink: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  flexButton: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '46%',
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
    width: '100%',
  },
  iconWrap: {
    marginRight: 6,
    flexShrink: 0,
  },
  labelText: {
    flexShrink: 1,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
