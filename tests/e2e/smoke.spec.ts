import { expect, test } from '@playwright/test'

test('앱 첫 진입 시 기본 화면이 표시된다', { tag: '@core' }, async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('홈 · 가계부')
  await expect(page.getByRole('banner').getByText('가계부')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
})
