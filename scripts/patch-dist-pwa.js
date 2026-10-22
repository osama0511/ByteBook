const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const htmlPath = path.join(distPath, 'index.html');
const manifestSrc = path.join(__dirname, '..', 'public', 'manifest.json');
const manifestDest = path.join(distPath, 'manifest.json');
const faviconSrc = path.join(__dirname, '..', 'public', 'favicon.png');
const faviconDest = path.join(distPath, 'favicon.png');

if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('[PWA Patch] Copied manifest.json to dist/');
}

if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, faviconDest);
  console.log('[PWA Patch] Copied favicon.png to dist/');
}

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Google Site Verification
  const googleVerificationTag = '<meta name="google-site-verification" content="D4wKdH4xY1dO_42GTdoKLainTuMOr2KEu-XgVqV2ZoY" />';
  if (!html.includes('google-site-verification')) {
    html = html.replace('<head>', `<head>\n    ${googleVerificationTag}`);
  }

  // iOS Standalone PWA Meta Tags
  const pwaMetaTags = `
    <!-- iOS Standalone PWA Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="ByteBook" />
    <meta name="application-name" content="ByteBook" />
    <meta name="theme-color" content="#0D130F" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/favicon.png" />
  `;

  // Replace default viewport with viewport-fit=cover for full-screen iPhone notch
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover, user-scalable=no, shrink-to-fit=no" />'
  );

  // Replace any existing theme-color
  html = html.replace(/<meta name="theme-color" content="[^"]*"\s*\/?>/gi, '<meta name="theme-color" content="#0D130F" />');

  // Add global CSS to prevent horizontal overflow, set dark background, and support safe areas
  const responsiveCss = `
    <style id="bytebook-responsive-pwa">
      html, body, #root {
        width: 100% !important;
        max-width: 100vw !important;
        height: 100% !important;
        min-height: 100% !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
        box-sizing: border-box !important;
        background-color: #0D130F !important;
        background: #0D130F !important;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
      }
    </style>
  `;

  if (!html.includes('apple-mobile-web-app-capable')) {
    html = html.replace('</head>', `${pwaMetaTags}\n${responsiveCss}\n</head>`);
  } else {
    html = html.replace('</head>', `${responsiveCss}\n</head>`);
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('[PWA Patch] Successfully injected iOS Standalone PWA tags and viewport into dist/index.html');
} else {
  console.warn('[PWA Patch] dist/index.html not found!');
}
