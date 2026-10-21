/**
 * ByteBook — High-Resolution Pinch-to-Zoom & Interactive Figure Lightbox
 * Opens immediately when tapping any inline [1], Figure 2, or [3] Pixel Badge.
 * Supports multi-level zoom (100% - 300%), native iOS pinch-to-zoom,
 * jumping to the figure's paragraph in the book, and returning to the exact reading line.
 */

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speechService } from '../../services/translation';
import { useReaderStore, useThemeStore } from '../../store';
import { PixelSpacing } from '../../theme/pixelDesignSystem';
import { PixelBadge, PixelButton, PixelFrame } from '../pixel-ui';
import { PixelFigureDiagram } from './PixelFigureDiagram';

export interface FigureLightboxModalProps {
  onJumpToAnchorBlock?: (anchorBlockId: string) => void;
}

export const FigureLightboxModal: React.FC<FigureLightboxModalProps> = ({
  onJumpToAnchorBlock,
}) => {
  const { theme, typography } = useThemeStore();
  const { activeFigure, closeFigureModal } = useReaderStore();
  const { colors } = theme;
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const { width: windowWidth } = useWindowDimensions();

  if (!activeFigure) return null;

  const responsiveBaseWidth = Math.max(240, Math.min(340, windowWidth - 64));
  const baseWidth = Math.round(responsiveBaseWidth * zoomScale);
  const baseHeight = Math.round(200 * zoomScale);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3.0, Number((prev + 0.5).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(1.0, Number((prev - 0.5).toFixed(2))));
  };

  return (
    <Modal
      visible={Boolean(activeFigure)}
      transparent
      animationType="fade"
      onRequestClose={closeFigureModal}
    >
      <SafeAreaView style={styles.backdrop} edges={['top', 'bottom', 'left', 'right']}>
        <PixelFrame variant="elevated" elevation="lg" style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Top Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderBottomColor: colors.borderOuter,
                },
              ]}
            >
              <View style={styles.titleRow}>
                <PixelBadge
                  label={`FIG.${activeFigure.figureNumber}`}
                  variant="figure"
                />
                <Text
                  style={[
                    typography.pixelSectionTitle,
                    { color: colors.textPrimary, flexShrink: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {activeFigure.title || `Figure ${activeFigure.figureNumber}`}
                </Text>
              </View>
              <PixelButton
                label="إغلاق X"
                size="sm"
                variant="danger"
                onPress={closeFigureModal}
              />
            </View>

            {/* Zoom Controls Toolbar */}
            <View style={styles.zoomBar}>
              <View style={styles.zoomButtons}>
                <PixelButton
                  label="-"
                  size="sm"
                  variant="secondary"
                  icon="zoom-out"
                  onPress={handleZoomOut}
                />
                <PixelBadge
                  label={`ZOOM: ${Math.round(zoomScale * 100)}%`}
                  variant="gold"
                />
                <PixelButton
                  label="+"
                  size="sm"
                  variant="secondary"
                  icon="zoom-in"
                  onPress={handleZoomIn}
                />
                <PixelButton
                  label="100%"
                  size="sm"
                  variant="ghost"
                  onPress={() => setZoomScale(1.0)}
                />
                <PixelButton
                  label="250%"
                  size="sm"
                  variant="ghost"
                  onPress={() => setZoomScale(2.5)}
                />
              </View>
              <PixelButton
                label="نطق الوصف"
                size="sm"
                variant="secondary"
                icon="speaker"
                onPress={() => speechService.speakEnglish(activeFigure.caption)}
              />
            </View>

            {/* Pinch-to-Zoom & 2D Pan Viewport */}
            <View
              style={[
                styles.viewportOuter,
                { borderColor: colors.borderOuter },
              ]}
            >
              <ScrollView
                horizontal
                contentContainerStyle={styles.scrollContent}
                maximumZoomScale={4.0}
                minimumZoomScale={1.0}
                showsHorizontalScrollIndicator
                showsVerticalScrollIndicator
              >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                  <PixelFigureDiagram
                    figure={activeFigure}
                    width={baseWidth}
                    height={baseHeight}
                  />
                </ScrollView>
              </ScrollView>
            </View>

            {/* Bilingual Captions */}
            <View
              style={[
                styles.captionBox,
                {
                  backgroundColor: colors.surfaceInset,
                  borderColor: colors.borderOuter,
                },
              ]}
            >
              <Text
                style={[
                  typography.readingParagraph,
                  styles.captionEn,
                  { color: colors.textPrimary },
                ]}
              >
                {activeFigure.caption}
              </Text>
              {activeFigure.captionAr ? (
                <Text
                  style={[
                    typography.arabicTranslationBody,
                    styles.captionAr,
                    { color: colors.accentPrimary },
                  ]}
                >
                  {activeFigure.captionAr}
                </Text>
              ) : null}
            </View>

            {/* Bottom Navigation Actions */}
            <View style={styles.footerActions}>
              {activeFigure.anchorBlockId && onJumpToAnchorBlock ? (
                <PixelButton
                  label="الانتقال لموقع الشكل في الفصل ⤵"
                  size="sm"
                  variant="accent"
                  icon="scroll"
                  flex
                  onPress={() => {
                    const target = activeFigure.anchorBlockId!;
                    closeFigureModal();
                    onJumpToAnchorBlock(target);
                  }}
                />
              ) : null}
              <PixelButton
                label="العودة للقراءة ↩"
                size="sm"
                variant="primary"
                icon="return"
                flex
                onPress={closeFigureModal}
              />
            </View>
          </ScrollView>
        </PixelFrame>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 9, 11, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: PixelSpacing.sm,
  },
  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '94%',
  },
  modalScrollContent: {
    paddingBottom: PixelSpacing.xs,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: PixelSpacing.sm,
    borderBottomWidth: 2,
    marginBottom: PixelSpacing.sm,
    gap: PixelSpacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PixelSpacing.xs,
    flex: 1,
    minWidth: 160,
  },
  zoomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
    marginBottom: PixelSpacing.sm,
  },
  zoomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  viewportOuter: {
    height: 270,
    borderWidth: 2,
    backgroundColor: '#0B110E',
    marginBottom: PixelSpacing.sm,
    overflow: 'hidden',
  },
  scrollContent: {
    minWidth: '100%',
    minHeight: 266,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PixelSpacing.sm,
  },
  captionBox: {
    padding: PixelSpacing.sm,
    borderWidth: 2,
    marginBottom: PixelSpacing.sm,
    gap: 6,
  },
  captionEn: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionAr: {
    fontSize: 15,
    lineHeight: 24,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
});
