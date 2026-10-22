/**
 * ByteBook — Abjad-Style Verbatim Reflowable Reader + Chapter-by-Chapter Engine
 * Features:
 * - Preserves 100% of the book's original verbatim content (NO summarization).
 * - Progressive Chapter-by-Chapter processing ("✓ أنهيت الشابتر") for 1,000+ page books.
 * - Reactive Stop Speech button ("⏹️ إيقاف النطق") both on paragraphs and in the top HUD.
 * - Larger, clearer typography with full control over Font Size, Line Spacing & Themes.
 */

import { FlashList, ViewToken } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PixelBadge,
  PixelButton,
  PixelFrame,
  PixelModal,
  PixelProgressBar,
} from '../../components/pixel-ui';
import {
  FigureLightboxModal,
  InteractiveParagraph,
  PixelFigureDiagram,
  TranslationPopover,
} from '../../components/reader';
import {
  BookFigureRecord,
  FigureBadgeInlineToken,
  isErrorOrPlaceholderParagraph,
  ParsedContentBlock,
  TokenizedSentenceNode,
  WordInlineToken,
} from '../../services/parser';
import {
  dualTranslationEngine,
  speechService,
} from '../../services/translation';
import { useLibraryStore, useReaderStore, useThemeStore } from '../../store';
import {
  PIXEL_THEMES,
  PixelSpacing,
  PixelThemeId,
} from '../../theme/pixelDesignSystem';

export default function ByteBookReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const flashListRef = useRef<any>(null);
  const { width: windowWidth } = useWindowDimensions();
  const galleryDiagramWidth = Math.max(220, Math.min(340, windowWidth - 76));

  const {
    theme,
    themeId,
    setThemeId,
    readingFontSize,
    setReadingFontSize,
    lineHeightMultiplier,
    setLineHeightMultiplier,
    readingFontPreference,
    setReadingFontPreference,
    typography,
  } = useThemeStore();

  const {
    books,
    initializeLibrary,
    updateBookProgress,
    completeChapterAndLoadNext,
    ensureChapterExtracted,
  } = useLibraryStore();

  const {
    activeChapterIndex,
    setActiveBook,
    setActiveChapterIndex,
    selectTextNode,
    setTranslationResult,
    setIsTranslating,
    openFigureModal,
    returnAnchor,
    setReturnAnchor,
  } = useReaderStore();

  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [showFiguresModal, setShowFiguresModal] = useState(false);
  const [visibleBlockIndex, setVisibleBlockIndex] = useState(0);
  const [isExtractingChapter, setIsExtractingChapter] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(
    speechService.getActiveId()
  );

  const { colors } = theme;

  useEffect(() => {
    initializeLibrary();
  }, [initializeLibrary]);

  useEffect(() => {
    const unsub = speechService.subscribe((id) => {
      setActiveSpeechId(id);
    });
    return () => {
      unsub();
      speechService.stop();
    };
  }, []);

  const currentBook = useMemo(() => {
    return books.find((b) => b.id === bookId) ?? books[0] ?? null;
  }, [books, bookId]);

  const activeBookIdInStore = useReaderStore((s) => s.activeBookId);

  useEffect(() => {
    if (currentBook && activeBookIdInStore !== currentBook.id) {
      setActiveBook(currentBook.id, currentBook.currentChapterIndex ?? 0);
    }
  }, [currentBook, activeBookIdInStore, setActiveBook]);

  const currentChapter = useMemo(() => {
    if (!currentBook) return null;
    return (
      currentBook.chapters[activeChapterIndex] ??
      currentBook.chapters[0] ??
      null
    );
  }, [currentBook, activeChapterIndex]);

  const [retriedChapters, setRetriedChapters] = useState<
    Record<string, boolean>
  >({});

  const hasPlaceholderOnly = Boolean(
    currentChapter &&
      currentChapter.blocks.length === 1 &&
      isErrorOrPlaceholderParagraph(currentChapter.blocks[0].rawText)
  );

  const chapterRetryKey = currentBook
    ? `${currentBook.id}_ch_${activeChapterIndex}`
    : '';

  const needsOnDemandExtraction = Boolean(
    currentChapter &&
      (currentChapter.isExtracted === false ||
        (hasPlaceholderOnly &&
          chapterRetryKey &&
          !retriedChapters[chapterRetryKey]))
  );

  // Ensure current chapter is extracted if user jumped to an unextracted or old placeholder PDF chapter
  useEffect(() => {
    if (currentBook && needsOnDemandExtraction && chapterRetryKey) {
      let cancelled = false;
      ensureChapterExtracted(currentBook.id, activeChapterIndex, true).finally(
        () => {
          if (!cancelled) {
            setRetriedChapters((prev) => ({
              ...prev,
              [chapterRetryKey]: true,
            }));
          }
        }
      );
      return () => {
        cancelled = true;
      };
    }
  }, [
    currentBook,
    needsOnDemandExtraction,
    chapterRetryKey,
    activeChapterIndex,
    ensureChapterExtracted,
  ]);

  const computedProgress = useMemo(() => {
    if (!currentBook || !currentChapter) return 0.05;
    const totalChapters = Math.max(1, currentBook.chapters.length);
    const chapterBlocks = Math.max(1, currentChapter.blocks.length);
    const chapterFraction = (visibleBlockIndex + 1) / chapterBlocks;
    return Math.min(
      1,
      Math.max(0.02, (activeChapterIndex + chapterFraction) / totalChapters)
    );
  }, [currentBook, currentChapter, activeChapterIndex, visibleBlockIndex]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ParsedContentBlock>[] }) => {
      if (!currentBook || !currentChapter || viewableItems.length === 0) return;
      const topItem = viewableItems[0];
      if (!topItem?.item) return;

      const blk = topItem.item;
      const blkIdx = blk.blockIndex ?? 0;
      setVisibleBlockIndex(blkIdx);

      const totalChapters = Math.max(1, currentBook.chapters.length);
      const chapterBlocks = Math.max(1, currentChapter.blocks.length);
      const progress = Math.min(
        1,
        Math.max(
          0.02,
          (activeChapterIndex + (blkIdx + 1) / chapterBlocks) / totalChapters
        )
      );

      const snippet = `${blk.rawText.slice(0, 125)}${
        blk.rawText.length > 125 ? '...' : ''
      }`;

      updateBookProgress(
        currentBook.id,
        activeChapterIndex,
        blkIdx,
        progress,
        snippet
      );
    },
    [currentBook, currentChapter, activeChapterIndex, updateBookProgress]
  );

  const handleWordPress = useCallback(
    async (
      wordToken: WordInlineToken,
      sentence: TokenizedSentenceNode,
      block: ParsedContentBlock
    ) => {
      if (!currentBook) return;
      selectTextNode({
        blockId: block.id,
        sentenceId: sentence.sentenceId,
        tokenId: wordToken.id,
        granularity: 'word',
        selectedText: wordToken.text,
        surroundingSentence: sentence.rawSentence,
        paragraphContext: block.rawText,
      });
      setIsTranslating(true);

      const response = await dualTranslationEngine.translateWithContext({
        granularity: 'word',
        selectedText: wordToken.text,
        surroundingSentence: sentence.rawSentence,
        paragraphContext: block.rawText,
        bookTitle: currentBook.title,
        domainContext: currentBook.domainContext,
      });

      setTranslationResult(response);
    },
    [currentBook, selectTextNode, setIsTranslating, setTranslationResult]
  );

  const handleSentenceLongPress = useCallback(
    async (sentence: TokenizedSentenceNode, block: ParsedContentBlock) => {
      if (!currentBook) return;
      selectTextNode({
        blockId: block.id,
        sentenceId: sentence.sentenceId,
        granularity: 'sentence',
        selectedText: sentence.rawSentence,
        surroundingSentence: sentence.rawSentence,
        paragraphContext: block.rawText,
      });
      setIsTranslating(true);

      const response = await dualTranslationEngine.translateWithContext({
        granularity: 'sentence',
        selectedText: sentence.rawSentence,
        surroundingSentence: sentence.rawSentence,
        paragraphContext: block.rawText,
        bookTitle: currentBook.title,
        domainContext: currentBook.domainContext,
      });

      setTranslationResult(response);
    },
    [currentBook, selectTextNode, setIsTranslating, setTranslationResult]
  );

  const handleFigureBadgePress = useCallback(
    (badgeToken: FigureBadgeInlineToken, sourceBlock: ParsedContentBlock) => {
      if (!currentBook) return;
      const matchedFigure =
        currentBook.figures.find((f) => f.id === badgeToken.figureId) ??
        currentBook.figures.find(
          (f) =>
            f.figureNumber.toLowerCase() ===
            badgeToken.figureNumber.toLowerCase()
        ) ?? {
          id: badgeToken.figureId,
          bookId: currentBook.id,
          chapterId: sourceBlock.chapterId,
          figureNumber: badgeToken.figureNumber,
          normalizedKeys: [badgeToken.figureNumber],
          title: `Figure ${badgeToken.figureNumber}`,
          caption: `Figure ${badgeToken.figureNumber} referenced in: "${sourceBlock.rawText.slice(
            0,
            110
          )}..."`,
          localUri: 'schematic://transformer_attention',
          svgDiagramKey: 'transformer_attention',
          anchorBlockId: sourceBlock.id,
        };

      openFigureModal(matchedFigure, {
        blockId: sourceBlock.id,
        blockIndex: sourceBlock.blockIndex,
        chapterIndex: activeChapterIndex,
        snippet: sourceBlock.rawText.slice(0, 55),
      });
    },
    [currentBook, activeChapterIndex, openFigureModal]
  );

  const handleOpenFigureObject = useCallback(
    (figure: BookFigureRecord, sourceBlock: ParsedContentBlock) => {
      openFigureModal(figure, {
        blockId: sourceBlock.id,
        blockIndex: sourceBlock.blockIndex,
        chapterIndex: activeChapterIndex,
        snippet: sourceBlock.rawText.slice(0, 55),
      });
    },
    [activeChapterIndex, openFigureModal]
  );

  const handleJumpToAnchorBlock = useCallback(
    (anchorBlockId: string) => {
      if (!currentBook) return;
      for (let cIdx = 0; cIdx < currentBook.chapters.length; cIdx++) {
        const ch = currentBook.chapters[cIdx];
        const bIdx = ch.blocks.findIndex((b) => b.id === anchorBlockId);
        if (bIdx !== -1) {
          if (cIdx !== activeChapterIndex) {
            setActiveChapterIndex(cIdx);
          }
          setTimeout(() => {
            flashListRef.current?.scrollToIndex({
              index: bIdx,
              animated: true,
            });
          }, 120);
          break;
        }
      }
    },
    [currentBook, activeChapterIndex, setActiveChapterIndex]
  );

  const handleReturnToPreviousLine = useCallback(() => {
    if (!returnAnchor) return;
    const targetChap = returnAnchor.chapterIndex;
    const targetBlkIdx = returnAnchor.blockIndex;

    if (targetChap !== activeChapterIndex) {
      setActiveChapterIndex(targetChap);
    }
    setTimeout(() => {
      flashListRef.current?.scrollToIndex({
        index: targetBlkIdx,
        animated: true,
      });
      setReturnAnchor(null);
    }, 100);
  }, [returnAnchor, activeChapterIndex, setActiveChapterIndex, setReturnAnchor]);

  // "أنهيت الشابتر" Handler: Marks current chapter complete, extracts next chapter's text & images, and navigates!
  const handleCompleteChapterAndNext = async () => {
    if (!currentBook) return;
    speechService.stop();
    setIsExtractingChapter(true);
    try {
      const nextIdx = await completeChapterAndLoadNext(
        currentBook.id,
        activeChapterIndex
      );
      setActiveChapterIndex(nextIdx);
      setVisibleBlockIndex(0);
      setTimeout(() => {
        flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 80);
    } finally {
      setIsExtractingChapter(false);
    }
  };

  if (!currentBook || !currentChapter) {
    return null;
  }

  const hasNextChapter = activeChapterIndex < currentBook.chapters.length - 1;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}
    >
      {/* 1. TOP 16-BIT PIXEL HUD BAR */}
      <View
        style={[
          styles.topHudBar,
          {
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.borderOuter,
          },
        ]}
      >
        <View style={styles.topHudRow}>
          <PixelButton
            label="المكتبة"
            size="sm"
            variant="secondary"
            icon="back"
            onPress={() => {
              speechService.stop();
              router.back();
            }}
          />

          <View style={styles.bookTitleCenter}>
            <Text
              style={[
                typography.pixelBadgeLabel,
                { color: colors.accentPrimary, fontSize: 14 },
              ]}
              numberOfLines={1}
            >
              {currentBook.title}
            </Text>
            <Text
              style={[
                typography.pixelBadgeLabel,
                { color: colors.textSecondary, fontSize: 12 },
              ]}
              numberOfLines={1}
            >
              {`شابتر ${activeChapterIndex + 1} من ${
                currentBook.chapters.length
              }: ${currentChapter.title}`}
            </Text>
          </View>
        </View>

        <View style={styles.topHudActions}>
          {activeSpeechId ? (
            <PixelButton
              label="⏹️ إيقاف"
              size="sm"
              variant="danger"
              icon="close"
              flex
              onPress={() => speechService.stop()}
            />
          ) : null}
          <PixelButton
            label={`🖼️ الصور (${currentBook.figures.length})`}
            size="sm"
            variant="accent"
            flex
            onPress={() => setShowFiguresModal(true)}
          />
          <PixelButton
            label="Aa الخط"
            size="sm"
            variant="gold"
            flex
            onPress={() => setShowAppearanceModal(true)}
          />
          <PixelButton
            label="الشابترات"
            size="sm"
            variant="secondary"
            icon="scroll"
            flex
            onPress={() => setShowChaptersModal(true)}
          />
        </View>

        {/* Return-to-Reading-Line Banner */}
        {returnAnchor ? (
          <View
            style={[
              styles.returnAnchorBanner,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.accentPrimary,
              },
            ]}
          >
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary, fontSize: 15, flex: 1 },
              ]}
              numberOfLines={1}
            >
              📍 السطر السابق: &ldquo;{returnAnchor.snippet}...&rdquo;
            </Text>
            <PixelButton
              label="العودة للسطر ↩"
              size="sm"
              variant="primary"
              icon="return"
              onPress={handleReturnToPreviousLine}
            />
            <PixelButton
              label="X"
              size="sm"
              variant="ghost"
              onPress={() => setReturnAnchor(null)}
            />
          </View>
        ) : null}
      </View>

      {/* 2. VIRTUALIZED REFLOWABLE READER VIEWPORT (@shopify/flash-list) */}
      <View style={styles.readerViewport}>
        {isExtractingChapter || needsOnDemandExtraction ? (
          <View style={styles.extractingBox}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary, marginTop: 12 },
              ]}
            >
              جاري استخراج وتحليل نصوص وصور هذا الشابتر بالكامل (دون أي تلخيص)...
            </Text>
          </View>
        ) : (
          <FlashList
            style={styles.flashList}
            ref={flashListRef}
            data={currentChapter.blocks}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
            contentContainerStyle={styles.flashListContent}
            ListHeaderComponent={
              <View
                style={[
                  styles.chapterBannerBox,
                  {
                    backgroundColor: colors.surfaceInset,
                    borderColor: colors.borderOuter,
                  },
                ]}
              >
                <View style={styles.chapterBannerMeta}>
                  <PixelBadge
                    label={`CHAPTER ${activeChapterIndex + 1} / ${
                      currentBook.chapters.length
                    }${currentChapter.isCompleted ? ' ✓ مكتمل' : ''}`}
                    variant={currentChapter.isCompleted ? 'accent' : 'gold'}
                  />
                  {currentBook.format === 'pdf' ? (
                    <PixelButton
                      label="📐 إعادة تحليل تنسيق الفصل (Re-parse Layout)"
                      size="sm"
                      variant="secondary"
                      icon="sparkle"
                      onPress={async () => {
                        setIsExtractingChapter(true);
                        await ensureChapterExtracted(
                          currentBook.id,
                          activeChapterIndex,
                          true
                        );
                        setIsExtractingChapter(false);
                      }}
                    />
                  ) : (
                    <PixelBadge
                      label="📜 النص الأصلي الكامل للكتاب (بدون أي تلخيص)"
                      variant="muted"
                    />
                  )}
                </View>

                <Text
                  style={[
                    typography.readingHeading,
                    { color: colors.accentPrimary, marginTop: 6 },
                  ]}
                >
                  {currentChapter.title}
                </Text>

                <Text
                  style={[
                    typography.arabicTranslationBody,
                    { color: colors.textSecondary, fontSize: 15, marginTop: 2 },
                  ]}
                >
                  • اضغط على أي كلمة إنجليزية لترجمتها في سياقها وسماع نطقها، أو اضغط على الأرقام المرجعية مثل [1] لفتح الشكل التوضيحي.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <InteractiveParagraph
                block={item}
                bookFigures={currentBook.figures}
                domainContext={currentBook.domainContext}
                onWordPress={handleWordPress}
                onSentenceLongPress={handleSentenceLongPress}
                onFigureBadgePress={handleFigureBadgePress}
                onOpenFigureObject={handleOpenFigureObject}
              />
            )}
            ListFooterComponent={
              <PixelFrame
                variant="secondary"
                elevation="md"
                padding="lg"
                style={styles.chapterCompleteCard}
              >
                <Text
                  style={[
                    typography.arabicTranslationBold,
                    { color: colors.accentPrimary, fontSize: 20 },
                  ]}
                >
                  🏁 وصلت إلى نهاية {currentChapter.title}
                </Text>
                <Text
                  style={[
                    typography.arabicTranslationBody,
                    { color: colors.textSecondary, fontSize: 16, marginTop: 4 },
                  ]}
                >
                  يستخرج البرنامج محتوى الكتاب كل 10 صفحات على حدة (نصاً كاملاً كلمةً بكلمة مع الصور السياقية فقط دون تحويل الصفحات إلى صور). اضغط أدناه لتحليل وفتح الـ 10 صفحات التالية:
                </Text>

                <View style={styles.chapterFooterNav}>
                  {activeChapterIndex > 0 ? (
                    <PixelButton
                      label="◀ الـ 10 صفحات السابقة"
                      size="md"
                      variant="secondary"
                      fullWidth
                      onPress={() => {
                        speechService.stop();
                        setActiveChapterIndex(activeChapterIndex - 1);
                        flashListRef.current?.scrollToOffset({
                          offset: 0,
                          animated: true,
                        });
                      }}
                    />
                  ) : null}

                  {hasNextChapter ? (
                    <PixelButton
                      label={`✓ أنهيت هذا الجزء — تحليل وفتح الـ 10 صفحات التالية (الجزء ${
                        activeChapterIndex + 2
                      }) ▶`}
                      size="lg"
                      variant="primary"
                      icon="check"
                      fullWidth
                      onPress={handleCompleteChapterAndNext}
                    />
                  ) : (
                    <PixelButton
                      label="✓ أنهيت الجزء الأخير من الكتاب بالكامل 🎉"
                      size="lg"
                      variant="gold"
                      icon="check"
                      fullWidth
                      onPress={handleCompleteChapterAndNext}
                    />
                  )}
                </View>
              </PixelFrame>
            }
          />
        )}

        {/* Bottom RPG Dialog Box for Word/Sentence Contextual Translation */}
        <TranslationPopover />
      </View>

      {/* 3. BOTTOM 16-BIT PIXEL STATUS & PROGRESS BAR */}
      <View
        style={[
          styles.bottomHudBar,
          {
            backgroundColor: colors.backgroundSecondary,
            borderTopColor: colors.borderOuter,
          },
        ]}
      >
        <View style={styles.bottomProgressWrap}>
          <PixelProgressBar
            progress={computedProgress}
            segments={18}
            height={14}
            label={`شابتر ${activeChapterIndex + 1}/${
              currentBook.chapters.length
            } • فقرة ${visibleBlockIndex + 1}/${Math.max(
              1,
              currentChapter.blocks.length
            )}`}
          />
        </View>
        <PixelButton
          label="بنك مفرداتي"
          size="sm"
          variant="gold"
          icon="vocab"
          onPress={() => {
            speechService.stop();
            router.push('/vocabulary');
          }}
        />
      </View>

      {/* 4. HIGH-RES PINCH-TO-ZOOM FIGURE LIGHTBOX MODAL */}
      <FigureLightboxModal onJumpToAnchorBlock={handleJumpToAnchorBlock} />

      {/* 5. APPEARANCE, TYPOGRAPHY & ILLUMINATION CONTROLS MODAL */}
      <PixelModal
        visible={showAppearanceModal}
        title="إعدادات حجم الخط والإضاءة"
        subtitle="REFLOWABLE TYPOGRAPHY & PAPER MODES"
        onClose={() => setShowAppearanceModal(false)}
      >
        <View style={styles.modalSectionStack}>
          {/* Illumination Modes */}
          <View style={styles.controlGroup}>
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary },
              ]}
            >
              1. وضع الإضاءة ولون الورق:
            </Text>
            <View style={styles.rowWrap}>
              {(Object.keys(PIXEL_THEMES) as PixelThemeId[]).map((id) => (
                <PixelButton
                  key={id}
                  label={PIXEL_THEMES[id].nameAr}
                  size="sm"
                  variant={themeId === id ? 'primary' : 'secondary'}
                  icon={
                    id === 'night_phosphor'
                      ? 'moon'
                      : id === 'aged_paper'
                      ? 'scroll'
                      : 'sun'
                  }
                  onPress={() => setThemeId(id)}
                />
              ))}
            </View>
          </View>

          {/* Font Family Toggle */}
          <View style={styles.controlGroup}>
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary },
              ]}
            >
              2. نوع خط نص الكتاب:
            </Text>
            <View style={styles.rowWrap}>
              <PixelButton
                label="خط القراءة المريح الواضح (Literata Serif)"
                size="sm"
                variant={
                  readingFontPreference === 'serif_comfortable'
                    ? 'accent'
                    : 'secondary'
                }
                onPress={() => setReadingFontPreference('serif_comfortable')}
              />
              <PixelButton
                label="خط البكسل الكلاسيكي الكبير (VT323)"
                size="sm"
                variant={
                  readingFontPreference === 'pixel_retro'
                    ? 'accent'
                    : 'secondary'
                }
                onPress={() => setReadingFontPreference('pixel_retro')}
              />
            </View>
          </View>

          {/* Font Size Control */}
          <View style={styles.controlGroup}>
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary },
              ]}
            >
              3. حجم الخط ({readingFontSize}px):
            </Text>
            <View style={styles.rowWrap}>
              <PixelButton
                label="تصغير A-"
                size="md"
                variant="secondary"
                onPress={() => setReadingFontSize(readingFontSize - 2)}
              />
              <PixelBadge label={`${readingFontSize} PX`} variant="gold" />
              <PixelButton
                label="تكبير A+"
                size="md"
                variant="primary"
                onPress={() => setReadingFontSize(readingFontSize + 2)}
              />
            </View>
          </View>

          {/* Line Height Spacing Control */}
          <View style={styles.controlGroup}>
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.textPrimary },
              ]}
            >
              4. تباعد الأسطر ({lineHeightMultiplier}x):
            </Text>
            <View style={styles.rowWrap}>
              {[1.5, 1.7, 1.9, 2.15].map((mult) => (
                <PixelButton
                  key={mult}
                  label={`${mult}x`}
                  size="sm"
                  variant={
                    Math.abs(lineHeightMultiplier - mult) < 0.05
                      ? 'primary'
                      : 'secondary'
                  }
                  onPress={() => setLineHeightMultiplier(mult)}
                />
              ))}
            </View>
          </View>
        </View>
      </PixelModal>

      {/* 6. CHAPTERS TABLE OF CONTENTS MODAL */}
      <PixelModal
        visible={showChaptersModal}
        title="فهرس الشابترات (شابتر بشابتر)"
        subtitle={`${currentBook.chapters.length} CHAPTERS`}
        onClose={() => setShowChaptersModal(false)}
      >
        <ScrollView style={{ maxHeight: 380 }}>
          <View style={styles.modalSectionStack}>
            {currentBook.chapters.map((ch, idx) => {
              const statusTag = ch.isCompleted
                ? '✓ مكتمل'
                : ch.isExtracted !== false
                ? `${ch.blocks.length} فقرات جاهزة`
                : 'يُحلل عند الطلب ⚡';

              return (
                <PixelButton
                  key={ch.id}
                  label={`شابتر ${idx + 1}: ${ch.title} [${statusTag}]`}
                  fullWidth
                  variant={
                    idx === activeChapterIndex
                      ? 'primary'
                      : ch.isCompleted
                      ? 'accent'
                      : 'secondary'
                  }
                  onPress={async () => {
                    speechService.stop();
                    setShowChaptersModal(false);
                    setIsExtractingChapter(true);
                    await ensureChapterExtracted(currentBook.id, idx);
                    setActiveChapterIndex(idx);
                    setIsExtractingChapter(false);
                    flashListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: false,
                    });
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </PixelModal>

      {/* 7. BOOK FIGURES & DIAGRAMS GALLERY MODAL */}
      <PixelModal
        visible={showFiguresModal}
        title="معرض الصور والأشكال التوضيحية"
        subtitle={`INTERACTIVE FIGURE INDEX (${currentBook.figures.length})`}
        onClose={() => setShowFiguresModal(false)}
      >
        <ScrollView style={{ maxHeight: 420 }}>
          <View style={styles.modalSectionStack}>
            {currentBook.figures.map((fig) => (
              <PixelFrame
                key={fig.id}
                variant="secondary"
                elevation="xs"
                padding="sm"
              >
                <View style={styles.figGalleryHeader}>
                  <PixelBadge label={`FIG.${fig.figureNumber}`} variant="figure" />
                  <Text
                    style={[
                      typography.pixelBadgeLabel,
                      { color: colors.textPrimary, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {fig.title || `Figure ${fig.figureNumber}`}
                  </Text>
                  <PixelButton
                    label="فحص وتكبير"
                    size="sm"
                    variant="accent"
                    icon="zoom-in"
                    onPress={() => {
                      setShowFiguresModal(false);
                      openFigureModal(fig);
                    }}
                  />
                </View>
                <View style={styles.figGalleryPreview}>
                  <PixelFigureDiagram
                    figure={fig}
                    width={galleryDiagramWidth}
                    height={145}
                  />
                </View>
                <Text
                  style={[
                    typography.readingParagraph,
                    { color: colors.textSecondary, fontSize: 15 },
                  ]}
                  numberOfLines={2}
                >
                  {fig.caption}
                </Text>
              </PixelFrame>
            ))}
          </View>
        </ScrollView>
      </PixelModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topHudBar: {
    paddingHorizontal: PixelSpacing.sm,
    paddingVertical: PixelSpacing.sm,
    borderBottomWidth: 2,
    zIndex: 40,
  },
  topHudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
  },
  bookTitleCenter: {
    flex: 1,
    minWidth: 160,
    alignItems: 'flex-start',
    paddingHorizontal: PixelSpacing.xs,
  },
  topHudActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  returnAnchorBanner: {
    marginTop: PixelSpacing.xs,
    padding: PixelSpacing.xs,
    borderWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  readerViewport: {
    flex: 1,
    position: 'relative',
  },
  extractingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PixelSpacing.xl,
  },
  flashList: {
    flex: 1,
  },
  flashListContent: {
    paddingHorizontal: PixelSpacing.md,
    paddingTop: PixelSpacing.md,
    paddingBottom: 60,
  },
  chapterBannerBox: {
    padding: PixelSpacing.md,
    borderWidth: 2,
    marginBottom: PixelSpacing.lg,
    gap: 8,
  },
  chapterBannerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  chapterCompleteCard: {
    marginTop: PixelSpacing.lg,
    marginBottom: PixelSpacing.xl,
  },
  chapterFooterNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PixelSpacing.sm,
    marginTop: PixelSpacing.md,
  },
  bottomHudBar: {
    paddingHorizontal: PixelSpacing.md,
    paddingVertical: PixelSpacing.sm,
    borderTopWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.sm,
  },
  bottomProgressWrap: {
    flex: 1,
    minWidth: 180,
  },
  modalSectionStack: {
    gap: PixelSpacing.md,
  },
  controlGroup: {
    gap: PixelSpacing.xs,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
  },
  figGalleryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PixelSpacing.xs,
    marginBottom: PixelSpacing.xs,
  },
  figGalleryPreview: {
    alignItems: 'center',
    backgroundColor: '#0F1713',
    marginBottom: PixelSpacing.xs,
    overflow: 'hidden',
  },
});
