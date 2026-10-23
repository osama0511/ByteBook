/**
 * ByteBook — RPG Dialog Box / Pixel Bottom Sheet for Word & Sentence Translation
 * Features:
 * - Distinct, mutually exclusive views: Technical Translation (`translate`) vs. Concept Simplification (`explain`).
 * - Never echoes or repeats verbatim translation inside the conceptual explanation box.
 * - Reactive "⏹️ إيقاف النطق" speech buttons and one-click vocabulary saving.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  dualTranslationEngine,
  speechService,
} from '../../services/translation';
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
  const [popoverMode, setPopoverMode] = useState<'translate' | 'explain'>('translate');
  const [isFetchingExplain, setIsFetchingExplain] = useState(false);
  const [customExplanation, setCustomExplanation] = useState<string | null>(null);

  useEffect(() => {
    return speechService.subscribe((id) => {
      setActiveSpeechId(id);
    });
  }, []);

  const selectionKey = selection
    ? `${selection.tokenId ?? ''}_${selection.sentenceId ?? ''}`
    : '';
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);

  if (prevSelectionKey !== selectionKey) {
    setPrevSelectionKey(selectionKey);
    setPopoverMode('translate');
    setCustomExplanation(null);
    setIsFetchingExplain(false);
  }

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
      technicalExplanationAr:
        customExplanation || activeTranslation.technicalExplanationAr,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleSelectExplainTab = async () => {
    setPopoverMode('explain');
    if (activeTranslation?.simplifiedConceptAr || customExplanation) return;

    // Fetch concept simplification on demand if not present
    setIsFetchingExplain(true);
    const resp = await dualTranslationEngine.translateWithContext({
      granularity: selection.granularity,
      selectedText: selection.selectedText,
      surroundingSentence: selection.surroundingSentence,
      paragraphContext: selection.paragraphContext,
      mode: 'simplify_explain',
      simplifyConcept: true,
    });
    setIsFetchingExplain(false);
    setCustomExplanation(
      resp.simplifiedConceptAr ||
        resp.technicalExplanationAr ||
        'شرح المفهوم: يوضح هذا المصطلح مبدأ برمجياً تخصصياً في سياق هذا الكتاب.'
    );
  };

  const providerBadgeText =
    activeTranslation?.providerUsed === 'gemini'
      ? 'GEMINI AI'
      : activeTranslation?.providerUsed === 'groq'
      ? 'GROQ LPU'
      : activeTranslation?.providerUsed === 'free_builtin'
      ? 'CLOUD AI'
      : 'OFFLINE LEXICON';

  const explanationContent =
    customExplanation ||
    activeTranslation?.simplifiedConceptAr ||
    activeTranslation?.technicalExplanationAr ||
    'شرح المفهوم: يوضح هذا المصطلح مفهوماً برمجياً أو هندسياً في هذا السياق.';

  return (
    <View style={styles.bottomSheetOverlay}>
      <PixelFrame
        variant="elevated"
        elevation="lg"
        padding="md"
        style={styles.sheetCard}
      >
        {/* RPG Header Row */}
        <View
          style={[
            styles.headerRow,
            { borderBottomColor: colors.borderOuter },
          ]}
        >
          <View style={styles.wordTitleGroup}>
            <PixelBadge
              label={
                selection.granularity === 'word' ? 'كلمة WORD' : 'جملة SENTENCE'
              }
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
              label={isSpeakingWord ? '⏹️ إيقاف' : '🔊 نطق'}
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

        {/* Mutually Exclusive Segmented Tabs: Translation vs Explanation */}
        <View style={styles.tabToggleRow}>
          <PixelButton
            label="الترجمة السياقية 🌐"
            size="sm"
            variant={popoverMode === 'translate' ? 'primary' : 'secondary'}
            flex
            onPress={() => setPopoverMode('translate')}
          />
          <PixelButton
            label="💡 شرح وتبسيط المفهوم"
            size="sm"
            variant={popoverMode === 'explain' ? 'gold' : 'secondary'}
            flex
            onPress={handleSelectExplainTab}
          />
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
              جاري تحليل السياق التخصصي...
            </Text>
          </View>
        ) : activeTranslation ? (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. TRANSLATE MODE (Strictly no conceptual explanation) */}
            {popoverMode === 'translate' && (
              <>
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
              </>
            )}

            {/* 2. EXPLAIN MODE (Strictly conceptual explanation, no verbatim translation) */}
            {popoverMode === 'explain' && (
              <View
                style={[
                  styles.explanationContainerBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.accentGold,
                  },
                ]}
              >
                <View style={styles.providerMetaRow}>
                  <PixelBadge
                    label="💡 شرح وتبسيط الفكرة العلمية"
                    variant="gold"
                  />
                  <PixelBadge label="CONCEPT TUTOR" variant="muted" />
                </View>

                {isFetchingExplain ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.accentGold} />
                    <Text
                      style={[
                        typography.arabicTranslationBody,
                        { color: colors.textSecondary },
                      ]}
                    >
                      جاري تبسيط وشرح المفهوم العلمي...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      typography.arabicTranslationBold,
                      styles.explanationText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {explanationContent}
                  </Text>
                )}
              </View>
            )}

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
    marginBottom: PixelSpacing.xs,
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
  tabToggleRow: {
    flexDirection: 'row',
    gap: PixelSpacing.xs,
    marginBottom: PixelSpacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PixelSpacing.sm,
    paddingVertical: PixelSpacing.md,
  },
  scrollBody: {
    maxHeight: 250,
  },
  body: {
    gap: PixelSpacing.sm,
  },
  primaryMeaningBox: {
    padding: PixelSpacing.sm,
    borderWidth: 2,
    gap: 4,
  },
  explanationContainerBox: {
    padding: PixelSpacing.sm,
    borderWidth: 2,
    gap: 6,
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
