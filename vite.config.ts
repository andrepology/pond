import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['fonts/**/*', 'eye.svg', 'icons/**/*'],
      manifest: {
        name: 'pond',
        short_name: 'pond',
        description: 'A local-first journal app by curl.projects',
        theme_color: '#F6F5F3',
        background_color: '#F6F5F3',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large JS bundles
        runtimeCaching: [
          {
            urlPattern: /\.(?:hdr)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hdri-cache',
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:jpg|jpeg|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:mp3|wav|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev for faster HMR
      }
    })
  ],
  define: {
    __IS_DEV__: mode !== 'production',
  },
  
  // Tauri expects a fixed port for dev server
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
  },
  
  // Use TAURI_* env vars in addition to VITE_*
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Prevent vite from obscuring rust errors
  clearScreen: false,
}))
