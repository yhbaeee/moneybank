import { expect, test, type Page } from '@playwright/test'

const KEY = 'ledger.data'

async function readStored(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), KEY)
}

test.describe('저장소 시드', () => {
  test('최초 진입 시 기본 데이터가 저장되고 새로고침해도 다시 쓰지 않는다', { tag: '@core' }, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()

    const first = await readStored(page)
    expect(first).not.toBeNull()
    const data = JSON.parse(first!)
    expect(data.schemaVersion).toBe(1)
    expect(data.categories.filter((c: { type: string }) => c.type === 'expense')).toHaveLength(9)
    expect(data.categories.filter((c: { type: string }) => c.type === 'income')).toHaveLength(4)
    expect(data.paymentMethods).toHaveLength(5)
    expect(data.transactions).toEqual([])

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    expect(await readStored(page)).toBe(first)
  })

  test('손상된 데이터는 안내를 표시하고 덮어쓰지 않는다', { tag: '@core' }, async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{broken'), KEY)
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('손상')
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toHaveCount(0)
    expect(await readStored(page)).toBe('{broken')
  })
})
