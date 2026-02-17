import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH overrides the base path for different deployment targets.
  // GitHub Pages uses '/memento-mori/', cloud deployments use '/' (default).
  base: process.env.VITE_BASE_PATH || '/',
})
