/**
 * ByteBook — InteractiveParagraph Component
 * - Displays 100% of the book's original verbatim content (NO summarization).
 * - Larger, clearer typography for effortless reading.
 * - Reactive "🔊 قراءة الفقرة" button that transforms into "⏹️ إيقاف النطق" (Red) while speaking
 *   so the user can stop speech at any instant.
 */

import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  const {
    selection,
    paragraphTranslations,
    setParagraphTranslation,
  } = useReaderStore();
  const { colors } = theme;

  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(
    speechService.getActiveId()
  );

  useEffect(() => {
    return speechService.subscribe((id) => {
      setActiveSpeechId(id);
    });
  }, []);

  const isThisBlockSpeaking = activeSpeechId === block.id;
  const isHeading = block.blockType === 'heading';
  const baseTextStyle = isHeading
    ? typography.readingHeading
    : typography.readingParagraph;

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
          isHeading ? styles.headingWrap : styles.paragraphWrap,
          isHeading ? { borderBottomColor: colors.borderOuter } : null,
        ]}
      >
        <Text style={[baseTextStyle, { color: colors.textPrimary }]}>
          {block.tokenizedPayload.sentences.map((sentence) => {
            const isSentenceSelected =
              selection?.granularity === 'sentence' &&
              selection.sentenceId === sentence.sentenceId;

            return (
              <Text
                key={sentence.sentenceId}
                style={
                  isSentenceSelected
                    ? {
                        backgroundColor: colors.selectionHighlight,
                        color: colors.textPrimary,
                      }
                    : undefined
                }
              >
                {sentence.tokens.map((token) => {
                  if (token.type === 'figure_badge') {
                    return (
                      <Text
                        key={token.id}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium
                            ).catch(() => {});
                          }
                          onFigureBadgePress(token, block);
                        }}
                        style={[
                          typography.pixelBadgeLabel,
                          styles.inlineFigureBadge,
                          {
                            backgroundColor: colors.badgeBackground,
                            color: colors.badgeText,
                            borderColor: colors.badgeBorder,
                          },
                        ]}
                      >
                        {` 🖼️ ${token.badgeLabel} `}
                      </Text>
                    );
                  }

                  if (token.type === 'word') {
                    const isWordSelected =
                      selection?.granularity === 'word' &&
                      selection.tokenId === token.id;

                    return (
                      <Text
                        key={token.id}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.selectionAsync().catch(() => {});
                          }
                          onWordPress(token, sentence, block);
                        }}
                        onLongPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium
                            ).catch(() => {});
                          }
                          onSentenceLongPress(sentence, block);
                        }}
                        style={
                          isWordSelected
                            ? [
                                styles.selectedWord,
                                {
                                  backgroundColor: colors.accentPrimary,
                                  color: '#FFFDF7',
                                },
                              ]
                            : undefined
                        }
                      >
                        {token.text}
                      </Text>
                    );
                  }

                  return <Text key={token.id}>{token.text}</Text>;
                })}
                {' '}
              </Text>
            );
          })}
        </Text>

        {/* Per-Paragraph Interactive Toolbar (Larger, Clearer Buttons + Toggleable Stop Speech) */}
        {!isHeading && (
          <View style={styles.paragraphToolbar}>
            <PixelButton
              label={
                paraTransState?.translationAr
                  ? 'إخفاء الترجمة ▲'
                  : 'ترجمة الفقرة كاملة AR'
              }
              size="sm"
              variant={paraTransState?.translationAr ? 'accent' : 'secondary'}
              icon="translate"
              flex
              onPress={() => handleTranslateParagraph(false)}
            />

            <PixelButton
              label="شرح المصطلحات العلمية 💡"
              size="sm"
              variant={paraTransState?.showSimplified ? 'gold' : 'secondary'}
              icon="sparkle"
              flex
              onPress={() => handleTranslateParagraph(true)}
            />

            <PixelButton
              label={
                isThisBlockSpeaking ? '⏹️ إيقاف النطق' : '🔊 قراءة الفقرة'
              }
              size="sm"
              variant={isThisBlockSpeaking ? 'danger' : 'secondary'}
              icon={isThisBlockSpeaking ? 'close' : 'speaker'}
              flex
              onPress={() =>
                speechService.toggleSpeakEnglish(block.id, block.rawText)
              }
            />
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
    gap: PixelSpacing.sm,
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
  paragraphToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
    marginTop: PixelSpacing.xs,
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
