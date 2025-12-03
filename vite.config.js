import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const baseUrl = isProd ? '/iplaycheck/' : '/';
  const productionOrigin = 'https://restarhalf.github.io';
  const absoluteBaseUrl = isProd ? new URL(baseUrl, productionOrigin).toString() : baseUrl;
  const resolveIconPath = (filename) => {
    return isProd ? new URL(filename, absoluteBaseUrl).toString() : `${baseUrl}${filename}`;
  };
  const manifestScope = baseUrl;
  const manifestId = baseUrl;
  const manifestStartUrl = baseUrl;
  return {
    base: baseUrl,
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png', 'icon.png'],
        manifest: {
          id: manifestId,
          name: '工作室打卡',
          short_name: '打卡',
          description: '工作室员工打卡系统，支持离线使用',
          theme_color: '#007aff',
          background_color: '#f2f2f7',
          display: 'standalone',
          orientation: 'portrait',
          scope: manifestScope,
          start_url: manifestStartUrl,
          icons: [
            {
              src: resolveIconPath('icon-192.png'),
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: resolveIconPath('icon-192.png'),
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: resolveIconPath('icon-512.png'),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: resolveIconPath('icon-512.png'),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: resolveIconPath('icon.png'),
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: resolveIconPath('icon.png'),
              sizes: '256x256',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          categories: ["productivity", "business"],
          prefer_related_applications: false,
          lang: "zh-CN",
          dir: "ltr"
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
          // Allow larger assets to be precached if necessary (default is 2 MB in workbox)
          // Increase only if you understand the trade-off of precaching large files.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
          // 关键：确保 SPA 导航回退到 index.html
          navigateFallback: `${baseUrl}index.html`,
          navigateFallbackDenylist: [/^\/api/, /\/manifest\.webmanifest$/],
          runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i, // 仅匹配 Supabase 存储请求
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/profile.*/i, // 添加对 /profile 路由的匹配
            handler: 'NetworkFirst',
            options: {
              cacheName: 'profile-route-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false  // 禁用开发模式下的 PWA
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8080,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    }
  }
}})
