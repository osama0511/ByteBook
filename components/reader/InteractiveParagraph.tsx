/**
 * ByteBook — InteractiveParagraph Component
 * - Displays 100% of the book's original verbatim content (NO summarization).
 * - Ultra-compact 28x28px micro pixel action icons (🔊/⏹️, 💡, AR) positioned neatly at the paragraph corner.
 * - Long-press (mobile) / Hover (web) retro tooltips for intuitive accessibility.
 * - Smart header/footer/page-number filtering to eliminate visual clutter.
 */

import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookFigureRecord,
  FigureBadgeInlineToken,
  ParsedContentBlock,
  TokenizedSentenceNode,
  WordInlineToken,
} from '../../services/parser';
import {
  dualTranslationEngine,
  speechService,
} from '../../services/translation';
import { useReaderStore, useThemeStore } from '../../store';
import { PixelBorderWidth, PixelSpacing } from '../../theme/pixelDesignSystem';
import { PixelBadge, PixelButton, PixelFrame } from '../pixel-ui';
import { InlineFigureCard } from './InlineFigureCard';
import {
  isHeadingBlock,
  isPageMarkerBlock,
  ReflowableBlockBody,
} from './ReflowableReaderView';

export interface InteractiveParagraphProps {
  block: ParsedContentBlock;
  bookFigures: BookFigureRecord[];
  domainContext?: string;
  onWordPress: (
    wordToken: WordInlineToken,
    sentence: TokenizedSentenceNode,
    block: ParsedContentBlock
  ) => void;
  onSentenceLongPress: (
    sentence: TokenizedSentenceNode,
    block: ParsedContentBlock
  ) => void;
  onFigureBadgePress: (
    badgeToken: FigureBadgeInlineToken,
    block: ParsedContentBlock
  ) => void;
  onOpenFigureObject: (
    figure: BookFigureRecord,
    sourceBlock: ParsedContentBlock
  ) => void;
}

/**
 * Smart filter for headers, footers, page numbers and ultra-short non-body lines
 * (e.g. "Thinking About Data Systems | 5", page counters, running headings).
 */
export const isPageHeaderOrFooter = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length < 25) return true;
  if (/^.+\s*\|\s*\d+$/i.test(trimmed)) return true;
  if (/^\d+\s*\|\s*.+$/i.test(trimmed)) return true;
  if (/^page\s+\d+$/i.test(trimmed)) return true;
  return false;
};

export const InteractiveParagraph: React.FC<InteractiveParagraphProps> = ({
  block,
  bookFigures,
  domainContext,
  onWordPress,
  onSentenceLongPress,
  onFigureBadgePress,
  onOpenFigureObject,
}) => {
  const { theme, typography } = useThemeStore();
  const { paragraphTranslations, setParagraphTranslation } = useReaderStore();
  const { colors } = theme;

  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(
    speechService.getActiveId()
  );
  const [activeTooltip, setActiveTooltip] = useState<
    'speak' | 'explain' | 'translate' | null
  >(null);

  useEffect(() => {
    return speechService.subscribe((id) => {
      setActiveSpeechId(id);
    });
  }, []);

  const isThisBlockSpeaking = activeSpeechId === block.id;
  const isHeading = isHeadingBlock(block);
  const isLegacyHeading =
    block.blockType === 'heading' && !isPageMarkerBlock(block);

  const shouldHideMicroToolbar =
    isHeading ||
    isLegacyHeading ||
    isPageMarkerBlock(block) ||
    isPageHeaderOrFooter(block.rawText);

  const paraTransState = paragraphTranslations[block.id];

  const attachedFigures = React.useMemo(() => {
    if (!block.attachedFigureIds || block.attachedFigureIds.length === 0) {
      return [];
    }
    return block.attachedFigureIds
      .map((figId) => bookFigures.find((f) => f.id === figId))
      .filter((f): f is BookFigureRecord => Boolean(f));
  }, [block.attachedFigureIds, bookFigures]);

  const handleTranslateParagraph = async (showTermsNotes: boolean = false) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    if (paraTransState?.translationAr && !paraTransState.isLoading) {
      if (!showTermsNotes && !paraTransState.showSimplified) {
        setParagraphTranslation(block.id, null);
        return;
      }
      if (showTermsNotes && paraTransState.simplifiedConceptAr) {
        setParagraphTranslation(block.id, {
          showSimplified: !paraTransState.showSimplified,
        });
        return;
      }
    }

    setParagraphTranslation(block.id, {
      isLoading: true,
      showSimplified: showTermsNotes,
    });

    const response = await dualTranslationEngine.translateWithContext({
      granularity: 'paragraph',
      selectedText: block.rawText,
      paragraphContext: block.rawText,
      domainContext,
      simplifyConcept: showTermsNotes,
      preCachedTranslationAr: block.cachedTranslationAr,
      preCachedSimplifiedAr: block.cachedSimplifiedConceptAr,
    });

    setParagraphTranslation(block.id, {
      translationAr: response.contextualTranslationAr,
      simplifiedConceptAr:
        response.simplifiedConceptAr ||
        block.cachedSimplifiedConceptAr ||
        `شرح المصطلحات والفكرة: ${response.contextualTranslationAr}`,
      showSimplified: showTermsNotes,
      isLoading: false,
      providerUsed: response.providerUsed,
    });
  };

  return (
    <View style={styles.blockContainer}>
      {/* Main Reflowable Verbatim Book Text */}
      <View
        style={[
          isLegacyHeading ? styles.headingWrap : styles.paragraphWrap,
          isLegacyHeading ? { borderBottomColor: colors.borderOuter } : null,
        ]}
      >
        <ReflowableBlockBody
          block={block}
          onWordPress={onWordPress}
          onSentenceLongPress={onSentenceLongPress}
          onFigureBadgePress={onFigureBadgePress}
        />

        {/* Compact Micro Pixel Toolbar (28x28px Pixel Buttons + Tooltips) */}
        {!shouldHideMicroToolbar && (
          <View style={styles.microToolbarContainer}>
            {/* 1. Translation Micro Button */}
            <View style={styles.microButtonWrapper}>
              {activeTooltip === 'translate' && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.microTooltip,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderOuter,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.pixelBadgeLabel,
                      { color: colors.textPrimary, fontSize: 11 },
                    ]}
                  >
                    {paraTransState?.translationAr
                      ? 'إخفاء الترجمة'
                      : 'ترجمة الفقرة AR'}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel="ترجمة الفقرة"
                style={[
                  styles.microIconButton,
                  {
                    backgroundColor: paraTransState?.translationAr
                      ? colors.surfaceElevated
                      : colors.surfaceInset,
                    borderColor: paraTransState?.translationAr
                      ? colors.accentPrimary
                      : colors.borderOuter,
                  },
                ]}
                onPress={() => handleTranslateParagraph(false)}
                onLongPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                      () => {}
                    );
                  }
                  setActiveTooltip('translate');
                }}
                onPressOut={() => setActiveTooltip(null)}
                // Web hover support
                onHoverIn={() => setActiveTooltip('translate')}
                onHoverOut={() => setActiveTooltip(null)}
              >
                <Text
                  style={[
                    typography.pixelBadgeLabel,
                    {
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: paraTransState?.translationAr
                        ? colors.accentPrimary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  AR
                </Text>
              </Pressable>
            </View>

            {/* 2. Scientific Terms & Concept Explanation Micro Button */}
            <View style={styles.microButtonWrapper}>
              {activeTooltip === 'explain' && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.microTooltip,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderOuter,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.pixelBadgeLabel,
                      { color: colors.textPrimary, fontSize: 11 },
                    ]}
                  >
                    شرح المصطلحات
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel="شرح المصطلحات"
                style={[
                  styles.microIconButton,
                  {
                    backgroundColor: paraTransState?.showSimplified
                      ? colors.surfaceElevated
                      : colors.surfaceInset,
                    borderColor: paraTransState?.showSimplified
                      ? colors.accentGold
                      : colors.borderOuter,
                  },
                ]}
                onPress={() => handleTranslateParagraph(true)}
                onLongPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                      () => {}
                    );
                  }
                  setActiveTooltip('explain');
                }}
                onPressOut={() => setActiveTooltip(null)}
                // Web hover support
                onHoverIn={() => setActiveTooltip('explain')}
                onHoverOut={() => setActiveTooltip(null)}
              >
                <Text style={{ fontSize: 13 }}>💡</Text>
              </Pressable>
            </View>

            {/* 3. Text-to-Speech (TTS) / Stop Micro Button */}
            <View style={styles.microButtonWrapper}>
              {activeTooltip === 'speak' && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.microTooltip,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: isThisBlockSpeaking
                        ? '#FF453A'
                        : colors.borderOuter,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.pixelBadgeLabel,
                      { color: colors.textPrimary, fontSize: 11 },
                    ]}
                  >
                    {isThisBlockSpeaking ? 'إيقاف النطق' : 'قراءة الفقرة'}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel={
                  isThisBlockSpeaking ? 'إيقاف النطق' : 'قراءة الفقرة'
                }
                style={[
                  styles.microIconButton,
                  {
                    backgroundColor: isThisBlockSpeaking
                      ? '#3A1010'
                      : colors.surfaceInset,
                    borderColor: isThisBlockSpeaking
                      ? '#FF453A'
                      : colors.borderOuter,
                  },
                ]}
                onPress={() =>
                  speechService.toggleSpeakEnglish(block.id, block.rawText)
                }
                onLongPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                      () => {}
                    );
                  }
                  setActiveTooltip('speak');
                }}
                onPressOut={() => setActiveTooltip(null)}
                // Web hover support
                onHoverIn={() => setActiveTooltip('speak')}
                onHoverOut={() => setActiveTooltip(null)}
              >
                <Text style={{ fontSize: 13 }}>
                  {isThisBlockSpeaking ? '⏹️' : '🔊'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Inline Verbatim Arabic Translation & Terms Explanation Box */}
      {paraTransState && (
        <PixelFrame
          variant="inset"
          elevation="none"
          padding="md"
          style={styles.inlineTranslationBox}
        >
          {paraTransState.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accentPrimary} />
              <Text
                style={[
                  typography.arabicTranslationBody,
                  { color: colors.textSecondary },
                ]}
              >
                جاري ترجمة الفقرة كاملة بدقة...
              </Text>
            </View>
          ) : (
            <View style={styles.translationStack}>
              <View style={styles.transHeader}>
                <PixelBadge
                  label="الترجمة العربية الكاملة للفقرة"
                  variant="accent"
                />
                <PixelButton
                  label="إغلاق X"
                  size="sm"
                  variant="ghost"
                  onPress={() => setParagraphTranslation(block.id, null)}
                />
              </View>

              <Text
                style={[
                  typography.arabicTranslationBody,
                  { color: colors.textPrimary },
                ]}
              >
                {paraTransState.translationAr}
              </Text>

              {paraTransState.showSimplified &&
              paraTransState.simplifiedConceptAr ? (
                <View
                  style={[
                    styles.simplifiedConceptBox,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.accentGold,
                    },
                  ]}
                >
                  <PixelBadge
                    label="💡 شرح وتوضيح المصطلحات العلمية في الفقرة"
                    variant="gold"
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      typography.arabicTranslationBold,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {paraTransState.simplifiedConceptAr}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </PixelFrame>
      )}

      {/* Separated Book Figures Attached Directly After This Paragraph */}
      {attachedFigures.map((fig) => (
        <InlineFigureCard
          key={fig.id}
          figure={fig}
          onOpenZoom={(f) => onOpenFigureObject(f, block)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  blockContainer: {
    marginBottom: PixelSpacing.xl,
  },
  headingWrap: {
    paddingBottom: PixelSpacing.sm,
    marginBottom: PixelSpacing.sm,
    borderBottomWidth: 2,
  },
  paragraphWrap: {
    gap: PixelSpacing.xs,
  },
  selectedWord: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  inlineFigureBadge: {
    borderWidth: PixelBorderWidth.thin,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 3,
    fontSize: 15,
  },
  microToolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
    zIndex: 10,
  },
  microButtonWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  microIconButton: {
    width: 28,
    height: 28,
    borderRadius: 2,
    borderWidth: PixelBorderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 1,
  },
  microTooltip: {
    position: 'absolute',
    bottom: 34,
    minWidth: 80,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: PixelBorderWidth.thin,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 1,
    elevation: 6,
    zIndex: 999,
  },
  inlineTranslationBox: {
    marginTop: PixelSpacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PixelSpacing.sm,
    paddingVertical: PixelSpacing.xs,
  },
  translationStack: {
    gap: PixelSpacing.sm,
  },
  transHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  simplifiedConceptBox: {
    marginTop: PixelSpacing.xs,
    padding: PixelSpacing.md,
    borderWidth: 2,
  },
});
