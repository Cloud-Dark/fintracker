import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json'

export default defineConfig({
  plugins: [react()],
  // Versi aplikasi berasal dari package.json sebagai sumber kebenaran tunggal,
  // sehingga footer dan halaman Pengaturan tidak pernah tertinggal dari rilis.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
