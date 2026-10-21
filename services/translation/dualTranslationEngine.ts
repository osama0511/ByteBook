/**
 * ByteBook — Multi-Provider Smart Contextual Translation Engine
 * Supports:
 * 1. Local SQLite & Memory Offline Cache (0ms response, zero API cost)
 * 2. Built-in Technical Lexicon & Demo Book Pre-Cached Translations
 * 3. Google Gemini API (`gemini-2.5-flash` / `gemini-2.0-flash`)
 * 4. GroqCloud API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`)
 * 5. Built-in Free Cloud Translation Service fallback (works immediately without any API key)
 */

import { byteBookDb } from '../../database';
import { SECURE_KEYS, secureVault } from '../../storage';
import { buildContextualTranslationPrompt } from './promptBuilder';
import { TECHNICAL_LEXICON } from './technicalLexicon';
import {
  AIProviderType,
  ContextualTranslationRequest,
  ContextualTranslationResponse,
} from './types';

export class DualTranslationEngine {
  private memoryCache = new Map<string, ContextualTranslationResponse>();

  private buildCacheKey(req: ContextualTranslationRequest): string {
    const cleanTarget = req.selectedText.trim().toLowerCase();
    const contextHash = (req.surroundingSentence ?? '')
      .trim()
      .slice(0, 48)
      .toLowerCase();
    return `${req.granularity}:${cleanTarget}:${contextHash}`;
  }

  private parseJsonSafely(rawText: string): Record<string, any> | null {
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Calls Google Gemini API for deep contextual translation & concept simplification.
   */
  private async translateViaGemini(
    req: ContextualTranslationRequest,
    apiKey: string,
    modelName: string
  ): Promise<ContextualTranslationResponse | null> {
    const model = modelName || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;

    const prompt = buildContextualTranslationPrompt(req);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    const nonThoughtParts = parts.filter(
      (p) => !p?.thought && typeof p?.text === 'string'
    );
    const textOutput =
      nonThoughtParts.length > 0
        ? nonThoughtParts[nonThoughtParts.length - 1].text
        : parts[parts.length - 1]?.text ?? '';
    const parsed = this.parseJsonSafely(textOutput);
    if (!parsed || !parsed.contextualTranslationAr) return null;

    return {
      selectedText: req.selectedText,
      granularity: req.granularity,
      phonetic: parsed.phonetic || undefined,
      contextualTranslationAr: parsed.contextualTranslationAr,
      simplifiedConceptAr: parsed.simplifiedConceptAr || undefined,
      lexicalMeaningAr: parsed.lexicalMeaningAr || undefined,
      partOfSpeech: parsed.partOfSpeech || undefined,
      technicalExplanationAr: parsed.technicalExplanationAr || undefined,
      exampleSentenceEn: parsed.exampleSentenceEn || undefined,
      exampleSentenceAr: parsed.exampleSentenceAr || undefined,
      providerUsed: 'gemini',
      fromCache: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Calls GroqCloud API (OpenAI-compatible endpoint) for ultra-fast LPU contextual translation.
   */
  private async translateViaGroq(
    req: ContextualTranslationRequest,
    apiKey: string,
    modelName: string
  ): Promise<ContextualTranslationResponse | null> {
    const model = modelName || 'llama-3.3-70b-versatile';
    const prompt = buildContextualTranslationPrompt(req);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise bilingual technical translator that outputs strictly valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const textOutput = data?.choices?.[0]?.message?.content ?? '';
    const parsed = this.parseJsonSafely(textOutput);
    if (!parsed || !parsed.contextualTranslationAr) return null;

    return {
      selectedText: req.selectedText,
      granularity: req.granularity,
      phonetic: parsed.phonetic || undefined,
      contextualTranslationAr: parsed.contextualTranslationAr,
      simplifiedConceptAr: parsed.simplifiedConceptAr || undefined,
      lexicalMeaningAr: parsed.lexicalMeaningAr || undefined,
      partOfSpeech: parsed.partOfSpeech || undefined,
      technicalExplanationAr: parsed.technicalExplanationAr || undefined,
      exampleSentenceEn: parsed.exampleSentenceEn || undefined,
      exampleSentenceAr: parsed.exampleSentenceAr || undefined,
      providerUsed: 'groq',
      fromCache: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Built-in Free Cloud Translation Fallback (GTX endpoint) — works out-of-the-box with zero API keys.
   */
  private async translateViaFreeBuiltIn(
    req: ContextualTranslationRequest
  ): Promise<ContextualTranslationResponse | null> {
    try {
      const encoded = encodeURIComponent(req.selectedText.trim());
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&dt=bd&q=${encoded}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      // Extract primary translation segments
      let translated = '';
      if (Array.isArray(data?.[0])) {
        translated = data[0]
          .map((seg: any) => seg?.[0] || '')
          .join('')
          .trim();
      }
      if (!translated) return null;

      // Extract dictionary parts of speech & alternative meanings if available
      let partOfSpeech: string | undefined;
      let lexicalAlternatives: string | undefined;
      if (Array.isArray(data?.[1]) && data[1].length > 0) {
        const firstDict = data[1][0];
        if (firstDict?.[0]) {
          partOfSpeech = String(firstDict[0]).toUpperCase();
        }
        if (Array.isArray(firstDict?.[1])) {
          lexicalAlternatives = firstDict[1].slice(0, 4).join(' ، ');
        }
      }

      // Also translate surrounding sentence if word granularity for richer context
      let exampleSentenceAr: string | undefined;
      if (req.granularity === 'word' && req.surroundingSentence) {
        try {
          const sentUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(
            req.surroundingSentence
          )}`;
          const sentRes = await fetch(sentUrl);
          if (sentRes.ok) {
            const sentData = await sentRes.json();
            if (Array.isArray(sentData?.[0])) {
              exampleSentenceAr = sentData[0]
                .map((s: any) => s?.[0] || '')
                .join('')
                .trim();
            }
          }
        } catch {
          // Optional sentence translation
        }
      }

      return {
        selectedText: req.selectedText,
        granularity: req.granularity,
        phonetic:
          req.granularity === 'word'
            ? `/${req.selectedText.toLowerCase()}/`
            : undefined,
        contextualTranslationAr: translated,
        lexicalMeaningAr: lexicalAlternatives,
        partOfSpeech:
          partOfSpeech ||
          (req.granularity === 'word' ? 'Vocabulary Term' : undefined),
        technicalExplanationAr:
          req.granularity === 'word' && exampleSentenceAr
            ? `ترجمة الجملة السياقية: "${exampleSentenceAr}"`
            : 'تمت الترجمة الفورية عبر المحرك المدمج وحفظت في الذاكرة المحلية.',
        simplifiedConceptAr:
          req.granularity !== 'word'
            ? `المعنى المبسط: ${translated}`
            : undefined,
        exampleSentenceEn:
          req.granularity === 'word' ? req.surroundingSentence : undefined,
        exampleSentenceAr,
        providerUsed: 'free_builtin',
        fromCache: false,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Main entry point: resolves translation from Cache -> Lexicon -> Gemini/Groq -> Free Built-in -> Offline Fallback.
   */
  public async translateWithContext(
    request: ContextualTranslationRequest
  ): Promise<ContextualTranslationResponse> {
    const cacheKey = this.buildCacheKey(request);

    // 1. Check in-memory cache
    const memCached = this.memoryCache.get(cacheKey);
    if (memCached) {
      return { ...memCached, fromCache: true };
    }

    // 2. Check SQLite persistent cache
    const dbCached = await byteBookDb.getCachedTranslation(cacheKey);
    if (dbCached) {
      this.memoryCache.set(cacheKey, dbCached);
      return { ...dbCached, fromCache: true };
    }

    // 3. Check if paragraph has pre-cached demo translation (unless live LLM key is configured & preferred)
    const preferredProvider =
      ((await secureVault.getSecret(
        SECURE_KEYS.PREFERRED_AI_PROVIDER
      )) as AIProviderType) || 'free_builtin';
    const geminiKey = await secureVault.getSecret(SECURE_KEYS.GEMINI_API_KEY);
    const groqKey = await secureVault.getSecret(SECURE_KEYS.GROQ_API_KEY);
    const geminiModel =
      (await secureVault.getSecret(SECURE_KEYS.GEMINI_MODEL_NAME)) ||
      'gemini-2.0-flash';
    const groqModel =
      (await secureVault.getSecret(SECURE_KEYS.GROQ_MODEL_NAME)) ||
      'llama-3.3-70b-versatile';

    // 4. Try user's preferred AI provider if API key is available
    let liveResult: ContextualTranslationResponse | null = null;

    if (preferredProvider === 'gemini' && geminiKey) {
      liveResult = await this.translateViaGemini(
        request,
        geminiKey,
        geminiModel
      ).catch(() => null);
    } else if (preferredProvider === 'groq' && groqKey) {
      liveResult = await this.translateViaGroq(
        request,
        groqKey,
        groqModel
      ).catch(() => null);
    } else if (geminiKey) {
      liveResult = await this.translateViaGemini(
        request,
        geminiKey,
        geminiModel
      ).catch(() => null);
    } else if (groqKey) {
      liveResult = await this.translateViaGroq(
        request,
        groqKey,
        groqModel
      ).catch(() => null);
    }

    if (liveResult) {
      this.memoryCache.set(cacheKey, liveResult);
      await byteBookDb.saveCachedTranslation(cacheKey, liveResult);
      return liveResult;
    }

    // 5. Check built-in Technical Lexicon for words (instant, rich offline metadata)
    if (request.granularity === 'word') {
      const cleanWord = request.selectedText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      const stripSuffixes = [
        cleanWord,
        cleanWord.replace(/s$/, ''),
        cleanWord.replace(/ed$/, ''),
        cleanWord.replace(/ing$/, ''),
      ];
      for (const candidate of stripSuffixes) {
        const lex = TECHNICAL_LEXICON[candidate];
        if (lex) {
          const lexResponse: ContextualTranslationResponse = {
            selectedText: request.selectedText,
            granularity: 'word',
            phonetic: lex.phonetic,
            contextualTranslationAr: lex.contextualTranslationAr,
            lexicalMeaningAr: lex.lexicalMeaningAr,
            partOfSpeech: lex.partOfSpeech,
            technicalExplanationAr: lex.technicalExplanationAr,
            exampleSentenceEn: lex.exampleSentenceEn,
            exampleSentenceAr: lex.exampleSentenceAr,
            providerUsed: 'offline_dictionary',
            fromCache: false,
            timestamp: Date.now(),
          };
          this.memoryCache.set(cacheKey, lexResponse);
          await byteBookDb.saveCachedTranslation(cacheKey, lexResponse);
          return lexResponse;
        }
      }
    }

    // 6. Check if paragraph has pre-cached translation/simplification from Demo Book
    if (
      request.granularity === 'paragraph' &&
      request.preCachedTranslationAr
    ) {
      const demoResponse: ContextualTranslationResponse = {
        selectedText: request.selectedText,
        granularity: 'paragraph',
        contextualTranslationAr: request.preCachedTranslationAr,
        simplifiedConceptAr: request.preCachedSimplifiedAr,
        providerUsed: 'offline_dictionary',
        fromCache: true,
        timestamp: Date.now(),
      };
      this.memoryCache.set(cacheKey, demoResponse);
      return demoResponse;
    }

    // 7. Use Built-in Free Cloud Translation Service
    const freeResult = await this.translateViaFreeBuiltIn(request);
    if (freeResult) {
      this.memoryCache.set(cacheKey, freeResult);
      await byteBookDb.saveCachedTranslation(cacheKey, freeResult);
      return freeResult;
    }

    // 8. Ultimate Offline Fallback
    return {
      selectedText: request.selectedText,
      granularity: request.granularity,
      phonetic:
        request.granularity === 'word'
          ? `/${request.selectedText.toLowerCase()}/`
          : undefined,
      contextualTranslationAr:
        request.preCachedTranslationAr ||
        `ترجمة سياقية لـ "${request.selectedText}" (أنت في وضع عدم الاتصال حالياً — أضف مفتاح Gemini أو Groq أو اتصل بالإنترنت لترجمة الكلمات الجديدة).`,
      simplifiedConceptAr: request.preCachedSimplifiedAr,
      partOfSpeech: request.granularity === 'word' ? 'Technical Term' : undefined,
      providerUsed: 'offline_dictionary',
      fromCache: false,
      timestamp: Date.now(),
    };
  }
}

export const dualTranslationEngine = new DualTranslationEngine();
