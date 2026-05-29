import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split React and React-DOM into separate chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react-vendor'
          }
          // Split Supabase into separate chunk
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor'
          }
          // Split React Query into separate chunk
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query-vendor'
          }
          // Split utilities
          if (id.includes('node_modules/recharts') || id.includes('node_modules/xlsx')) {
            return 'utils'
          }
        },
      },
    },
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    // Minify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  // Performance optimizations
  server: {
    // Enable fast refresh
    middlewareMode: false,
  },
  preview: {
    port: 4173,
  },
})
