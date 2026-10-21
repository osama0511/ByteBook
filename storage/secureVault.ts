/**
 * ByteBook — Secure API Key Vault
 * Uses hardware-backed Keychain (`expo-secure-store`) on iOS
 * and isolated local storage on Web/PWA so the app works standalone without a laptop.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const SECURE_KEYS = {
  GEMINI_API_KEY: 'bytebook_gemini_api_key',
  GROQ_API_KEY: 'bytebook_groq_api_key',
  PREFERRED_AI_PROVIDER: 'bytebook_preferred_ai_provider',
  GEMINI_MODEL_NAME: 'bytebook_gemini_model_name',
  GROQ_MODEL_NAME: 'bytebook_groq_model_name',
} as const;

export type SecureKeyName = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];

export class SecureVaultService {
  public async setSecret(key: SecureKeyName, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  }

  public async getSecret(key: SecureKeyName): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  }

  public async deleteSecret(key: SecureKeyName): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
}

export const secureVault = new SecureVaultService();
