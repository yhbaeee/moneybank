import { expect, test, type Page } from '@playwright/test'
import { fixToday, openHome, seedTransactions, type SeedTransaction } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const donut = (page: Page) => page.getByRole('img', { name: /카테고리별 지출 비율 도넛 차트/ })
const trend = (page: Page) => page.getByRole('img', { name: /월별 수입·지출 막대 차트/ })
const nav = (page: Page) => page.getByRole('navigation', { name: '월 이동' })

/** 추이 창(2026-05 ~ 2026-10)에 걸친 데이터. 2026-04는 창 밖이다. */
const SEED: SeedTransaction[] = [
  { amount: 99_999, date: '2026-04-30', categoryId: 'cat-expense-4' },
  { amount: 10_000, date: '2026-05-10', categoryId: 'cat-expense-1' },
  { type: 'income', amount: 100_000, date: '2026-06-01', categoryId: 'cat-income-1' },
  { amount: 20_000, date: '2026-06-10', categoryId: 'cat-expense-1' },
  { amount: 30_000, date: '2026-08-15', categoryId: 'cat-expense-2' },
  { type: 'income', amount: 80_000, date: '2026-09-01', categoryId: 'cat-income-1' },
  { amount: 40_000, date: '2026-09-15', categoryId: 'cat-expense-1' },
  { type: 'income', amount: 100_000, date: '2026-10-01', categoryId: 'cat-income-1' },
  { amount: 20_000, date: '2026-10-10', categoryId: 'cat-expense-1' },
  { amount: 10_000, date: '2026-10-11', categoryId: 'cat-expense-2' },
]

async function openHomeWithData(page: Page, seed: SeedTransaction[] = SEED) {
  await openHome(page)
  await seedTransactions(page, seed)
  await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
}

async function barHeight(page: Page, month: string, series: 'income' | 'expense') {
  const box = await trend(page).locator(`g[data-month="${month}"] rect[data-series="${series}"]`).boundingBox()
  return box!.height
}

test.describe('카테고리별 도넛 차트', () => {
  test('카테고리별 비율과 같은 수치를 표시한다', async ({ page }) => {
    await openHomeWithData(page)
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 식비 66.7%, 교통 33.3%')
    await expect(donut(page).locator('circle[data-category]')).toHaveCount(2)
    await expect(donut(page)).toContainText('3만원')

    const rows = page.getByRole('list', { name: '카테고리별 지출' }).getByRole('listitem')
    await expect(rows.nth(0)).toContainText('식비')
    await expect(rows.nth(0)).toContainText('66.7%')
    await expect(rows.nth(1)).toContainText('교통')
    await expect(rows.nth(1)).toContainText('33.3%')
  })

  test('월을 이동하면 해당 월 기준으로 갱신된다', async ({ page }) => {
    await openHomeWithData(page)
    await nav(page).getByRole('button', { name: '이전 달' }).click()
    await expect(nav(page)).toContainText('2026년 9월')
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 식비 100.0%')
    await expect(donut(page).locator('circle[data-category]')).toHaveCount(1)

    await nav(page).getByRole('button', { name: '이전 달' }).click()
    await nav(page).getByRole('button', { name: '이전 달' }).click()
    await expect(nav(page)).toContainText('2026년 7월')
    await expect(donut(page)).toHaveCount(0)
    await expect(page.getByText('이 달의 지출 내역이 없습니다')).toBeVisible()
  })

  test('수정·삭제하면 도넛도 갱신된다', async ({ page }) => {
    await openHomeWithData(page)
    await page.getByRole('region', { name: '최근 내역' }).getByRole('button', { name: /교통/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 식비 100.0%')
  })
})

test.describe('최근 6개월 추이 차트', () => {
  test('선택 월을 마지막으로 6개월의 월 라벨을 표시한다', async ({ page }) => {
    await openHomeWithData(page)
    await expect(trend(page)).toBeVisible()
    await expect(trend(page).locator('g[data-month]')).toHaveCount(6)
    const months = await trend(page).locator('g[data-month]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-month')))
    expect(months).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    await expect(trend(page).locator('g[data-selected]')).toHaveAttribute('data-month', '2026-10')
    await expect(trend(page)).toContainText('5월')
    await expect(trend(page)).toContainText('10월')
  })

  test('막대 높이가 금액에 비례한다', async ({ page }) => {
    await openHomeWithData(page)
    const sep = await barHeight(page, '2026-09', 'expense') // 40,000
    const jun = await barHeight(page, '2026-06', 'expense') // 20,000
    const aug = await barHeight(page, '2026-08', 'expense') // 30,000
    expect(sep / jun).toBeGreaterThan(1.95)
    expect(sep / jun).toBeLessThan(2.05)
    expect(aug / sep).toBeGreaterThan(0.73)
    expect(aug / sep).toBeLessThan(0.77)

    // 수입 최댓값(100,000)이 눈금 최댓값이므로 지출 40,000은 그 40%
    const incomeMax = await barHeight(page, '2026-10', 'income')
    expect(sep / incomeMax).toBeGreaterThan(0.39)
    expect(sep / incomeMax).toBeLessThan(0.41)
    // 값이 없는 달의 막대는 높이 0이다.
    const emptyBar = trend(page).locator('g[data-month="2026-07"] rect[data-series="expense"]')
    await expect(emptyBar).toHaveAttribute('height', '0')
  })

  test('"표로 보기"에서 월별 수입·지출·잔액을 확인한다', async ({ page }) => {
    await openHomeWithData(page)
    const table = page.getByRole('table', { name: '최근 6개월 수입·지출' })
    await expect(table).toBeHidden()
    await page.getByText('표로 보기').click()
    await expect(table).toBeVisible()

    const row = (month: string) => table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: month }) })
    await expect(table.getByRole('row')).toHaveCount(7)
    await expect(row('2026.10').getByRole('cell')).toHaveText(['100,000원', '30,000원', '70,000원'])
    await expect(row('2026.09').getByRole('cell')).toHaveText(['80,000원', '40,000원', '40,000원'])
    await expect(row('2026.07').getByRole('cell')).toHaveText(['0원', '0원', '0원'])
    await expect(row('2026.05').getByRole('cell')).toHaveText(['0원', '10,000원', '-10,000원'])
    // 창 밖(4월) 내역은 포함되지 않는다.
    await expect(table.getByRole('rowheader', { name: '2026.04' })).toHaveCount(0)
  })

  test('월을 이동하면 창이 함께 움직이고 연도 경계에 연도 라벨이 붙는다', async ({ page }) => {
    await openHomeWithData(page, [
      { amount: 10_000, date: '2026-08-10', categoryId: 'cat-expense-1' },
      { amount: 20_000, date: '2026-12-31', categoryId: 'cat-expense-1' },
      { type: 'income', amount: 50_000, date: '2027-01-01', categoryId: 'cat-income-1' },
    ])
    for (let i = 0; i < 3; i++) await nav(page).getByRole('button', { name: '다음 달' }).click()
    await expect(nav(page)).toContainText('2027년 1월')

    const months = await trend(page).locator('g[data-month]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-month')))
    expect(months).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
    await expect(trend(page).locator('g[data-selected]')).toHaveAttribute('data-month', '2027-01')
    // 첫 달(2026)과 1월(2027)에 연도가 표시된다.
    await expect(trend(page).locator('tspan')).toHaveText(['2026', '2027'])
  })

  test('내역이 없으면 빈 상태를 표시한다', async ({ page }) => {
    await openHome(page)
    await expect(page.getByText('최근 6개월간 내역이 없습니다')).toBeVisible()
    await expect(trend(page)).toHaveCount(0)
    await expect(donut(page)).toHaveCount(0)
  })

  test('내역을 추가하면 추이가 즉시 갱신된다', async ({ page }) => {
    await openHome(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await dialog.getByLabel('금액').fill('15000')
    await dialog.getByLabel('날짜').fill('2026-10-05')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(trend(page)).toBeVisible()
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 식비 100.0%')
    await page.getByText('표로 보기').click()
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2026.10' }) }).getByRole('cell')).toHaveText([
      '0원',
      '15,000원',
      '-15,000원',
    ])
  })
})

test.describe('레이아웃과 접근성', () => {
  test('차트가 화면 안에 들어오고 가로 스크롤이 없다', async ({ page }) => {
    await openHomeWithData(page, [
      ...SEED,
      { type: 'income', amount: 9_999_999_999, date: '2026-10-02', categoryId: 'cat-income-1' },
      { amount: 9_999_999_999, date: '2026-10-03', categoryId: 'cat-expense-4' },
    ])
    const viewport = page.viewportSize()!
    for (const chart of [donut(page), trend(page)]) {
      await chart.scrollIntoViewIfNeeded()
      const box = await chart.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
      expect(box!.height).toBeGreaterThan(50)
    }
    await expect(trend(page)).toContainText('100억')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })

  test('표로 보기는 키보드로 펼칠 수 있다', async ({ page }) => {
    await openHomeWithData(page)
    const summary = page.getByText('표로 보기')
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('table', { name: '최근 6개월 수입·지출' })).toBeVisible()
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`차트 스크린샷 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openHomeWithData(page)
      await page.getByText('표로 보기').click()
      await page.screenshot({
        path: `test-results/screenshots/charts-${testInfo.project.name}-${scheme}.png`,
        fullPage: true,
      })
    })
  }
})
