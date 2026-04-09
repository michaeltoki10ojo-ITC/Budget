import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Budget-1';
const pagesBase = `/${repoName}/`;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Budget PWA',
        short_name: 'Budget',
        description: 'Personal budgeting PWA for iPhone and iPad.',
        theme_color: '#0d1321',
        background_color: '#f6f5f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `${pagesBase}#/`,
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true
  }
}));