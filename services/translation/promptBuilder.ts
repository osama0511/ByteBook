/**
 * ByteBook — Contextual AI Prompt Builder (Gemini & GroqCloud)
 * Constructs structured JSON prompts that inject sentence, paragraph, and book domain context
 * as well as Scientific Concept Simplification ("تبسيط المفهوم العلمي").
 */

import { ContextualTranslationRequest } from './types';

export const buildContextualTranslationPrompt = (
  request: ContextualTranslationRequest
): string => {
  const domain =
    request.domainContext || 'Computer Science, AI & Technical Literature';
  const sentence = request.surroundingSentence || request.selectedText;
  const paragraph = request.paragraphContext || sentence;

  return [
    `You are ByteBook's Principal Bilingual Technical Translator and English/Computer Science Tutor.`,
    `Book Domain: "${domain}".`,
    `Target Granularity: "${request.granularity}".`,
    `Selected Text: "${request.selectedText}".`,
    `Surrounding Sentence: "${sentence}".`,
    `Full Paragraph Context: "${paragraph}".`,
    ``,
    `Respond ONLY with a valid JSON object matching this exact schema (no markdown fences):`,
    `{`,
    `  "phonetic": "IPA phonetic transcription if word (e.g. /kənˈvɜːrdʒ/), or empty string",`,
    `  "contextualTranslationAr": "Fluent, accurate Arabic translation matching the exact technical context",`,
    `  "simplifiedConceptAr": "Clear, intuitive Arabic explanation simplifying the scientific/technical concept for a learner (تبسيط المفهوم العلمي)",`,
    `  "lexicalMeaningAr": "General dictionary meaning in Arabic",`,
    `  "partOfSpeech": "Noun / Verb / Adjective / Technical Term",`,
    `  "technicalExplanationAr": "1-2 sentences in Arabic explaining how this term/sentence functions in this specific context",`,
    `  "exampleSentenceEn": "A practical English example sentence using the word/concept",`,
    `  "exampleSentenceAr": "Arabic translation of the example sentence"`,
    `}`,
  ].join('\n');
};
