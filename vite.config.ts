import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/nammatv/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'NammaTV — Free Live TV',
        short_name: 'NammaTV',
        description:
          'Free, legal live TV channels from around the world. Kannada, Hindi, English, news, sports and more.',
        theme_color: '#07070d',
        background_color: '#07070d',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The 3MB channel catalog is deliberately NOT precached — it is
        // runtime-cached below so installs stay light and updates cheap.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icons/*.png'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/channels.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog',
              expiration: { maxEntries: 2 },
            },
          },
          {
            // Channel logos live on many third-party hosts. Same-origin images
            // are served by the precache first, so this effectively targets
            // the cross-origin logo requests.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'logos',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 30 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
