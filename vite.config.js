import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const [owner, repo] = pkg.updates.repo.split('/')

// Desktop (Electron) and Android builds ship their own files, so they skip the service worker.
const native = process.env.EM_DESKTOP === '1'

export default defineConfig({
  // EM_BASE serves the web app from a sub-path, e.g. /eternal_maps/ on GitHub Pages.
  base: process.env.EM_BASE ?? (native ? './' : '/'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __UPDATE_REPO__: JSON.stringify(pkg.updates.repo),
    __WEB_URL__: JSON.stringify(`https://${owner.toLowerCase()}.github.io/${repo}/`),
  },
  plugins: [
    react(),
    !native &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'brand/*.png'],
        manifest: {
          name: 'Eternal Maps',
          short_name: 'Maps',
          description: 'Your places, routes and journeys — in one calm place. Private, by Eternal Inc.',
          theme_color: '#0A0A0A',
          background_color: '#FFFFFF',
          display: 'standalone',
          orientation: 'any',
          start_url: './',
          scope: './',
          categories: ['navigation', 'travel', 'maps'],
          icons: [
            { src: 'brand/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Map fonts are small and reused everywhere, so keep them for offline use. Tiles stay live.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/fonts/'),
              handler: 'CacheFirst',
              options: { cacheName: 'map-fonts', expiration: { maxEntries: 200 } },
            },
          ],
        },
      }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { maplibre: ['maplibre-gl'], react: ['react', 'react-dom', 'framer-motion'] } } },
  },
})
