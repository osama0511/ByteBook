/**
 * ByteBook — RPG Dialog Box / Pixel Bottom Sheet for Word & Sentence Translation
 * Upgraded with larger, clearer typography and toggleable "⏹️ إيقاف النطق" speech buttons.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { speechService } from '../../services/translation';
import { useLibraryStore, useReaderStore, useThemeStore } from '../../store';
import { PixelSpacing } from '../../theme/pixelDesignSystem';
import { PixelBadge, PixelButton, PixelFrame } from '../pixel-ui';

export const TranslationPopover: React.FC = () => {
  const { theme, typography } = useThemeStore();
  const {
    activeBookId,
    selection,
    activeTranslation,
    isTranslating,
    selectTextNode,
  } = useReaderStore();
  const { vocabulary, saveWordToVocabulary } = useLibraryStore();
  const { colors } = theme;
  const [justSaved, setJustSaved] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(
    speechService.getActiveId()
  );

  useEffect(() => {
    return speechService.subscribe((id) => {
      setActiveSpeechId(id);
    });
  }, []);

  const isAlreadySaved = useMemo(() => {
    if (!selection) return false;
    return vocabulary.some(
      (v) => v.word.toLowerCase() === selection.selectedText.toLowerCase()
    );
  }, [vocabulary, selection]);

  if (!selection) return null;

  const wordSpeechId = `popover_word_${selection.selectedText}`;
  const sentenceSpeechId = `popover_sentence_${selection.blockId}`;
  const isSpeakingWord = activeSpeechId === wordSpeechId;
  const isSpeakingSentence = activeSpeechId === sentenceSpeechId;

  const handleSaveToVocab = async () => {
    if (!activeTranslation) return;
    await saveWordToVocabulary({
      bookId: activeBookId ?? undefined,
      word: selection.selectedText,
      phonetic: activeTranslation.phonetic,
      contextualTranslationAr: activeTranslation.contextualTranslationAr,
      lexicalMeaningAr: activeTranslation.lexicalMeaningAr,
      partOfSpeech: activeTranslation.partOfSpeech,
      contextSentence: selection.surroundingSentence,
      exampleSentenceEn: activeTranslation.exampleSentenceEn,
      technicalExplanationAr: activeTranslation.technicalExplanationAr,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const providerBadgeText =
    activeTranslation?.providerUsed === 'gemini'
      ? 'GEMINI AI'
      : activeTranslation?.providerUsed === 'groq'
      ? 'GROQ LPU'
      : activeTranslation?.providerUsed === 'free_builtin'
      ? 'CLOUD AI'
      : 'OFFLINE LEXICON';

  return (
    <View style={styles.bottomSheetOverlay}>
      <PixelFrame variant="elevated" elevation="lg" padding="md" style={styles.sheetCard}>
        {/* RPG Header Row */}
        <View
          style={[
            styles.headerRow,
            { borderBottomColor: colors.borderOuter },
          ]}
        >
          <View style={styles.wordTitleGroup}>
            <PixelBadge
              label={selection.granularity === 'word' ? 'كلمة WORD' : 'جملة SENTENCE'}
              variant="accent"
            />
            <Text
              style={[
                typography.pixelSectionTitle,
                { color: colors.textPrimary, fontSize: 20 },
              ]}
              numberOfLines={1}
            >
              {selection.selectedText}
            </Text>
            {activeTranslation?.phonetic ? (
              <Text
                style={[
                  typography.pixelTerminalStat,
                  { color: colors.accentSecondary, fontSize: 19 },
                ]}
              >
                {activeTranslation.phonetic}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            <PixelButton
              label={isSpeakingWord ? '⏹️ إيقاف النطق' : '🔊 نطق الكلمة'}
              size="sm"
              variant={isSpeakingWord ? 'danger' : 'secondary'}
              icon={isSpeakingWord ? 'close' : 'speaker'}
              onPress={() =>
                speechService.toggleSpeakEnglish(
                  wordSpeechId,
                  selection.selectedText
                )
              }
            />
            <PixelButton
              label="إغلاق X"
              size="sm"
              variant="danger"
              onPress={() => {
                speechService.stop();
                selectTextNode(null);
              }}
            />
          </View>
        </View>

        {/* Body Content */}
        {isTranslating && !activeTranslation ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accentPrimary} />
            <Text
              style={[
                typography.arabicTranslationBody,
                { color: colors.textSecondary },
              ]}
            >
              جاري تحليل السياق التخصصي وترجمة المفردة...
            </Text>
          </View>
        ) : activeTranslation ? (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Primary Contextual Translation */}
            <View
              style={[
                styles.primaryMeaningBox,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.borderOuter,
                },
              ]}
            >
              <View style={styles.providerMetaRow}>
                {activeTranslation.partOfSpeech ? (
                  <PixelBadge
                    label={activeTranslation.partOfSpeech}
                    variant="gold"
                  />
                ) : null}
                <PixelBadge
                  label={
                    activeTranslation.fromCache
                      ? `⚡ محفوظة (${providerBadgeText})`
                      : providerBadgeText
                  }
                  variant="muted"
                />
              </View>

              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.accentPrimary, fontSize: 21 },
                ]}
              >
                {activeTranslation.contextualTranslationAr}
              </Text>

              {activeTranslation.lexicalMeaningAr ? (
                <Text
                  style={[
                    typography.arabicTranslationBody,
                    { color: colors.textSecondary, fontSize: 16 },
                  ]}
                >
                  المعنى المعجمي العام: {activeTranslation.lexicalMeaningAr}
                </Text>
              ) : null}
            </View>

            {/* Technical Context Explanation */}
            {activeTranslation.technicalExplanationAr ? (
              <Text
                style={[
                  typography.arabicTranslationBody,
                  styles.explanationText,
                  { color: colors.textPrimary },
                ]}
              >
                💡 في هذا السياق: {activeTranslation.technicalExplanationAr}
              </Text>
            ) : null}

            {/* Bilingual Example Sentence */}
            {activeTranslation.exampleSentenceEn ? (
              <View
                style={[
                  styles.exampleBox,
                  {
                    backgroundColor: colors.surfaceInset,
                    borderColor: colors.borderInner,
                  },
                ]}
              >
                <View style={styles.exampleEnRow}>
                  <Text
                    style={[
                      typography.readingParagraph,
                      styles.exampleEn,
                      { color: colors.textPrimary },
                    ]}
                  >
                    &ldquo;{activeTranslation.exampleSentenceEn}&rdquo;
                  </Text>
                </View>
                {activeTranslation.exampleSentenceAr ? (
                  <Text
                    style={[
                      typography.arabicTranslationBody,
                      styles.exampleAr,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {activeTranslation.exampleSentenceAr}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Bottom Action Buttons */}
            <View style={styles.footerRow}>
              <PixelButton
                label={
                  justSaved || isAlreadySaved
                    ? '✓ محفوظة في بنك مفرداتي'
                    : '+ حفظ في بنك مفرداتي'
                }
                size="sm"
                variant={justSaved || isAlreadySaved ? 'accent' : 'gold'}
                icon={justSaved || isAlreadySaved ? 'check' : 'vocab'}
                fullWidth
                onPress={handleSaveToVocab}
              />
              <PixelButton
                label={
                  isSpeakingSentence
                    ? '⏹️ إيقاف نطق الجملة'
                    : '🔊 نطق الجملة كاملة'
                }
                size="sm"
                variant={isSpeakingSentence ? 'danger' : 'secondary'}
                icon={isSpeakingSentence ? 'close' : 'speaker'}
                fullWidth
                onPress={() =>
                  speechService.toggleSpeakEnglish(
                    sentenceSpeechId,
                    selection.surroundingSentence
                  )
                }
              />
            </View>
          </ScrollView>
        ) : null}
      </PixelFrame>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetOverlay: {
    width: '100%',
    padding: PixelSpacing.sm,
    zIndex: 120,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: PixelSpacing.xs,
    marginBottom: PixelSpacing.sm,
    borderBottomWidth: 2,
    gap: PixelSpacing.xs,
  },
  wordTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
    flex: 1,
    minWidth: 160,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PixelSpacing.sm,
    paddingVertical: PixelSpacing.md,
  },
  scrollBody: {
    maxHeight: 240,
  },
  body: {
    gap: PixelSpacing.sm,
  },
  primaryMeaningBox: {
    padding: PixelSpacing.sm,
    borderWidth: 2,
    gap: 4,
  },
  providerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 26,
  },
  exampleBox: {
    padding: PixelSpacing.sm,
    borderWidth: 1,
    gap: 4,
  },
  exampleEnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  exampleEn: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    flex: 1,
  },
  exampleAr: {
    fontSize: 16,
    lineHeight: 25,
  },
  footerRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: PixelSpacing.xs,
    marginTop: PixelSpacing.xs,
    width: '100%',
  },
});
