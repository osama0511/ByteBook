/**
 * ByteBook — Contextual AI Prompt Builder (Gemini & GroqCloud)
 * Constructs structured JSON prompts with two completely distinct execution pathways:
 * 1. Accurate Technical Translation (`mode: 'translate'`) — High fidelity, no unsolicited commentary.
 * 2. Conceptual Simplification (`mode: 'simplify_explain'`) — Explains the underlying engineering/scientific idea,
 *    strictly forbidden from repeating verbatim translation.
 */

import { ContextualTranslationRequest } from './types';

export const buildContextualTranslationPrompt = (
  request: ContextualTranslationRequest
): string => {
  const domain =
    request.domainContext || 'Computer Science, AI & Technical Literature';
  const sentence = request.surroundingSentence || request.selectedText;
  const paragraph = request.paragraphContext || sentence;

  const isExplanation =
    request.mode === 'simplify_explain' ||
    (Boolean(request.simplifyConcept) && request.mode !== 'translate');

  if (isExplanation) {
    return [
      `You are ByteBook's Principal Computer Science & Engineering Tutor.`,
      `Book Domain: "${domain}".`,
      `Target Granularity: "${request.granularity}".`,
      `Selected Text: "${request.selectedText}".`,
      `Surrounding Sentence: "${sentence}".`,
      `Full Paragraph Context: "${paragraph}".`,
      ``,
      `YOUR PRIMARY MISSION (CONCEPT SIMPLIFICATION & TERMS EXPLANATION):`,
      `لا تقم بترجمة النص حرفياً. مهمتك هي شرح الفكرة العلمية أو التقنية في هذا النص وتبسيط مصطلحاته بأسلوب سلس ومباشر باللغة العربية، مع توضيح المقصود العملي منه كأنك تشرحه لطالب جامعي باختصار ووضوح.`,
      ``,
      `STRICT NEGATIVE CONSTRAINTS:`,
      `- DO NOT output a word-for-word translation in "simplifiedConceptAr".`,
      `- Focus purely on clarifying what the text actually means, how the architecture/algorithm/concept works, and why it is used.`,
      ``,
      `Respond ONLY with a valid JSON object matching this exact schema (no markdown fences, strictly JSON):`,
      `{`,
      `  "simplifiedConceptAr": "شرح الفكرة العلمية والتقنية وتبسيط المصطلحات باللغة العربية دون تكرار الترجمة الحرفية",`,
      `  "technicalExplanationAr": "إضاءة عملية سريعة على المصطلح أو المفهوم في سياق هندسة البرمجيات أو الذكاء الاصطناعي"`,
      `}`,
    ].join('\n');
  }

  // Pure Technical Translation Pathway
  return [
    `You are ByteBook's Principal Bilingual Technical Translator.`,
    `Book Domain: "${domain}".`,
    `Target Granularity: "${request.granularity}".`,
    `Selected Text: "${request.selectedText}".`,
    `Surrounding Sentence: "${sentence}".`,
    `Full Paragraph Context: "${paragraph}".`,
    ``,
    `YOUR PRIMARY MISSION (ACCURATE TECHNICAL TRANSLATION):`,
    `ترجم النص المختار إلى لغة عربية فصحى دقيقة وسليمة تحافظ على المعنى التقني والسياق التخصصي دون إضافة شروحات خارجية أو استطراد.`,
    ``,
    `STRICT NEGATIVE CONSTRAINTS:`,
    `- DO NOT add external explanations, educational lecturing, or conversational filler inside "contextualTranslationAr".`,
    `- Translate with maximum accuracy and natural Arabic syntax.`,
    ``,
    `Respond ONLY with a valid JSON object matching this exact schema (no markdown fences, strictly JSON):`,
    `{`,
    `  "phonetic": "IPA phonetic transcription if word (e.g. /kənˈvɜːrdʒ/), or empty string",`,
    `  "contextualTranslationAr": "ترجمة عربية فصحى دقيقة وسليمة تحافظ على المعنى التقني في هذا السياق المحدد",`,
    `  "lexicalMeaningAr": "المعنى المعجمي العام في القواميس العربية (إن وجد)",`,
    `  "partOfSpeech": "Noun / Verb / Adjective / Technical Term",`,
    `  "exampleSentenceEn": "A practical English example sentence using the word/concept",`,
    `  "exampleSentenceAr": "الترجمة العربية للجملة النموذجية"`,
    `}`,
  ].join('\n');
};
