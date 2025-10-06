import { defineConfig } from 'vite';
import { resolve } from 'path';

const rootDir = resolve(__dirname, 'client');

export default defineConfig({
  root: rootDir,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        viewer: resolve(rootDir, 'viewer.html')
      }
    }
  }
});
