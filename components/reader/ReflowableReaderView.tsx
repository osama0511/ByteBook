/**
 * ByteBook — ReflowableReaderView (16-Bit Book Layout Protocol)
 * Renders the visual body of a parsed block according to its layout type:
 *   heading_1/2/3 · ordered/unordered list items · tables · code blocks · paragraphs
 * with Pixel-Art styling that follows the active theme palette. Blocks parsed by older versions
 * (no `layout` metadata) transparently fall back to the legacy paragraph / heading rendering.
 * Every word, in every block type, stays tappable (translation) via <RichTokenText/>.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import { ParsedContentBlock, TableCell } from '../../services/parser';
import { useThemeStore } from '../../store';
import {
  createRetroHardShadow,
  PixelSpacing,
} from '../../theme/pixelDesignSystem';
import { PixelFontFamilies } from '../../theme/pixelDesignSystem/typography';
import { RichTokenHandlers, RichTokenText } from './RichTokenText';

const PAGE_MARKER_RE = /^—\s*Page\s+(\d+)\s*—$/i;

export const isPageMarkerBlock = (block: ParsedContentBlock): boolean =>
  PAGE_MARKER_RE.test(block.rawText.trim());

/** Headings (legacy + rich) never show the per-paragraph translate/speak toolbar. */
export const isHeadingBlock = (block: ParsedContentBlock): boolean =>
  block.blockType === 'heading' ||
  block.blockType === 'heading_1' ||
  block.blockType === 'heading_2' ||
  block.blockType === 'heading_3';

interface ReflowableBlockBodyProps extends RichTokenHandlers {
  block: ParsedContentBlock;
}

export const ReflowableBlockBody: React.FC<ReflowableBlockBodyProps> = ({
  block,
  onWordPress,
  onSentenceLongPress,
  onFigureBadgePress,
}) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;
  const layout = block.tokenizedPayload.layout;
  const handlers: RichTokenHandlers = {
    onWordPress,
    onSentenceLongPress,
    onFigureBadgePress,
  };

  const paragraphFontSize =
    (typography.readingParagraph.fontSize as number | undefined) ?? 20;

  /* ------------------------------ Page marker ------------------------------ */
  const pageMarker = block.rawText.trim().match(PAGE_MARKER_RE);
  if (pageMarker) {
    return (
      <View style={styles.pageDividerRow}>
        <View style={[styles.pageDividerLine, { backgroundColor: colors.borderInner }]} />
        <View
          style={[
            styles.pageDividerBadge,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderOuter,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: PixelFontFamilies.pixelUiBold,
              fontSize: 12,
              color: colors.accentSecondary,
            }}
          >
            {`PAGE ${pageMarker[1]}`}
          </Text>
        </View>
        <View style={[styles.pageDividerLine, { backgroundColor: colors.borderInner }]} />
      </View>
    );
  }

  /* -------------------------------- Headings -------------------------------- */
  if (
    block.blockType === 'heading_1' ||
    block.blockType === 'heading_2' ||
    block.blockType === 'heading_3'
  ) {
    const level =
      layout?.headingLevel ??
      (block.blockType === 'heading_1' ? 1 : block.blockType === 'heading_2' ? 2 : 3);
    const headingBase = typography.readingHeading;
    const baseSize = (headingBase.fontSize as number | undefined) ?? 28;
    const scale = level === 1 ? 1.12 : level === 2 ? 0.95 : 0.8;
    const fontSize = Math.round(baseSize * scale);
    const headingStyle: TextStyle = {
      ...headingBase,
      fontSize,
      lineHeight: Math.round(fontSize * 1.35),
      fontWeight: '700',
    };

    if (level === 1) {
      return (
        <View style={styles.h1Wrap}>
          <View style={styles.h1Row}>
            <Text
              style={[
                headingStyle,
                { color: colors.accentPrimary, marginEnd: PixelSpacing.sm },
              ]}
            >
              ❖
            </Text>
            <View style={styles.flexShrink}>
              <RichTokenText
                sentences={block.tokenizedPayload.sentences}
                block={block}
                baseTextStyle={headingStyle}
                color={colors.accentPrimary}
                forceBold
                {...handlers}
              />
            </View>
          </View>
          {/* Double pixel rule: 2px outer + 2px highlight */}
          <View style={[styles.ruleOuter, { backgroundColor: colors.borderOuter }]} />
          <View style={[styles.ruleInner, { backgroundColor: colors.borderHighlight }]} />
        </View>
      );
    }

    return (
      <View style={[styles.hBarRow, level === 2 ? styles.h2Wrap : styles.h3Wrap]}>
        <View style={[styles.hBar, { backgroundColor: colors.accentSecondary }]} />
        <View style={styles.flexShrink}>
          <RichTokenText
            sentences={block.tokenizedPayload.sentences}
            block={block}
            baseTextStyle={headingStyle}
            color={colors.textPrimary}
            forceBold
            {...handlers}
          />
        </View>
      </View>
    );
  }

  /* ---------------------------------- Lists --------------------------------- */
  if (
    block.blockType === 'unordered_list_item' ||
    block.blockType === 'ordered_list_item'
  ) {
    const indent = layout?.indentLevel ?? 0;
    const ordered = block.blockType === 'ordered_list_item';
    const rawMarker = (layout?.listMarker ?? '').trim();
    const markerLabel = ordered
      ? rawMarker.replace(/^(\d)([.)])$/, '0$1$2')
      : '';

    return (
      <View style={[styles.listRow, { paddingStart: indent * PixelSpacing.xl }]}>
        {ordered ? (
          <View
            style={[
              styles.orderedBox,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.borderOuter,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: PixelFontFamilies.pixelUiBold,
                fontSize: 13,
                color: colors.accentPrimary,
              }}
            >
              {markerLabel || '#'}
            </Text>
          </View>
        ) : (
          <View style={styles.bulletBox}>
            <Text
              style={{
                fontSize: Math.round(paragraphFontSize * 0.8),
                lineHeight: typography.readingParagraph.lineHeight,
                color: colors.accentSecondary,
              }}
            >
              {indent === 0 ? '◆' : '▸'}
            </Text>
          </View>
        )}
        {/* Hanging indent: wrapped lines stay inside this column, never under the marker */}
        <View style={styles.flexShrink}>
          <RichTokenText
            sentences={block.tokenizedPayload.sentences}
            block={block}
            baseTextStyle={typography.readingParagraph}
            color={colors.textPrimary}
            {...handlers}
          />
        </View>
      </View>
    );
  }

  /* ---------------------------------- Tables -------------------------------- */
  if (block.blockType === 'table' && layout?.rows && layout.rows.length > 0) {
    return (
      <PixelTable
        block={block}
        rows={layout.rows}
        handlers={handlers}
      />
    );
  }

  /* -------------------------------- Code blocks ------------------------------ */
  if (block.blockType === 'code_block') {
    const codeBase = typography.readingCodeBlock;
    const codeSize = Math.round(((codeBase.fontSize as number | undefined) ?? 20) * 0.9);
    return (
      <View
        style={[
          styles.codeWrap,
          {
            backgroundColor: colors.surfaceInset,
            borderColor: colors.borderOuter,
            ...createRetroHardShadow(colors, 'xs'),
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          <RichTokenText
            sentences={block.tokenizedPayload.sentences}
            block={block}
            baseTextStyle={[
              codeBase,
              {
                fontSize: codeSize,
                lineHeight: Math.round(codeSize * 1.4),
              },
              { whiteSpace: 'pre' } as TextStyle,
            ]}
            color={colors.textPrimary}
            lineMode
            {...handlers}
          />
        </ScrollView>
      </View>
    );
  }

  /* ------- Legacy heading / plain paragraph (also the safe fallback path) ----- */
  const legacyHeading = block.blockType === 'heading';
  return (
    <RichTokenText
      sentences={block.tokenizedPayload.sentences}
      block={block}
      baseTextStyle={
        legacyHeading ? typography.readingHeading : typography.readingParagraph
      }
      color={colors.textPrimary}
      {...handlers}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Retro RPG data table                                                      */
/* -------------------------------------------------------------------------- */

const PixelTable: React.FC<{
  block: ParsedContentBlock;
  rows: TableCell[][];
  handlers: RichTokenHandlers;
}> = ({ block, rows, handlers }) => {
  const { theme, typography } = useThemeStore();
  const { colors } = theme;

  const baseSize =
    (typography.readingParagraph.fontSize as number | undefined) ?? 20;
  const cellFontSize = Math.max(14, Math.round(baseSize * 0.82));
  const charWidth = cellFontSize * 0.55;

  const columnWidths = useMemo(() => {
    const colCount = Math.max(...rows.map((r) => r.length));
    const widths: number[] = [];
    for (let c = 0; c < colCount; c++) {
      let longest = 3;
      for (const row of rows) {
        const len = row[c]?.rawText.length ?? 0;
        // Wrap very long cell text instead of widening the column indefinitely
        longest = Math.max(longest, Math.min(len, 38));
      }
      widths.push(Math.max(92, Math.min(280, Math.round(longest * charWidth + 28))));
    }
    return widths;
  }, [rows, charWidth]);

  const cellTextStyle: TextStyle = {
    ...typography.readingParagraph,
    fontSize: cellFontSize,
    lineHeight: Math.round(cellFontSize * 1.45),
  };

  return (
    <View
      style={[
        styles.tableOuter,
        {
          borderColor: colors.borderOuter,
          backgroundColor: colors.surfaceElevated,
          ...createRetroHardShadow(colors, 'sm'),
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={styles.tableScroll}
      >
        <View>
          {rows.map((row, rIdx) => {
            const isHeader = rIdx === 0;
            return (
              <View
                key={`${block.id}_row_${rIdx}`}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: isHeader ? colors.backgroundSecondary : 'transparent',
                    borderBottomWidth: isHeader ? 2 : rIdx === rows.length - 1 ? 0 : 1,
                    borderBottomColor: colors.borderOuter,
                  },
                ]}
              >
                {columnWidths.map((w, cIdx) => {
                  const cell = row[cIdx];
                  return (
                    <View
                      key={`${block.id}_cell_${rIdx}_${cIdx}`}
                      style={[
                        styles.tableCell,
                        {
                          width: w,
                          borderRightWidth: cIdx === columnWidths.length - 1 ? 0 : 1,
                          borderRightColor: colors.borderInner,
                        },
                      ]}
                    >
                      {cell && cell.sentences.length > 0 ? (
                        <RichTokenText
                          sentences={cell.sentences}
                          block={block}
                          baseTextStyle={cellTextStyle}
                          color={colors.textPrimary}
                          forceBold={cell.isHeader}
                          {...handlers}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flexShrink: {
    flexShrink: 1,
    flex: 1,
    minWidth: 0,
  },
  pageDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PixelSpacing.sm,
    paddingVertical: PixelSpacing.xs,
  },
  pageDividerLine: {
    flex: 1,
    height: 2,
  },
  pageDividerBadge: {
    borderWidth: 2,
    paddingHorizontal: PixelSpacing.sm,
    paddingVertical: 2,
  },
  h1Wrap: {
    marginTop: PixelSpacing.lg,
    marginBottom: PixelSpacing.sm,
  },
  h1Row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: PixelSpacing.sm,
  },
  ruleOuter: {
    height: 2,
    width: '100%',
  },
  ruleInner: {
    height: 2,
    width: '100%',
    marginTop: 2,
  },
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: PixelSpacing.sm,
  },
  h2Wrap: {
    marginTop: PixelSpacing.md,
  },
  h3Wrap: {
    marginTop: PixelSpacing.sm,
  },
  hBar: {
    width: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: PixelSpacing.sm,
  },
  orderedBox: {
    minWidth: 38,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 2,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bulletBox: {
    width: 22,
    alignItems: 'center',
  },
  codeWrap: {
    borderWidth: 2,
    borderRadius: 0,
    padding: PixelSpacing.sm,
    marginRight: 4,
  },
  tableOuter: {
    borderWidth: 2,
    borderRadius: 0,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginRight: 6,
    marginBottom: 6,
  },
  tableScroll: {
    flexGrow: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    paddingHorizontal: PixelSpacing.sm,
    paddingVertical: PixelSpacing.sm,
    justifyContent: 'center',
  },
});
