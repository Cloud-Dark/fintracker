import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Tolok ukur performa memakan waktu sekitar 40 detik dan dikecualikan dari
    // `npm test`; jalankan lewat `npm run test:perf`.
    exclude: ['node_modules/**', 'dist/**', '**/performance.test.ts'],
  },
})
