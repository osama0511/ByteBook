/**
 * ByteBook — Digital Pixel Bookshelf & Library Screen
 * Upgraded with:
 * - Larger, clearer Arabic & English typography
 * - Clear explanation of Verbatim Full-Text Reading (NO summarization) & Chapter-by-Chapter processing
 * - Ability to delete imported books & jump directly to any chapter
 */

import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  PixelBadge,
  PixelButton,
  PixelFrame,
  PixelIcon,
  PixelProgressBar,
} from '../components/pixel-ui';
import { bookParserService, ParsedBookBundle } from '../services/parser';
import { assetStorage } from '../storage';
import { useLibraryStore, useReaderStore, useThemeStore } from '../store';
import {
  PIXEL_THEMES,
  PixelSpacing,
  PixelThemeId,
} from '../theme/pixelDesignSystem';

const PixelBookCoverArt: React.FC<{
  book: ParsedBookBundle;
}> = ({ book }) => {
  const accent = book.coverAccentColor || '#C84B31';
  return (
    <View style={[styles.coverArtBox, { borderColor: '#2B1E16' }]}>
      <Svg width={86} height={118} viewBox="0 0 78 106">
        <Rect x="0" y="0" width="78" height="106" fill={accent} />
        <Rect x="0" y="0" width="12" height="106" fill="#1E140C" />
        <Rect x="12" y="0" width="2" height="106" fill="#FFD166" />
        <Rect x="18" y="6" width="52" height="2" fill="#FFD166" />
        <Rect x="18" y="98" width="52" height="2" fill="#FFD166" />
        <Rect
          x="24"
          y="22"
          width="40"
          height="36"
          fill="#141E18"
          stroke="#FFD166"
          strokeWidth="2"
        />
        <Path d="M36 32H52V36H46V48H42V36H36V32Z" fill="#72F1B8" />
        <Rect x="22" y="68" width="44" height="4" fill="#FFFDF7" />
        <Rect x="26" y="76" width="36" height="4" fill="#FFD166" />
        <Rect x="30" y="84" width="28" height="3" fill="#EAE0C8" />
      </Svg>
      <View style={styles.coverFormatTag}>
        <Text style={styles.coverFormatText}>{book.format.toUpperCase()}</Text>
      </View>
    </View>
  );
};

export default function ByteBookLibraryScreen() {
  const {
    theme,
    themeId,
    setThemeId,
    readingFontSize,
    setReadingFontSize,
    typography,
  } = useThemeStore();
  const {
    books,
    vocabulary,
    isImporting,
    importStatusMessage,
    initializeLibrary,
    addOrUpdateBook,
    deleteBook,
    setImportState,
  } = useLibraryStore();
  const { setActiveBook } = useReaderStore();
  const { colors } = theme;

  useEffect(() => {
    initializeLibrary();
  }, [initializeLibrary]);

  const handleOpenBook = (book: ParsedBookBundle) => {
    setActiveBook(book.id, book.currentChapterIndex ?? 0);
    router.push(`/reader/${book.id}`);
  };

  const handleImportBookFile = async () => {
    try {
      setImportState(true, 'جاري فتح مستعرض الملفات...');
      const picked = await assetStorage.pickBookDocument();
      if (!picked) {
        setImportState(false, null);
        return;
      }

      setImportState(
        true,
        `جاري استخراج النص الكامل لكتاب (${picked.name}) وتقسيمه شابتر بشابتر...`
      );
      const parsedBundle = await bookParserService.importBookFromUri(
        picked.uri,
        picked.name
      );
      await addOrUpdateBook(parsedBundle);
      setImportState(false, null);

      handleOpenBook(parsedBundle);
    } catch (err: any) {
      setImportState(
        false,
        `تعذر استيراد الملف: ${err?.message || 'تأكد من صيغة EPUB أو PDF أو TXT'}`
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Top 16-Bit RPG Command Header */}
        <PixelFrame variant="secondary" elevation="md" padding="md">
          <View style={styles.topHeaderRow}>
            <View style={styles.brandGroup}>
              <View style={styles.titleLine}>
                <PixelIcon name="book" size={24} color={colors.accentPrimary} />
                <Text
                  style={[
                    typography.pixelHeroTitle,
                    { color: colors.accentPrimary },
                  ]}
                >
                  BYTEBOOK 16-BIT
                </Text>
              </View>
              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.textPrimary, marginTop: 4, fontSize: 19 },
                ]}
              >
                قارئ الكتب التخصصية الذكي (يعرض النص الكامل للكتاب حرفياً بدون أي تلخيص)
              </Text>
            </View>

            <View style={styles.navButtonsRow}>
              <PixelButton
                label={`بنك مفرداتي (${vocabulary.length})`}
                size="md"
                variant="gold"
                icon="vocab"
                flex
                onPress={() => router.push('/vocabulary')}
              />
              <PixelButton
                label="الإعدادات و AI"
                size="md"
                variant="secondary"
                icon="settings"
                flex
                onPress={() => router.push('/settings')}
              />
            </View>
          </View>

          {/* Illumination & Font Size Quick Bar */}
          <View
            style={[
              styles.themeSwitchBar,
              {
                backgroundColor: colors.surfaceInset,
                borderColor: colors.borderOuter,
              },
            ]}
          >
            <View style={styles.themePills}>
              {(Object.keys(PIXEL_THEMES) as PixelThemeId[]).map((id) => {
                const active = themeId === id;
                return (
                  <PixelButton
                    key={id}
                    label={PIXEL_THEMES[id].nameAr}
                    size="sm"
                    variant={active ? 'primary' : 'ghost'}
                    flex
                    icon={
                      id === 'night_phosphor'
                        ? 'moon'
                        : id === 'aged_paper'
                        ? 'scroll'
                        : 'sun'
                    }
                    onPress={() => setThemeId(id)}
                  />
                );
              })}
            </View>

            <View style={styles.fontSizeQuickRow}>
              <PixelButton
                label="تصغير الخط A-"
                size="sm"
                variant="secondary"
                flex
                onPress={() => setReadingFontSize(readingFontSize - 2)}
              />
              <PixelBadge label={`${readingFontSize}px`} variant="gold" />
              <PixelButton
                label="تكبير الخط A+"
                size="sm"
                variant="accent"
                flex
                onPress={() => setReadingFontSize(readingFontSize + 2)}
              />
            </View>
          </View>
        </PixelFrame>

        {/* Action Banner: Import EPUB / PDF / TXT (Chapter-by-Chapter) */}
        <PixelFrame variant="elevated" elevation="sm" padding="md">
          <View style={styles.importBannerRow}>
            <View style={styles.importTextCol}>
              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.accentSecondary, fontSize: 19 },
                ]}
              >
                📥 استيراد كتاب كامل (EPUB / PDF / TXT) — نظام الشابتر بشابتر
              </Text>
              <Text
                style={[
                  typography.arabicTranslationBody,
                  { color: colors.textSecondary, fontSize: 16 },
                ]}
              >
                • لا يقوم البرنامج بتلخيص الكتاب إطلاقاً، بل يحافظ على نص الكتاب الأصلي كلمةً بكلمة.{'\n'}
                • للكتب الضخمة (1000+ صفحة PDF)، يمسك البرنامج الكتاب شابتر بشابتر لكي لا ينضغط الجهاز؛ وحينما تنهي الشابتر تضغط على &ldquo;أنهيت الشابتر&rdquo; ليتعرف على نصوص وصور الشابتر التالي فوراً.
              </Text>
            </View>
            <PixelButton
              label={
                isImporting
                  ? 'جاري استخراج الشابتر الأول...'
                  : '+ استيراد كتاب جديد'
              }
              variant="primary"
              size="lg"
              icon="upload"
              fullWidth
              disabled={isImporting}
              onPress={handleImportBookFile}
            />
          </View>

          {isImporting || importStatusMessage ? (
            <View style={styles.statusBanner}>
              {isImporting ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : null}
              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.accentPrimary, fontSize: 16 },
                ]}
              >
                {importStatusMessage}
              </Text>
            </View>
          ) : null}
        </PixelFrame>

        {/* Digital Pixel Bookshelf Section */}
        <View style={styles.shelfHeaderRow}>
          <Text
            style={[
              typography.arabicTranslationBold,
              { color: colors.textPrimary, fontSize: 20 },
            ]}
          >
            📚 رف الكتب الرقمي ({books.length})
          </Text>
          <PixelBadge
            label="CHAPTER-BY-CHAPTER VERBATIM ENGINE"
            variant="gold"
          />
        </View>

        {books.map((book) => {
          const currentChapIdx = book.currentChapterIndex ?? 0;
          const currentChapterTitle =
            book.chapters[currentChapIdx]?.title || 'Chapter 1';
          const completedChapters = book.chapters.filter(
            (c) => c.isCompleted
          ).length;

          return (
            <PixelFrame
              key={book.id}
              variant="primary"
              elevation="md"
              padding="md"
              style={styles.bookShelfCard}
            >
              <View style={styles.bookRow}>
                {/* Left: 16-Bit Pixel Cover */}
                <Pressable onPress={() => handleOpenBook(book)}>
                  <PixelBookCoverArt book={book} />
                </Pressable>

                {/* Right: Book Details, XP Bar & Last Paragraph Snippet */}
                <View style={styles.bookInfoCol}>
                  <View style={styles.bookBadgesTop}>
                    <PixelBadge
                      label={`${book.chapters.length} شابترات (${completedChapters} مكتمل ✓)`}
                      variant="muted"
                    />
                    <PixelBadge
                      label={`${book.figures.length} صور وأشكال 🖼️`}
                      variant="figure"
                    />
                    {book.id === 'bytebook_cs_ai_masterpiece' && (
                      <PixelBadge label="★ كتاب تجريبي تفاعلي" variant="gold" />
                    )}
                  </View>

                  <Pressable onPress={() => handleOpenBook(book)}>
                    <Text
                      style={[
                        typography.readingHeading,
                        { color: colors.textPrimary, fontSize: 22 },
                      ]}
                    >
                      {book.title}
                    </Text>
                  </Pressable>

                  <Text
                    style={[
                      typography.pixelBadgeLabel,
                      { color: colors.textSecondary, marginBottom: 6 },
                    ]}
                  >
                    {book.author} • {book.domainContext}
                  </Text>

                  {/* Pixel XP Progress Bar */}
                  <PixelProgressBar
                    progress={book.readingProgress ?? 0.1}
                    label={`التقدم الحالي (${currentChapterTitle.slice(0, 32)})`}
                    segments={16}
                    height={15}
                  />
                </View>
              </View>

              {/* Last Stopped Paragraph Snippet Box */}
              {book.lastReadSnippet ? (
                <View
                  style={[
                    styles.snippetBox,
                    {
                      backgroundColor: colors.surfaceInset,
                      borderColor: colors.borderInner,
                    },
                  ]}
                >
                  <View style={styles.snippetHeader}>
                    <PixelIcon
                      name="bookmark"
                      size={14}
                      color={colors.accentPrimary}
                    />
                    <Text
                      style={[
                        typography.pixelBadgeLabel,
                        { color: colors.accentPrimary },
                      ]}
                    >
                      آخر فقرة توقف عندها القارئ:
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.readingParagraph,
                      styles.snippetText,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    &ldquo;{book.lastReadSnippet}&rdquo;
                  </Text>
                </View>
              ) : null}

              {/* Wooden Pixel Shelf Plank & Action Footer */}
              <View
                style={[
                  styles.bookCardFooter,
                  { borderTopColor: colors.borderOuter },
                ]}
              >
                <View style={styles.chapterQuickPills}>
                  {book.chapters.slice(0, 5).map((ch, idx) => (
                    <PixelButton
                      key={ch.id}
                      label={`شابتر ${idx + 1}${ch.isCompleted ? ' ✓' : ''}`}
                      size="sm"
                      variant={
                        idx === (book.currentChapterIndex ?? 0)
                          ? 'accent'
                          : ch.isCompleted
                          ? 'gold'
                          : 'ghost'
                      }
                      onPress={() => {
                        setActiveBook(book.id, idx);
                        router.push(`/reader/${book.id}`);
                      }}
                    />
                  ))}
                </View>

                <View style={styles.footerRightBtns}>
                  {book.id !== 'bytebook_cs_ai_masterpiece' && (
                    <PixelButton
                      label="حذف"
                      size="sm"
                      variant="danger"
                      icon="trash"
                      onPress={() => deleteBook(book.id)}
                    />
                  )}
                  <PixelButton
                    label="فتح وقراءة الشابتر ▶"
                    size="md"
                    variant="primary"
                    icon="book"
                    flex
                    onPress={() => handleOpenBook(book)}
                  />
                </View>
              </View>
            </PixelFrame>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: PixelSpacing.md,
    gap: PixelSpacing.md,
    paddingBottom: PixelSpacing.xxxl,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: PixelSpacing.md,
  },
  brandGroup: {
    flex: 1,
    minWidth: '100%',
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
  navButtonsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
  themeSwitchBar: {
    marginTop: PixelSpacing.md,
    padding: PixelSpacing.sm,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
  themePills: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: PixelSpacing.xs,
  },
  fontSizeQuickRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  importBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.md,
  },
  importTextCol: {
    flex: 1,
    minWidth: '100%',
    gap: 6,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
    marginTop: PixelSpacing.sm,
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
    marginTop: PixelSpacing.xs,
  },
  bookShelfCard: {
    marginBottom: PixelSpacing.sm,
  },
  bookRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PixelSpacing.md,
    alignItems: 'flex-start',
  },
  coverArtBox: {
    width: 86,
    height: 118,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  coverFormatTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E140C',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  coverFormatText: {
    color: '#FFD166',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  bookInfoCol: {
    flex: 1,
    minWidth: 190,
    gap: 6,
  },
  bookBadgesTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  snippetBox: {
    marginTop: PixelSpacing.md,
    padding: PixelSpacing.sm,
    borderWidth: 1,
    gap: 4,
  },
  snippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  snippetText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bookCardFooter: {
    marginTop: PixelSpacing.md,
    paddingTop: PixelSpacing.sm,
    borderTopWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
  },
  chapterQuickPills: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: PixelSpacing.xs,
  },
  footerRightBtns: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.sm,
  },
});
