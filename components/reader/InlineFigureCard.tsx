/**
 * ByteBook — InlineFigureCard Component
 * Renders separated figures inside an elegant 16-bit Pixel Frame immediately
 * after their associated paragraph, with one-tap access to the Zoom Lightbox.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookFigureRecord } from '../../services/parser';
import { useThemeStore } from '../../store';
import { PixelSpacing } from '../../theme/pixelDesignSystem';
import { PixelBadge, PixelButton, PixelFrame } from '../pixel-ui';
import { PixelFigureDiagram } from './PixelFigureDiagram';

export interface InlineFigureCardProps {
  figure: BookFigureRecord;
  onOpenZoom: (figure: BookFigureRecord) => void;
}

export const InlineFigureCard: React.FC<InlineFigureCardProps> = ({
  figure,
  onOpenZoom,
}) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;
  const [showArabicCaption, setShowArabicCaption] = useState(true);

  return (
    <PixelFrame
      variant="secondary"
      elevation="sm"
      padding="sm"
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <PixelBadge label={`FIG.${figure.figureNumber}`} variant="figure" />
          <Text
            style={[
              typography.pixelBadgeLabel,
              { color: colors.textPrimary, flexShrink: 1 },
            ]}
            numberOfLines={1}
          >
            {figure.title || `Figure ${figure.figureNumber}`}
          </Text>
        </View>
        <PixelButton
          label="تكبير 🔍"
          size="sm"
          variant="accent"
          icon="zoom-in"
          onPress={() => onOpenZoom(figure)}
        />
      </View>

      <Pressable
        onPress={() => onOpenZoom(figure)}
        style={[styles.diagramWrapper, { borderColor: colors.borderOuter }]}
      >
        <PixelFigureDiagram figure={figure} width={330} height={185} />
      </Pressable>

      <View style={styles.captionContainer}>
        <Text
          style={[
            typography.readingParagraph,
            styles.captionEn,
            { color: colors.textSecondary },
          ]}
        >
          {figure.caption}
        </Text>

        {figure.captionAr ? (
          <View style={styles.arCaptionSection}>
            <Pressable
              onPress={() => setShowArabicCaption((prev) => !prev)}
              style={styles.toggleArBtn}
            >
              <Text
                style={[
                  typography.pixelBadgeLabel,
                  { color: colors.accentPrimary },
                ]}
              >
                {showArabicCaption
                  ? '▼ ترجمة وصف الشكل (Caption AR)'
                  : '▶ إظهار ترجمة وصف الشكل'}
              </Text>
            </Pressable>
            {showArabicCaption ? (
              <Text
                style={[
                  typography.arabicTranslationBody,
                  styles.captionAr,
                  { color: colors.textPrimary },
                ]}
              >
                {figure.captionAr}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </PixelFrame>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: PixelSpacing.sm,
    marginBottom: PixelSpacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PixelSpacing.sm,
    gap: PixelSpacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PixelSpacing.xs,
    flex: 1,
  },
  diagramWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#0F1713',
    overflow: 'hidden',
  },
  captionContainer: {
    marginTop: PixelSpacing.sm,
    gap: PixelSpacing.xs,
  },
  captionEn: {
    fontSize: 14,
    lineHeight: 21,
  },
  arCaptionSection: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  toggleArBtn: {
    marginBottom: 2,
  },
  captionAr: {
    fontSize: 14,
    lineHeight: 23,
  },
});
