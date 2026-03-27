import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // THÊM DÒNG NÀY: Giúp các file tĩnh (JS, CSS) được tìm đúng ở /shop/assets/
  base: '/shop/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})