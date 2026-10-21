/**
 * ByteBook — 16-Bit RPG Dialog Box / Pixel Modal
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useThemeStore } from '../../store';
import { PixelSpacing } from '../../theme/pixelDesignSystem';
import { PixelButton } from './PixelButton';
import { PixelFrame } from './PixelFrame';

export interface PixelModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'center' | 'bottom';
}

export const PixelModal: React.FC<PixelModalProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  position = 'center',
}) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          position === 'bottom' ? styles.backdropBottom : styles.backdropCenter,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <PixelFrame
          variant="elevated"
          elevation="lg"
          padding="md"
          style={[
            styles.dialogCard,
            position === 'bottom' ? styles.bottomSheetCard : null,
          ]}
        >
          <View
            style={[
              styles.titleBar,
              {
                backgroundColor: colors.backgroundSecondary,
                borderBottomColor: colors.borderOuter,
              },
            ]}
          >
            <View style={styles.titleTextWrap}>
              <Text
                style={[typography.pixelSectionTitle, { color: colors.accentPrimary }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[typography.pixelBadgeLabel, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <PixelButton
              label="ESC"
              size="sm"
              variant="secondary"
              icon="close"
              onPress={onClose}
            />
          </View>
          <View style={styles.contentWrap}>{children}</View>
        </PixelFrame>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 12, 0.76)',
    padding: PixelSpacing.md,
  },
  backdropCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropBottom: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
  },
  bottomSheetCard: {
    maxWidth: 720,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: PixelSpacing.sm,
    marginBottom: PixelSpacing.md,
    borderBottomWidth: 2,
  },
  titleTextWrap: {
    flex: 1,
    marginRight: PixelSpacing.sm,
  },
  contentWrap: {
    width: '100%',
  },
});
