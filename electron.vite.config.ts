import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'electron/main.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts')
      }
    }
  },
  renderer: {
    plugins: [react()],
    root: resolve(__dirname, '.'),
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  }
})
