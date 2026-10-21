import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML template for Expo Router Web / PWA.
 * Configured for iOS Safari Standalone Fullscreen Mode and mobile-responsive viewport.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover, user-scalable=no, shrink-to-fit=no"
        />

        {/* Primary PWA Standalone Mode for iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="ByteBook" />
        <meta name="application-name" content="ByteBook" />
        <meta name="theme-color" content="#0D130F" />

        {/* App Icons */}
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Reset styles for full-screen React Native Web & prevent horizontal scrolling */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                width: 100% !important;
                max-width: 100vw !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow-x: hidden !important;
                -webkit-text-size-adjust: 100%;
                -webkit-tap-highlight-color: transparent;
                box-sizing: border-box !important;
                background-color: #0D130F !important;
                background: #0D130F !important;
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
              }
              button, input, select, textarea {
                max-width: 100%;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
