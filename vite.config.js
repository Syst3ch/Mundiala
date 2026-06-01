import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // כל פנייה באפליקציה ל- /api-football תופנה אוטומטית לשרת הנתונים
      '/api-football': {
        target: 'https://api.football-data.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-football/, '')
      }
    }
  }
})