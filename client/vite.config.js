/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Allow the Tailscale Serve hostname (https://<machine>.<tailnet>.ts.net)
    // through Vite's host check, so mobile/remote access gets a secure
    // origin — required for geolocation + a real PWA install.
    allowedHosts: ['.ts.net'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://api:3000',
        changeOrigin: true,
        ws: true,
      },
      // ActiveStorage blob URLs (rails_blob_url only_path: true) are served
      // by Rails at /rails/active_storage/... — proxy them like /api so
      // uploaded photos render in dev.
      '/rails': {
        target: process.env.VITE_API_URL || 'http://api:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // Component/unit tests live in tests/ mirroring the src/ layout
    // (e.g. src/components/ui/Action.jsx → tests/components/ui/Action.test.jsx).
    // Vitest picks up .test.js / .test.jsx; Playwright handles .spec.js.
    include: ['tests/**/*.test.{js,jsx}'],
    css: false,
  },
})
