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
        manualChunks: {
          // Split React and React-DOM into separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split Supabase into separate chunk
          'supabase-vendor': ['@supabase/supabase-js'],
          // Split React Query into separate chunk
          'query-vendor': ['@tanstack/react-query'],
          // Split utilities
          'utils': ['recharts', 'xlsx'],
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
