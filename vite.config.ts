import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __IS_DEV__: mode !== 'production',
  },
  
  // Tauri expects a fixed port for dev server
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
  },
  
  // Use TAURI_* env vars in addition to VITE_*
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Prevent vite from obscuring rust errors
  clearScreen: false,
}))
