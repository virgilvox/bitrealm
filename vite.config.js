import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'client',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'client/index.html',
        editor: 'client/editor/index.html'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/colyseus': {
        target: 'ws://localhost:3001',
        ws: true
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'pinia', 'pixi.js', 'howler', 'colyseus.js']
  }
})