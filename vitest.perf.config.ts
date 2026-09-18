import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * Konfigurasi terpisah untuk tolok ukur performa.
 *
 * Berkas ini sengaja dipisahkan dari `vite.config.ts` karena tolok ukur
 * membangun ribuan transaksi dan memakan waktu sekitar 40 detik, sehingga
 * tidak layak dijalankan pada setiap `npm test`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/domain/__tests__/performance.test.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
})
