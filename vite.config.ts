/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 개발 서버 시작 시 의존성을 미리 번들해 두면, 실행 중 새 의존성을 발견해 페이지를 새로고침하는 일이 없다.
  // (E2E 도중 새로고침되어 "Execution context was destroyed"로 실패하는 것을 막는다.)
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*Context.ts', 'src/app/DevComponents.tsx'],
      reporter: ['text-summary', 'text', 'html'],
      // 기준 미달이면 `npm run test:coverage`가 실패한다. 순수 로직 계층은 더 엄격하게 본다.
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
        'src/domain/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
        'src/storage/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
      },
    },
  },
})
