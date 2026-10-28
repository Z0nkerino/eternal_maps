// Renders every PNG icon from public/icon.svg (the Eternal Maps mark in Planner's icon construction).
// Usage: node scripts/make-brand.cjs   (needs Playwright's Chromium, which is used only as a renderer)
const { chromium } = require('playwright');
const fs = require('node:fs');

const svg = fs.readFileSync('public/icon.svg', 'utf8');
const square = svg.replace('rx="450"', 'rx="0"'); // platforms that apply their own mask
// The glyph alone in white, for Android's adaptive-icon foreground layer.
const glyph = svg.replace(/<g clip-path="url\(#sq\)">[\s\S]*?<\/g>/, '');
const glow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000"><defs><radialGradient id="g" cx="50%" cy="58%" r="62%"><stop offset="0" stop-color="#2F6BFF" stop-opacity=".55"/><stop offset=".55" stop-color="#FF4FA3" stop-opacity=".22"/><stop offset="1" stop-color="#FF4FA3" stop-opacity="0"/></radialGradient></defs><rect width="2000" height="2000" fill="#0A0A0A"/><rect width="2000" height="2000" fill="url(#g)"/></svg>`;

const jobs = [
  // [file, source svg, canvas, inner size, background, shadow]
  ['public/brand/icon-192.png', svg, 192, 192],
  ['public/brand/icon-512.png', svg, 512, 512],
  ['public/brand/icon-1024.png', svg, 1024, 1024],
  ['public/brand/icon-maskable-512.png', square.replace('scale(.64)', 'scale(.5)'), 512, 512],
  ['public/brand/apple-touch-icon.png', square, 180, 180],
  ['build/icon.png', svg, 1024, 1024], // Windows
  ['build/icon-mac.png', svg, 1024, 824, null, true], // macOS icon grid: 824px tile with a soft shadow
  ['assets/icon-only.png', square, 1024, 1024],
  ['assets/icon-foreground.png', glyph.replace('scale(.64)', 'scale(.5)'), 1024, 1024],
  ['assets/icon-background.png', glow, 1024, 1024],
  ['assets/splash.png', svg, 2732, 360, '#FFFFFF'],
  ['assets/splash-dark.png', svg, 2732, 360, '#0A0A0A'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, src, canvas, inner, bg, shadow] of jobs) {
    await page.setViewportSize({ width: canvas, height: canvas });
    await page.setContent(`<html><body style="margin:0;background:${bg || 'transparent'}">
      <div style="width:${canvas}px;height:${canvas}px;display:flex;align-items:center;justify-content:center">
      <div style="width:${inner}px;height:${inner}px;${shadow ? 'filter:drop-shadow(0 10px 18px rgba(0,0,0,.28));' : ''}">${src.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></div></body></html>`);
    await page.screenshot({ path: file, omitBackground: !bg });
    console.log(file);
  }
  await browser.close();
})();
