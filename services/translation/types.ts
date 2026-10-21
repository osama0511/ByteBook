/**
 * ByteBook — Multi-Provider Contextual Translation Engine Types
 */

export type TranslationGranularity = 'word' | 'sentence' | 'paragraph';

export type AIProviderType =
  | 'gemini'
  | 'groq'
  | 'free_builtin'
  | 'offline_dictionary';

export interface ContextualTranslationRequest {
  granularity: TranslationGranularity;
  selectedText: string;
  surroundingSentence?: string;
  paragraphContext?: string;
  bookTitle?: string;
  domainContext?: string;
  simplifyConcept?: boolean;
  preCachedTranslationAr?: string;
  preCachedSimplifiedAr?: string;
}

export interface ContextualTranslationResponse {
  selectedText: string;
  granularity: TranslationGranularity;
  /** IPA Phonetic transcription for word pronunciation */
  phonetic?: string;
  /** Primary context-aware Arabic translation */
  contextualTranslationAr: string;
  /** Simplified scientific explanation in Arabic ("تبسيط المفهوم العلمي") */
  simplifiedConceptAr?: string;
  /** General lexical meaning (if word) */
  lexicalMeaningAr?: string;
  /** Part of speech & morphological note */
  partOfSpeech?: string;
  /** Technical or academic explanation in Arabic */
  technicalExplanationAr?: string;
  /** English usage example */
  exampleSentenceEn?: string;
  /** Arabic translation of the example sentence */
  exampleSentenceAr?: string;
  providerUsed: AIProviderType;
  fromCache: boolean;
  timestamp: number;
}
