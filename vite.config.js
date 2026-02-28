import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(__dirname, 'src/renderer'),
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src/renderer')
    }
  },
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: path.join(__dirname, 'src/renderer/pages/home/index.html'),
        login: path.join(__dirname, 'src/renderer/pages/login/index.html')
      }
    }
  },
  server: {
    port: 5173
  }
});
