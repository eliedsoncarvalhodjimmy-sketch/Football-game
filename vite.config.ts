import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  worker: { format: 'es' },
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'FutCEO',
        short_name: 'FutCEO',
        description: 'Jogo de gestão de futebol (uso pessoal)',
        lang: 'pt-PT',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f141b',
        theme_color: '#0f141b',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
});
