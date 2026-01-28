import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configureDataMiddleware } from './server/dataMiddleware'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'data-middleware',
      configureServer(server) {
        configureDataMiddleware(server);
      }
    }
  ],
  server: {
    proxy: {
      // Proxy trace API requests to the backend server
      '/api/traces': {
        target: 'http://localhost:4318',
        changeOrigin: true,
      },
      // Proxy SDK projects API to backend
      '/api/sdk-projects': {
        target: 'http://localhost:4318',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/sdk-projects', '/api/projects'),
      },
    }
  }
})
