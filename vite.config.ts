import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// El proxy evita problemas de CORS en desarrollo: el navegador le pide
// /api/... al mismo servidor de Vite y Vite lo reenvia a la API.
// Por defecto apunta a Render. Para API local: VITE_API_PROXY=http://127.0.0.1:5203
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api =
    env.VITE_API_PROXY?.trim() || 'https://coachapp-5kea.onrender.com'

  return {
    plugins: [react()],
    server: {
      // Escuchar en IPv4 e IPv6. Sin esto Vite queda solo en ::1 y el navegador,
      // que resuelve localhost a 127.0.0.1, no puede alcanzar ni la app ni el proxy.
      host: true,
      proxy: {
        '/api': {
          target: api,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
