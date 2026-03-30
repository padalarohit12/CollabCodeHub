import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["codemirror", "@codemirror/lang-javascript", "@codemirror/theme-one-dark", "y-codemirror.next", "yjs", "@liveblocks/yjs"],
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: ["codemirror", "@codemirror/lang-javascript", "@codemirror/theme-one-dark"],
          yjs: ["yjs", "y-codemirror.next", "@liveblocks/yjs"],
        },
      },
    },
  },
})
