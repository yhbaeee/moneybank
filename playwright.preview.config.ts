import { defineConfig, devices } from '@playwright/test'

/**
 * 프로덕션 빌드(vite preview)에서 핵심 흐름(@core)을 검증하는 설정.
 * 개발 서버와 달리 최소화·트리 셰이킹된 실제 배포본이라, 개발 전용 코드나 설정에 가려진 문제를 잡는다.
 * 실행: npm run test:e2e:preview (먼저 build를 수행한다)
 */
const PORT = 4173
const HOST = '127.0.0.1'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  grep: /@core/,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    { name: 'preview-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'preview-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: false,
  },
})
