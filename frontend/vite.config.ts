import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base is set only for production (e.g. GitHub Pages deployment)
  // For local dev, leave it as '/' so SPA routing works on refresh
  base: process.env.NODE_ENV === 'production' ? '/memento-mori/' : '/',
})
