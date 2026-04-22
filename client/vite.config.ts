import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,    // exposes to local network
    port: 5173,
    proxy: {
      // Proxy API calls to the backend during development so mobile clients
      // only need to reach the Vite dev server. This avoids having the
      // phone connect directly to the backend port (8000) which can be
      // blocked by firewall/router settings.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})