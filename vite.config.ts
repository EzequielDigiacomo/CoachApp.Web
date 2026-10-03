import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El proxy evita problemas de CORS en desarrollo: el navegador le pide
// /api/... al mismo servidor de Vite y Vite lo reenvia a la API .NET.
// En produccion esto no existe, ahi el frontend apunta al dominio real.
export default defineConfig({
  plugins: [react()],
  server: {
    // Escuchar en IPv4 e IPv6. Sin esto Vite queda solo en ::1 y el navegador,
    // que resuelve localhost a 127.0.0.1, no puede alcanzar ni la app ni el proxy.
    host: true,
    proxy: {
      '/api': {
        // 127.0.0.1 explicito: la API .NET escucha ahi y evitamos que la
        // resolucion de "localhost" caiga en una direccion equivocada.
        target: 'http://127.0.0.1:5203',
        changeOrigin: true,
      },
    },
  },
})
