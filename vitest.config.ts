import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // tests/manual/** talks to the REAL project database and creates and deletes
    // its own accounts. It is never part of `npm test` — run it deliberately with
    // `npx vitest run --config vitest.manual.config.ts`.
    exclude: ['tests/integration/**/*', 'tests/manual/**/*', 'node_modules/**/*'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})
