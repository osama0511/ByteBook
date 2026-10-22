/**
 * ByteBook — RichTokenText
 * Renders tokenized sentences as nested <Text> nodes while keeping the 3-level interaction model:
 *   • tap a word          → contextual word translation
 *   • long-press a word   → whole-sentence translation
 *   • tap a figure badge  → opens the figure
 * and applying the inline rich styles (bold / italic / underline / code) detected by the parser.
 * Used by paragraphs, headings, list items, table cells and code blocks alike.
 */

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleProp, Text, TextStyle } from 'react-native';
import {
  FigureBadgeInlineToken,
  InlineTextStyle,
  ParsedContentBlock,
  TokenizedSentenceNode,
  WordInlineToken,
} from '../../services/parser';
import { useReaderStore, useThemeStore } from '../../store';
import { PixelBorderWidth } from '../../theme/pixelDesignSystem';
import { PixelFontFamilies } from '../../theme/pixelDesignSystem/typography';

export interface RichTokenHandlers {
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
}

interface RichTokenTextProps extends RichTokenHandlers {
  sentences: TokenizedSentenceNode[];
  block: ParsedContentBlock;
  baseTextStyle: StyleProp<TextStyle>;
  color: string;
  /** Force every token bold (headings / table header cells) */
  forceBold?: boolean;
  /** Code blocks: every sentence is one source line → separate them with "\n" */
  lineMode?: boolean;
}

export const RichTokenText: React.FC<RichTokenTextProps> = ({
  sentences,
  block,
  baseTextStyle,
  color,
  forceBold,
  lineMode,
  onWordPress,
  onSentenceLongPress,
  onFigureBadgePress,
}) => {
  const { theme, typography } = useThemeStore();
  const selection = useReaderStore((s) => s.selection);
  const { colors } = theme;

  const isRetroBody =
    typography.readingParagraph.fontFamily === PixelFontFamilies.pixelTerminal;
  const baseFontSize =
    (typography.readingParagraph.fontSize as number | undefined) ?? 20;

  const getInlineStyle = (
    style: InlineTextStyle | undefined
  ): TextStyle | undefined => {
    const bold = Boolean(style?.bold || forceBold);
    if (!style && !forceBold) return undefined;

    const s: TextStyle = {};
    if (bold) {
      s.fontWeight = '700';
      if (!isRetroBody) s.fontFamily = PixelFontFamilies.readingSerifBold;
    }
    if (style?.italic) {
      s.fontStyle = 'italic';
      if (!isRetroBody && !bold) {
        s.fontFamily = PixelFontFamilies.readingSerifItalic;
      }
    }
    if (style?.underline) {
      s.textDecorationLine = 'underline';
      s.textDecorationStyle = 'solid';
      s.textDecorationColor = colors.accentSecondary;
    }
    if (style?.code) {
      s.fontFamily = PixelFontFamilies.pixelTerminal;
      s.fontSize = Math.round(baseFontSize * 1.05);
      s.backgroundColor = colors.backgroundSecondary;
      s.color = colors.accentPrimary;
      s.borderWidth = 1;
      s.borderColor = colors.borderInner;
    }
    return s;
  };

  return (
    <Text style={[baseTextStyle, { color }]}>
      {sentences.map((sentence, sIdx) => {
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
                      {
                        borderWidth: PixelBorderWidth.thin,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginHorizontal: 3,
                        fontSize: 15,
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

              const inlineStyle = getInlineStyle(token.style);

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
                            inlineStyle,
                            {
                              fontWeight: 'bold',
                              paddingHorizontal: 4,
                              backgroundColor: colors.accentPrimary,
                              color: '#FFFDF7',
                            },
                          ]
                        : inlineStyle
                    }
                  >
                    {token.text}
                  </Text>
                );
              }

              return (
                <Text key={token.id} style={inlineStyle}>
                  {token.text}
                </Text>
              );
            })}
            {lineMode
              ? sIdx < sentences.length - 1
                ? '\n'
                : ''
              : ' '}
          </Text>
        );
      })}
    </Text>
  );
};
