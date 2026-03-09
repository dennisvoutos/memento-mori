/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

/**
 * Copies index.html → 404.html after build so that GitHub Pages
 * serves the SPA shell for every route instead of a real 404.
 */
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      try {
        const outDir = resolve(__dirname, 'dist')
        copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
      } catch {
        // Silently ignore — only relevant when building for GH Pages
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  // VITE_BASE_PATH overrides the base path for different deployment targets.
  // GitHub Pages uses '/memento-mori/', cloud deployments use '/' (default).
  base: process.env.VITE_BASE_PATH || '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
      ],
    },
  },
})
