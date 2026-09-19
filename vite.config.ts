import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { handleAiApiRequest } from './server/aiServer.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'ai-server-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const handled = await handleAiApiRequest(req, res, serverApiKey)
            if (!handled) {
              next()
            }
          })
        }
      }
    ],
    server: {
      open: true,
      port: 5173
    }
  }
})

