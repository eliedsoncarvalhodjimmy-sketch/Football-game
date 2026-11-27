import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  // JSX dos componentes React (rostos e página de teste) sem plugin: o esbuild do Vite trata do .tsx.
  esbuild: { jsx: 'automatic' },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'test-faces': resolve(__dirname, 'test-faces/index.html'),
        'test-cutscene': resolve(__dirname, 'test-cutscene/index.html'),
      },
    },
  },
});
