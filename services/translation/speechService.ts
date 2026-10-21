/**
 * ByteBook — Reactive Audio Pronunciation & Text-to-Speech Service
 * Supports starting AND immediately stopping/cancelling speech on both iOS and Web/PWA,
 * notifying the UI so the "🔊 نطق" button transforms into "⏹️ إيقاف النطق".
 */

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

type SpeechStateListener = (activeId: string | null) => void;

export class SpeechService {
  private activeId: string | null = null;
  private listeners = new Set<SpeechStateListener>();

  public subscribe(listener: SpeechStateListener): () => void {
    this.listeners.add(listener);
    listener(this.activeId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveId(): string | null {
    return this.activeId;
  }

  private notify(nextId: string | null): void {
    this.activeId = nextId;
    for (const listener of this.listeners) {
      listener(nextId);
    }
  }

  /**
   * Toggles speaking for a given target ID (e.g., paragraph blockId or word tokenId).
   * If the same target ID is already speaking, it immediately stops speech!
   */
  public toggleSpeakEnglish(
    targetId: string,
    text: string,
    rate: number = 0.92
  ): void {
    if (this.activeId === targetId) {
      this.stop();
      return;
    }

    this.speakEnglish(text, rate, targetId);
  }

  public speakEnglish(
    text: string,
    rate: number = 0.92,
    targetId: string = 'global_tts'
  ): void {
    const cleanText = text.replace(/\[\d+\]/g, '').trim();
    if (!cleanText) return;

    this.stop();
    this.notify(targetId);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.onend = () => {
          if (this.activeId === targetId) {
            this.notify(null);
          }
        };
        utterance.onerror = () => {
          if (this.activeId === targetId) {
            this.notify(null);
          }
        };
        window.speechSynthesis.speak(utterance);
      } else {
        this.notify(null);
      }
      return;
    }

    Speech.speak(cleanText, {
      language: 'en-US',
      rate,
      pitch: 1.0,
      onDone: () => {
        if (this.activeId === targetId) {
          this.notify(null);
        }
      },
      onStopped: () => {
        if (this.activeId === targetId) {
          this.notify(null);
        }
      },
      onError: () => {
        if (this.activeId === targetId) {
          this.notify(null);
        }
      },
    });
  }

  public stop(): void {
    this.notify(null);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    Speech.stop().catch(() => {});
  }
}

export const speechService = new SpeechService();
