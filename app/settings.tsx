/**
 * ByteBook — Pixel Settings & On-Device Secure AI Vault Screen
 * Allows the user to configure Gemini API & GroqCloud API keys securely on-device
 * via `expo-secure-store` (or Web storage), choose preferred models, test live translation,
 * and customize reading themes without needing any external server or laptop.
 */

import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PixelBadge,
  PixelButton,
  PixelFrame,
  PixelIcon,
} from '../components/pixel-ui';
import {
  AIProviderType,
  dualTranslationEngine,
} from '../services/translation';
import { SECURE_KEYS, secureVault } from '../storage';
import { useThemeStore } from '../store';
import {
  PIXEL_THEMES,
  PixelSpacing,
  PixelThemeId,
} from '../theme/pixelDesignSystem';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

export default function ByteBookSettingsScreen() {
  const {
    theme,
    themeId,
    setThemeId,
    readingFontSize,
    setReadingFontSize,
    readingFontPreference,
    setReadingFontPreference,
    typography,
  } = useThemeStore();
  const { colors } = theme;

  const [preferredProvider, setPreferredProvider] =
    useState<AIProviderType>('free_builtin');
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const loadSavedSecrets = async () => {
      const savedProvider = await secureVault.getSecret(
        SECURE_KEYS.PREFERRED_AI_PROVIDER
      );
      const savedGeminiKey = await secureVault.getSecret(
        SECURE_KEYS.GEMINI_API_KEY
      );
      const savedGroqKey = await secureVault.getSecret(
        SECURE_KEYS.GROQ_API_KEY
      );
      const savedGeminiModel = await secureVault.getSecret(
        SECURE_KEYS.GEMINI_MODEL_NAME
      );
      const savedGroqModel = await secureVault.getSecret(
        SECURE_KEYS.GROQ_MODEL_NAME
      );

      if (savedProvider) {
        setPreferredProvider(savedProvider as AIProviderType);
      }
      if (savedGeminiKey) setGeminiKey(savedGeminiKey);
      if (savedGroqKey) setGroqKey(savedGroqKey);
      if (savedGeminiModel) setGeminiModel(savedGeminiModel);
      if (savedGroqModel) setGroqModel(savedGroqModel);
    };
    loadSavedSecrets();
  }, []);

  const handleSaveVaultSettings = async () => {
    await secureVault.setSecret(
      SECURE_KEYS.PREFERRED_AI_PROVIDER,
      preferredProvider
    );
    if (geminiKey.trim()) {
      await secureVault.setSecret(SECURE_KEYS.GEMINI_API_KEY, geminiKey.trim());
    } else {
      await secureVault.deleteSecret(SECURE_KEYS.GEMINI_API_KEY);
    }

    if (groqKey.trim()) {
      await secureVault.setSecret(SECURE_KEYS.GROQ_API_KEY, groqKey.trim());
    } else {
      await secureVault.deleteSecret(SECURE_KEYS.GROQ_API_KEY);
    }

    await secureVault.setSecret(SECURE_KEYS.GEMINI_MODEL_NAME, geminiModel);
    await secureVault.setSecret(SECURE_KEYS.GROQ_MODEL_NAME, groqModel);

    setSaveMessage(
      '✓ تم حفظ مفاتيح الـ API والإعدادات بأمان تام داخل SecureStore على جهازك!'
    );
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleTestAiConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    await handleSaveVaultSettings();

    const res = await dualTranslationEngine.translateWithContext({
      granularity: 'word',
      selectedText: 'concurrency',
      surroundingSentence:
        'High-performance distributed systems rely on lock-free concurrency.',
      domainContext: 'Computer Science & Distributed Systems',
    });

    setIsTesting(false);
    setTestResult(
      `[${res.providerUsed.toUpperCase()}] concurrency ➔ ${
        res.contextualTranslationAr
      }`
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <PixelFrame variant="secondary" elevation="md" padding="md">
          <View style={styles.headerRow}>
            <PixelButton
              label="عودة للمكتبة"
              size="sm"
              variant="secondary"
              icon="back"
              onPress={() => router.back()}
            />
            <View style={styles.headerTitleCol}>
              <Text
                style={[
                  typography.pixelSectionTitle,
                  { color: colors.accentPrimary },
                ]}
              >
                ⚙️ PIXEL SETTINGS & AI VAULT
              </Text>
              <Text
                style={[
                  typography.arabicTranslationBody,
                  { color: colors.textSecondary, fontSize: 13 },
                ]}
              >
                إدارة محرك الذكاء الاصطناعي ومفاتيح الـ API المحلية (بدون سيرفر خارجي)
              </Text>
            </View>
          </View>
        </PixelFrame>

        {/* 1. AI Provider Selection */}
        <PixelFrame variant="elevated" elevation="sm" padding="md">
          <View style={styles.sectionTitleRow}>
            <PixelIcon name="key" size={16} color={colors.accentPrimary} />
            <Text
              style={[
                typography.pixelSectionTitle,
                { color: colors.textPrimary },
              ]}
            >
              1. محرك الترجمة المفضل (AI PROVIDER)
            </Text>
          </View>

          <Text
            style={[
              typography.arabicTranslationBody,
              { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
            ]}
          >
            يعمل ByteBook فوراً عبر المترجم المدمج المجاني + القاموس التقني المحلي، ويمكنك تفعيل Gemini API أو GroqCloud API للترجمة السياقية العميقة وتبسيط المفاهيم العلمية:
          </Text>

          <View style={styles.rowWrap}>
            <PixelButton
              label="Gemini API (Google)"
              size="sm"
              variant={preferredProvider === 'gemini' ? 'primary' : 'secondary'}
              flex
              onPress={() => setPreferredProvider('gemini')}
            />
            <PixelButton
              label="GroqCloud (LPU)"
              size="sm"
              variant={preferredProvider === 'groq' ? 'primary' : 'secondary'}
              flex
              onPress={() => setPreferredProvider('groq')}
            />
            <PixelButton
              label="المترجم المجاني المدمج"
              size="sm"
              variant={
                preferredProvider === 'free_builtin' ? 'primary' : 'secondary'
              }
              fullWidth
              onPress={() => setPreferredProvider('free_builtin')}
            />
          </View>
        </PixelFrame>

        {/* 2. Google Gemini API Configuration */}
        <PixelFrame variant="primary" elevation="sm" padding="md">
          <View style={styles.sectionTitleRow}>
            <PixelBadge label="GOOGLE GEMINI API" variant="accent" />
            <Text
              style={[
                typography.pixelBadgeLabel,
                { color: colors.textSecondary },
              ]}
            >
              SECURE ON-DEVICE KEYCHAIN
            </Text>
          </View>

          <Text
            style={[
              typography.arabicTranslationBody,
              { color: colors.textPrimary, fontSize: 14, marginVertical: 4 },
            ]}
          >
            مفتاح Gemini API Key (يُحفظ مشفراً على جهازك فقط):
          </Text>

          <TextInput
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="AIzaSy..."
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.pixelInput,
              typography.pixelTerminalStat,
              {
                backgroundColor: colors.surfaceInset,
                color: colors.textPrimary,
                borderColor: colors.borderOuter,
              },
            ]}
          />

          <Text
            style={[
              typography.pixelBadgeLabel,
              { color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
            ]}
          >
            اختر نموذج Gemini المفضل:
          </Text>
          <View style={styles.modelsColumn}>
            {GEMINI_MODELS.map((m) => (
              <PixelButton
                key={m}
                label={m}
                size="sm"
                variant={geminiModel === m ? 'accent' : 'secondary'}
                fullWidth
                onPress={() => setGeminiModel(m)}
              />
            ))}
          </View>
        </PixelFrame>

        {/* 3. GroqCloud API Configuration */}
        <PixelFrame variant="primary" elevation="sm" padding="md">
          <View style={styles.sectionTitleRow}>
            <PixelBadge label="GROQCLOUD LPU API" variant="gold" />
            <Text
              style={[
                typography.pixelBadgeLabel,
                { color: colors.textSecondary },
              ]}
            >
              ULTRA-FAST INFERENCE
            </Text>
          </View>

          <Text
            style={[
              typography.arabicTranslationBody,
              { color: colors.textPrimary, fontSize: 14, marginVertical: 4 },
            ]}
          >
            مفتاح GroqCloud API Key (يُحفظ مشفراً على جهازك فقط):
          </Text>

          <TextInput
            value={groqKey}
            onChangeText={setGroqKey}
            placeholder="gsk_..."
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.pixelInput,
              typography.pixelTerminalStat,
              {
                backgroundColor: colors.surfaceInset,
                color: colors.textPrimary,
                borderColor: colors.borderOuter,
              },
            ]}
          />

          <Text
            style={[
              typography.pixelBadgeLabel,
              { color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
            ]}
          >
            اختر نموذج Groq المفضل:
          </Text>
          <View style={styles.modelsColumn}>
            {GROQ_MODELS.map((m) => (
              <PixelButton
                key={m}
                label={m}
                size="sm"
                variant={groqModel === m ? 'accent' : 'secondary'}
                fullWidth
                onPress={() => setGroqModel(m)}
              />
            ))}
          </View>
        </PixelFrame>

        {/* Save & Test AI Buttons */}
        <PixelFrame variant="secondary" elevation="sm" padding="md">
          <View style={styles.saveActionsRow}>
            <PixelButton
              label="حفظ المفاتيح والإعدادات في SecureStore"
              variant="primary"
              icon="check"
              fullWidth
              onPress={handleSaveVaultSettings}
            />
            <PixelButton
              label={isTesting ? 'جاري الاختبار...' : 'اختبار الترجمة الآن ⚡'}
              variant="gold"
              icon="sparkle"
              fullWidth
              disabled={isTesting}
              onPress={handleTestAiConnection}
            />
          </View>

          {saveMessage ? (
            <Text
              style={[
                typography.arabicTranslationBold,
                { color: colors.success, marginTop: 8 },
              ]}
            >
              {saveMessage}
            </Text>
          ) : null}

          {testResult ? (
            <View
              style={[
                styles.testOutputBox,
                {
                  backgroundColor: colors.surfaceInset,
                  borderColor: colors.borderOuter,
                },
              ]}
            >
              <Text
                style={[
                  typography.arabicTranslationBold,
                  { color: colors.accentPrimary },
                ]}
              >
                {testResult}
              </Text>
            </View>
          ) : null}
        </PixelFrame>

        {/* 4. Default Theme & Reading Preferences */}
        <PixelFrame variant="primary" elevation="sm" padding="md">
          <Text
            style={[
              typography.pixelSectionTitle,
              { color: colors.textPrimary, marginBottom: 8 },
            ]}
          >
            4. المظهر الافتراضي وخطوط القراءة
          </Text>

          <View style={styles.rowWrap}>
            {(Object.keys(PIXEL_THEMES) as PixelThemeId[]).map((id) => (
              <PixelButton
                key={id}
                label={PIXEL_THEMES[id].nameAr}
                size="sm"
                variant={themeId === id ? 'primary' : 'secondary'}
                flex
                onPress={() => setThemeId(id)}
              />
            ))}
          </View>

          <View style={[styles.rowWrap, { marginTop: 10 }]}>
            <PixelButton
              label="خط Literata المريح"
              size="sm"
              variant={
                readingFontPreference === 'serif_comfortable'
                  ? 'accent'
                  : 'secondary'
              }
              flex
              onPress={() => setReadingFontPreference('serif_comfortable')}
            />
            <PixelButton
              label="خط VT323 البكسلي"
              size="sm"
              variant={
                readingFontPreference === 'pixel_retro' ? 'accent' : 'secondary'
              }
              flex
              onPress={() => setReadingFontPreference('pixel_retro')}
            />
            <PixelButton
              label={`A- (${readingFontSize - 2})`}
              size="sm"
              variant="secondary"
              flex
              onPress={() => setReadingFontSize(readingFontSize - 2)}
            />
            <PixelButton
              label={`A+ (${readingFontSize + 2})`}
              size="sm"
              variant="secondary"
              flex
              onPress={() => setReadingFontSize(readingFontSize + 2)}
            />
          </View>
        </PixelFrame>
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
    gap: PixelSpacing.md,
    flexWrap: 'wrap',
  },
  headerTitleCol: {
    flex: 1,
    minWidth: 200,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: PixelSpacing.xs,
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: PixelSpacing.sm,
  },
  pixelInput: {
    borderWidth: 2,
    paddingHorizontal: PixelSpacing.sm,
    paddingVertical: PixelSpacing.sm,
    fontSize: 18,
  },
  modelsColumn: {
    width: '100%',
    flexDirection: 'column',
    gap: PixelSpacing.xs,
  },
  saveActionsRow: {
    width: '100%',
    flexDirection: 'column',
    gap: PixelSpacing.sm,
  },
  testOutputBox: {
    marginTop: PixelSpacing.sm,
    padding: PixelSpacing.sm,
    borderWidth: 2,
  },
});
