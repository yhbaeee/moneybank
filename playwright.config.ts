import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
// localhost는 환경에 따라 IPv6(::1)로만 열려 Firefox가 접속에 실패할 수 있어 IPv4 주소로 고정한다.
const HOST = '127.0.0.1'
const CORE = /@core/

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    // 전체 시나리오는 Chromium(데스크톱·모바일 에뮬레이션)에서 실행한다.
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // 다른 브라우저 엔진은 핵심 흐름(@core 태그)만 실행한다. (Firefox, Safari 엔진)
    { name: 'firefox', grep: CORE, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grep: CORE, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', grep: CORE, use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: true,
  },
})
