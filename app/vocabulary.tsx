/**
 * ByteBook — Personal Vocabulary Bank ("بنك مفرداتي")
 * Displays saved English words & technical terms with their contextual Arabic translations,
 * phonetic pronunciation, audio TTS button, original book sentence, and Flashcard Review Mode.
 */

import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PixelBadge,
  PixelButton,
  PixelFrame,
} from '../components/pixel-ui';
import { speechService } from '../services/translation';
import { useLibraryStore, useThemeStore } from '../store';
import { PixelSpacing } from '../theme/pixelDesignSystem';

export default function ByteBookVocabularyScreen() {
  const { theme, typography } = useThemeStore();
  const { vocabulary, initializeLibrary, deleteVocabularyItem } =
    useLibraryStore();
  const { colors } = theme;

  const [flashcardMode, setFlashcardMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  useEffect(() => {
    initializeLibrary();
  }, [initializeLibrary]);

  const activeFlashcard = vocabulary[currentCardIndex] ?? vocabulary[0];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top RPG Header */}
        <PixelFrame variant="secondary" elevation="md" padding="md">
          <View style={styles.headerRow}>
            <PixelButton
              label="عودة"
              size="sm"
              variant="secondary"
              icon="back"
              onPress={() => router.back()}
            />
            <View style={styles.titleCol}>
              <Text
                style={[
                  typography.pixelSectionTitle,
                  { color: colors.accentPrimary },
                ]}
              >
                ⭐ VOCABULARY VAULT // بنك مفرداتي ({vocabulary.length})
              </Text>
              <Text
                style={[
                  typography.arabicTranslationBody,
                  { color: colors.textSecondary, fontSize: 13 },
                ]}
              >
                الكلمات والمصطلحات التخصصية التي حفظتها أثناء قراءة الكتب مع سياقها ونطقها الصوتي
              </Text>
            </View>
            {vocabulary.length > 0 ? (
              <PixelButton
                label={flashcardMode ? 'عرض القائمة 📋' : 'بطاقات المراجعة 🎴'}
                size="sm"
                variant="gold"
                icon="sparkle"
                onPress={() => {
                  setFlashcardMode((prev) => !prev);
                  setIsCardFlipped(false);
                  setCurrentCardIndex(0);
                }}
              />
            ) : null}
          </View>
        </PixelFrame>

        {vocabulary.length === 0 ? (
          <PixelFrame variant="elevated" elevation="sm" padding="lg">
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary, textAlign: 'center' },
              ]}
            >
              لم تقم بحفظ أي مفردة بعد!
            </Text>
            <Text
              style={[
                typography.arabicTranslationBody,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 6,
                },
              ]}
            >
              افتح أي كتاب واضغط على أي كلمة إنجليزية لتظهر لك نافذة الترجمة السياقية، ثم اضغط على زر &ldquo;+ حفظ في بنك مفرداتي&rdquo;.
            </Text>
          </PixelFrame>
        ) : flashcardMode && activeFlashcard ? (
          /* FLASHCARD INTERACTIVE REVIEW MODE */
          <PixelFrame variant="elevated" elevation="lg" padding="lg">
            <View style={styles.flashcardHeader}>
              <PixelBadge
                label={`CARD ${currentCardIndex + 1} OF ${vocabulary.length}`}
                variant="gold"
              />
              <PixelButton
                label="نطق الكلمة 🔊"
                size="sm"
                variant="secondary"
                icon="speaker"
                onPress={() => speechService.speakEnglish(activeFlashcard.word)}
              />
            </View>

            <Pressable
              onPress={() => setIsCardFlipped((f) => !f)}
              style={[
                styles.flashcardBody,
                {
                  backgroundColor: colors.surfaceInset,
                  borderColor: colors.borderOuter,
                },
              ]}
            >
              <Text
                style={[
                  typography.pixelHeroTitle,
                  { color: colors.accentPrimary, fontSize: 22 },
                ]}
              >
                {activeFlashcard.word}
              </Text>
              {activeFlashcard.phonetic ? (
                <Text
                  style={[
                    typography.pixelTerminalStat,
                    { color: colors.accentSecondary },
                  ]}
                >
                  {activeFlashcard.phonetic}
                </Text>
              ) : null}

              {isCardFlipped ? (
                <View style={styles.flippedAnswerBox}>
                  <Text
                    style={[
                      typography.arabicTranslationBold,
                      {
                        color: colors.textPrimary,
                        fontSize: 20,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {activeFlashcard.contextualTranslationAr}
                  </Text>
                  {activeFlashcard.technicalExplanationAr ? (
                    <Text
                      style={[
                        typography.arabicTranslationBody,
                        {
                          color: colors.textSecondary,
                          fontSize: 14,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      {activeFlashcard.technicalExplanationAr}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text
                  style={[
                    typography.arabicTranslationBody,
                    { color: colors.textMuted, marginTop: 12 },
                  ]}
                >
                  [اضغط على البطاقة لإظهار المعنى السياقي بالعربية]
                </Text>
              )}
            </Pressable>

            <View style={styles.flashcardNavRow}>
              <PixelButton
                label="◀ السابقة"
                size="sm"
                variant="secondary"
                flex
                disabled={currentCardIndex === 0}
                onPress={() => {
                  setCurrentCardIndex((i) => Math.max(0, i - 1));
                  setIsCardFlipped(false);
                }}
              />
              <PixelButton
                label={isCardFlipped ? 'إخفاء' : 'كشف الترجمة'}
                size="sm"
                variant="accent"
                flex
                onPress={() => setIsCardFlipped((f) => !f)}
              />
              <PixelButton
                label="التالية ▶"
                size="sm"
                variant="primary"
                flex
                disabled={currentCardIndex >= vocabulary.length - 1}
                onPress={() => {
                  setCurrentCardIndex((i) =>
                    Math.min(vocabulary.length - 1, i + 1)
                  );
                  setIsCardFlipped(false);
                }}
              />
            </View>
          </PixelFrame>
        ) : (
          /* LIST VIEW OF SAVED VOCABULARY */
          vocabulary.map((item) => (
            <PixelFrame
              key={item.id}
              variant="primary"
              elevation="sm"
              padding="md"
            >
              <View style={styles.vocabTopRow}>
                <View style={styles.wordAndPhonetic}>
                  <Text
                    style={[
                      typography.pixelSectionTitle,
                      { color: colors.accentPrimary, fontSize: 17 },
                    ]}
                  >
                    {item.word}
                  </Text>
                  {item.phonetic ? (
                    <Text
                      style={[
                        typography.pixelTerminalStat,
                        { color: colors.accentSecondary },
                      ]}
                    >
                      {item.phonetic}
                    </Text>
                  ) : null}
                  {item.partOfSpeech ? (
                    <PixelBadge label={item.partOfSpeech} variant="gold" />
                  ) : null}
                </View>

                <View style={styles.vocabActionButtons}>
                  <PixelButton
                    label="نطق 🔊"
                    size="sm"
                    variant="secondary"
                    icon="speaker"
                    onPress={() => speechService.speakEnglish(item.word)}
                  />
                  <PixelButton
                    label="حذف"
                    size="sm"
                    variant="danger"
                    icon="trash"
                    onPress={() => deleteVocabularyItem(item.id)}
                  />
                </View>
              </View>

              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.textPrimary, fontSize: 18, marginTop: 6 },
                ]}
              >
                {item.contextualTranslationAr}
              </Text>

              {item.technicalExplanationAr ? (
                <Text
                  style={[
                    typography.arabicTranslationBody,
                    { color: colors.textSecondary, fontSize: 14, marginTop: 2 },
                  ]}
                >
                  💡 {item.technicalExplanationAr}
                </Text>
              ) : null}

              {item.contextSentence ? (
                <View
                  style={[
                    styles.sentenceBox,
                    {
                      backgroundColor: colors.surfaceInset,
                      borderColor: colors.borderInner,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.readingParagraph,
                      {
                        color: colors.textSecondary,
                        fontSize: 14,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    &ldquo;{item.contextSentence}&rdquo;
                  </Text>
                </View>
              ) : null}
            </PixelFrame>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: PixelSpacing.md,
    gap: PixelSpacing.md,
    paddingBottom: PixelSpacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
  titleCol: {
    flex: 1,
    minWidth: 200,
  },
  flashcardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
    marginBottom: PixelSpacing.md,
  },
  flashcardBody: {
    minHeight: 210,
    borderWidth: 2,
    padding: PixelSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PixelSpacing.sm,
    marginBottom: PixelSpacing.md,
  },
  flippedAnswerBox: {
    marginTop: PixelSpacing.sm,
    gap: 6,
    alignItems: 'center',
  },
  flashcardNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  vocabTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
  },
  wordAndPhonetic: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
  },
  vocabActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  sentenceBox: {
    marginTop: PixelSpacing.sm,
    padding: PixelSpacing.sm,
    borderWidth: 1,
  },
});
