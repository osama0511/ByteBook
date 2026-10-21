/**
 * ByteBook — Root Application Layout (Expo Router)
 * Loads 8-bit/16-bit Pixel Fonts + Comfortable Reading Fonts and initializes local SQLite DB.
 */

import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import {
  Literata_400Regular,
  Literata_700Bold,
} from '@expo-google-fonts/literata';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import {
  Silkscreen_400Regular,
  Silkscreen_700Bold,
} from '@expo-google-fonts/silkscreen';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { byteBookDb } from '../database';
import { useThemeStore } from '../store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { theme } = useThemeStore();

  const [fontsLoaded, fontError] = useFonts({
    PressStart2P_400Regular,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    VT323_400Regular,
    Literata_400Regular,
    Literata_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_700Bold,
  });

  useEffect(() => {
    byteBookDb.initialize().catch((err) => {
      console.warn('[ByteBook] SQLite initialization warning:', err);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeBg = theme.isDark ? '#0D130F' : theme.colors.backgroundPrimary;
      document.documentElement.style.backgroundColor = activeBg;
      document.body.style.backgroundColor = activeBg;
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.backgroundColor = activeBg;
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', activeBg);
      }
    }
  }, [theme]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const rootBgColor = theme.isDark ? '#0D130F' : theme.colors.backgroundPrimary;

  return (
    <SafeAreaProvider style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#0D130F' }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: rootBgColor,
          },
        }}
      />
    </SafeAreaProvider>
  );
}
