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
})
