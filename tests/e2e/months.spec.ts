import { expect, test, type Page } from '@playwright/test'
import { fixToday, openHome, openList, seedTransactions } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const nav = (page: Page) => page.getByRole('navigation', { name: '월 이동' })
const prev = (page: Page) => nav(page).getByRole('button', { name: '이전 달' })
const next = (page: Page) => nav(page).getByRole('button', { name: '다음 달' })
const thisMonth = (page: Page) => nav(page).getByRole('button', { name: '이번 달' })
const mainNav = (page: Page) => page.getByRole('navigation', { name: '주 메뉴' })

async function seedAcrossMonths(page: Page) {
  await openList(page)
  await seedTransactions(page, [
    { amount: 10000, date: '2025-12-31', categoryId: 'cat-expense-1', memo: '작년말' },
    { amount: 10000, date: '2026-09-15', categoryId: 'cat-expense-1', memo: '9월점심' },
    { amount: 20000, date: '2026-10-10', categoryId: 'cat-expense-2', memo: '10월버스' },
    { amount: 30000, date: '2026-11-05', categoryId: 'cat-expense-4', memo: '11월쇼핑' },
    { amount: 40000, date: '2026-12-31', categoryId: 'cat-expense-1', memo: '연말' },
    { amount: 50000, date: '2027-01-01', categoryId: 'cat-expense-1', memo: '새해' },
  ])
  await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
}

test.describe('월 이동', () => {
  test('기본은 이번 달이고 이전·다음·이번 달로 이동한다', async ({ page }) => {
    await seedAcrossMonths(page)
    await expect(nav(page)).toContainText('2026년 10월')
    await expect(thisMonth(page)).toBeDisabled()
    await expect(page.getByText('10월버스')).toBeVisible()
    await expect(page.getByText('9월점심')).toHaveCount(0)

    await prev(page).click()
    await expect(nav(page)).toContainText('2026년 9월')
    await expect(page.getByText('9월점심')).toBeVisible()
    await expect(page.getByText('10월버스')).toHaveCount(0)
    await expect(thisMonth(page)).toBeEnabled()

    await next(page).click()
    await next(page).click()
    await expect(nav(page)).toContainText('2026년 11월')
    await expect(page.getByText('11월쇼핑')).toBeVisible()

    await thisMonth(page).click()
    await expect(nav(page)).toContainText('2026년 10월')
    await expect(page.getByText('10월버스')).toBeVisible()
    await expect(thisMonth(page)).toBeDisabled()
  })

  test('연도 경계를 넘어 이동한다 (12월 ↔ 1월)', { tag: '@core' }, async ({ page }) => {
    await seedAcrossMonths(page)
    await next(page).click() // 11월
    await next(page).click() // 12월
    await expect(nav(page)).toContainText('2026년 12월')
    await expect(page.getByText('연말')).toBeVisible()
    await expect(page.getByText('새해')).toHaveCount(0)

    await next(page).click()
    await expect(nav(page)).toContainText('2027년 1월')
    await expect(page.getByText('새해')).toBeVisible()
    await expect(page.getByText('연말')).toHaveCount(0)

    await prev(page).click()
    await expect(nav(page)).toContainText('2026년 12월')

    for (let i = 0; i < 12; i++) await prev(page).click()
    await expect(nav(page)).toContainText('2025년 12월')
    await expect(page.getByText('작년말')).toBeVisible()
  })

  test('내역이 없는 달은 빈 상태를 표시한다', async ({ page }) => {
    await seedAcrossMonths(page)
    for (let i = 0; i < 4; i++) await next(page).click()
    await expect(nav(page)).toContainText('2027년 2월')
    await expect(page.getByText('이 달의 내역이 없습니다')).toBeVisible()
  })

  test('선택한 월은 홈과 내역 화면이 공유한다', { tag: '@core' }, async ({ page }) => {
    await seedAcrossMonths(page)
    await prev(page).click()
    await expect(nav(page)).toContainText('2026년 9월')

    await mainNav(page).getByRole('link', { name: '홈' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    await expect(nav(page)).toContainText('2026년 9월')
    await expect(page.getByRole('group', { name: '지출' })).toContainText('10,000원')
    const rows = page.getByRole('list', { name: '카테고리별 지출' }).getByRole('listitem')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('식비')
    await expect(rows.first()).toContainText('100.0%')

    await next(page).click()
    await expect(page.getByRole('group', { name: '지출' })).toContainText('20,000원')

    await mainNav(page).getByRole('link', { name: '내역' }).click()
    await expect(nav(page)).toContainText('2026년 10월')
    await expect(page.getByText('10월버스')).toBeVisible()
  })

  test('홈에서 월을 바꾸면 요약이 그 달 기준으로 갱신된다', async ({ page }) => {
    await seedAcrossMonths(page)
    await openHome(page)
    await expect(page.getByRole('group', { name: '지출' })).toContainText('20,000원')
    await next(page).click()
    await expect(nav(page)).toContainText('2026년 11월')
    await expect(page.getByRole('group', { name: '지출' })).toContainText('30,000원')
    await expect(page.getByRole('group', { name: '잔액' })).toContainText('-30,000원')
    await thisMonth(page).click()
    await expect(page.getByRole('group', { name: '지출' })).toContainText('20,000원')
  })

  test('새로고침하면 이번 달로 돌아간다', async ({ page }) => {
    await seedAcrossMonths(page)
    await prev(page).click()
    await expect(nav(page)).toContainText('2026년 9월')
    await page.reload()
    await expect(nav(page)).toContainText('2026년 10월')
  })

  test('월 이동 바가 화면 안에 들어온다', async ({ page }) => {
    await openList(page)
    const viewport = page.viewportSize()!
    for (const button of [prev(page), next(page), thisMonth(page)]) {
      const box = await button.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
})

test.describe('다른 달을 보는 중 등록', () => {
  test('날짜 기본값은 이번 달이면 오늘, 다른 달이면 그 달의 1일이다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    await expect(page.getByRole('dialog').getByLabel('날짜')).toHaveValue('2026-10-27')
    await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()

    await prev(page).click()
    await page.getByRole('button', { name: '내역 추가' }).click()
    await expect(page.getByRole('dialog').getByLabel('날짜')).toHaveValue('2026-09-01')
    await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()

    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: '내역 추가' }).click()
    await expect(page.getByRole('dialog').getByLabel('날짜')).toHaveValue('2026-11-01')
  })

  test('보고 있는 달에 저장하면 기본 안내만, 다른 달에 저장하면 기록된 달을 알려 준다', async ({ page }) => {
    await openList(page)
    await prev(page).click() // 9월

    await page.getByRole('button', { name: '내역 추가' }).click()
    let dialog = page.getByRole('dialog', { name: '내역 추가' })
    await dialog.getByLabel('금액').fill('1000')
    await dialog.getByLabel('메모').fill('같은달')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('status').filter({ hasText: '저장했습니다' })).not.toContainText('기록됨')
    await expect(page.getByText('같은달')).toBeVisible()

    await page.getByRole('button', { name: '내역 추가' }).click()
    dialog = page.getByRole('dialog', { name: '내역 추가' })
    await dialog.getByLabel('금액').fill('2000')
    await dialog.getByLabel('날짜').fill('2026-10-05')
    await dialog.getByLabel('메모').fill('다른달')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('status')).toContainText('2026년 10월에 기록됨')
    await expect(page.getByText('다른달')).toHaveCount(0)

    await thisMonth(page).click()
    await expect(page.getByText('다른달')).toBeVisible()
  })
})
