import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['qa/**/*.test.tsx', 'qa/**/*.test.ts'],
    alias: {
      '../../src/lib/supabase': '/Users/khaled/LocalProjects/fitbook-web/src/lib/supabase.ts',
    },
  },
})
