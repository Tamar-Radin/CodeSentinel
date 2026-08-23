import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // מיפוי alias לטיפוסים המשותפים
      '@architect/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
})
