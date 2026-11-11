import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['@tiptap/core', '@tiptap/pm', 'react', 'react-dom'] },
  server: { port: 4401, proxy: { '/api': 'http://localhost:4400', '/media-files': 'http://localhost:4400' }, fs: { allow: ['..', '../..'] } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
