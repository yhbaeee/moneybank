import { expect, test, type Page } from '@playwright/test'
import { addTransaction, fixToday, openHome } from './helpers.ts'

function card(page: Page, name: '수입' | '지출' | '잔액') {
  return page.getByRole('group', { name })
}

function breakdownRows(page: Page) {
  return page.getByRole('list', { name: '카테고리별 지출' }).getByRole('listitem')
}

test.beforeEach(async ({ page }) => {
  await fixToday(page) // 오늘 = 2026-10-27
})

test.describe('월별 요약', () => {
  test('내역이 없으면 0원과 빈 상태를 표시한다', async ({ page }) => {
    await openHome(page)
    await expect(page.getByText('2026년 10월')).toBeVisible()
    await expect(card(page, '수입')).toContainText('0원')
    await expect(card(page, '지출')).toContainText('0원')
    await expect(card(page, '잔액')).toContainText('0원')
    await expect(page.getByText('이 달의 지출 내역이 없습니다')).toBeVisible()
    await expect(page.getByText('이 달의 내역이 없습니다')).toBeVisible()
  })

  test('이번 달 내역만 집계하고 이웃 달은 제외한다', { tag: '@core' }, async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { type: 'income', amount: '3,000,000', date: '2026-10-25', category: '급여' })
    await addTransaction(page, { amount: '12,000', date: '2026-10-27', category: '식비' })
    await addTransaction(page, { amount: '8,000', date: '2026-10-03', category: '식비' })
    await addTransaction(page, { amount: '5,000', date: '2026-10-31', category: '교통' })
    // 이웃 달: 집계에서 제외되어야 한다.
    await addTransaction(page, { amount: '99,999', date: '2026-09-30', category: '쇼핑' })
    await addTransaction(page, { type: 'income', amount: '1,000', date: '2026-11-01', category: '부수입' })

    await expect(card(page, '수입')).toContainText('3,000,000원')
    await expect(card(page, '지출')).toContainText('25,000원')
    await expect(card(page, '잔액')).toContainText('2,975,000원')

    await expect(breakdownRows(page)).toHaveCount(2)
    await expect(breakdownRows(page).nth(0)).toContainText('식비')
    await expect(breakdownRows(page).nth(0)).toContainText('20,000원')
    await expect(breakdownRows(page).nth(0)).toContainText('80.0%')
    await expect(breakdownRows(page).nth(1)).toContainText('교통')
    await expect(breakdownRows(page).nth(1)).toContainText('5,000원')
    await expect(breakdownRows(page).nth(1)).toContainText('20.0%')
    await expect(page.getByText('쇼핑')).toHaveCount(0)
  })

  test('최근 내역은 이번 달 것만 최대 5건 보여 준다', async ({ page }) => {
    await openHome(page)
    for (let day = 1; day <= 6; day++) {
      await addTransaction(page, { amount: '1,000', date: `2026-10-0${day}`, memo: `내역${day}` })
    }
    await addTransaction(page, { amount: '1,000', date: '2026-09-30', memo: '지난달' })

    const recent = page.getByRole('region', { name: '최근 내역' })
    await expect(recent.getByRole('listitem')).toHaveCount(5)
    await expect(recent.getByText('내역6')).toBeVisible()
    await expect(recent.getByText('내역1')).toHaveCount(0)
    await expect(recent.getByText('지난달')).toHaveCount(0)
    await recent.getByRole('link', { name: '전체 보기' }).click()
    await expect(page).toHaveURL(/\/transactions$/)
  })

  test('음수 잔액은 - 부호로 표시한다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { amount: '5,000', date: '2026-10-10', category: '식비' })
    await expect(card(page, '수입')).toContainText('0원')
    await expect(card(page, '지출')).toContainText('5,000원')
    await expect(card(page, '잔액')).toContainText('-5,000원')
  })
})

test.describe('카테고리별 집계', () => {
  test('비율 합이 항상 100.0%가 되도록 나눈다 (3등분)', { tag: '@core' }, async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { amount: '1,000', date: '2026-10-10', category: '식비' })
    await addTransaction(page, { amount: '1,000', date: '2026-10-11', category: '교통' })
    await addTransaction(page, { amount: '1,000', date: '2026-10-12', category: '쇼핑' })

    const rows = breakdownRows(page)
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('33.4%')
    await expect(rows.nth(1)).toContainText('33.3%')
    await expect(rows.nth(2)).toContainText('33.3%')
  })

  test('수입은 카테고리 집계에 포함하지 않는다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { type: 'income', amount: '100,000', date: '2026-10-10', category: '용돈' })
    await expect(page.getByText('이 달의 지출 내역이 없습니다')).toBeVisible()
    await expect(card(page, '수입')).toContainText('100,000원')
  })
})

test.describe('변경 후 갱신', () => {
  test('수정하면 요약과 집계가 즉시 갱신된다', { tag: '@core' }, async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { amount: '10,000', date: '2026-10-10', category: '식비', memo: '점심' })
    await addTransaction(page, { amount: '5,000', date: '2026-10-11', category: '교통', memo: '버스' })
    await expect(card(page, '지출')).toContainText('15,000원')
    await expect(breakdownRows(page).nth(0)).toContainText('66.7%')
    await expect(breakdownRows(page).nth(1)).toContainText('33.3%')

    await page.getByRole('region', { name: '최근 내역' }).getByRole('button', { name: /버스/ }).click()
    const dialog = page.getByRole('dialog', { name: '내역 수정' })
    await dialog.getByLabel('금액').fill('10000')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(card(page, '지출')).toContainText('20,000원')
    await expect(card(page, '잔액')).toContainText('-20,000원')
    await expect(breakdownRows(page).nth(0)).toContainText('50.0%')
    await expect(breakdownRows(page).nth(1)).toContainText('50.0%')
  })

  test('다른 달로 날짜를 옮기면 이번 달 집계에서 빠진다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { amount: '10,000', date: '2026-10-10', category: '식비', memo: '점심' })
    await page.getByRole('region', { name: '최근 내역' }).getByRole('button', { name: /점심/ }).click()
    const dialog = page.getByRole('dialog', { name: '내역 수정' })
    await dialog.getByLabel('날짜').fill('2026-11-01')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(card(page, '지출')).toContainText('0원')
    await expect(page.getByText('이 달의 지출 내역이 없습니다')).toBeVisible()
  })

  test('삭제하면 요약과 집계가 즉시 갱신된다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { amount: '10,000', date: '2026-10-10', category: '식비', memo: '점심' })
    await addTransaction(page, { amount: '10,000', date: '2026-10-11', category: '교통', memo: '버스' })
    await expect(card(page, '지출')).toContainText('20,000원')

    await page.getByRole('region', { name: '최근 내역' }).getByRole('button', { name: /점심/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(card(page, '지출')).toContainText('10,000원')
    await expect(breakdownRows(page)).toHaveCount(1)
    await expect(breakdownRows(page).nth(0)).toContainText('교통')
    await expect(breakdownRows(page).nth(0)).toContainText('100.0%')
  })

  test('새로고침 후에도 같은 요약이 표시된다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { type: 'income', amount: '500,000', date: '2026-10-05', category: '부수입' })
    await addTransaction(page, { amount: '120,000', date: '2026-10-06', category: '쇼핑' })
    await page.reload()
    await expect(card(page, '수입')).toContainText('500,000원')
    await expect(card(page, '지출')).toContainText('120,000원')
    await expect(card(page, '잔액')).toContainText('380,000원')
  })
})

test.describe('레이아웃', () => {
  test('가장 큰 금액도 카드 안에 들어가고 가로 스크롤이 없다', async ({ page }) => {
    await openHome(page)
    await addTransaction(page, { type: 'income', amount: '9,999,999,999', date: '2026-10-01', category: '급여' })
    await addTransaction(page, { amount: '9,999,999,999', date: '2026-10-02', category: '식비' })
    await addTransaction(page, { amount: '1', date: '2026-10-03', category: '교통' })

    await expect(card(page, '잔액')).toContainText('-1원')
    const viewport = page.viewportSize()!
    for (const name of ['수입', '지출', '잔액'] as const) {
      const box = await card(page, name).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
      const overflowing = await card(page, name).evaluate((el) => el.scrollWidth > el.clientWidth)
      expect(overflowing).toBe(false)
    }
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(pageOverflow).toBe(false)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`홈 화면 스크린샷 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openHome(page)
      await addTransaction(page, { type: 'income', amount: '3,000,000', date: '2026-10-25', category: '급여', memo: '10월 급여' })
      await addTransaction(page, { amount: '12,000', date: '2026-10-27', category: '식비', memo: '점심', tags: '외식' })
      await addTransaction(page, { amount: '8,000', date: '2026-10-03', category: '식비' })
      await addTransaction(page, { amount: '45,000', date: '2026-10-20', category: '쇼핑', memo: '운동화' })
      await addTransaction(page, { amount: '5,000', date: '2026-10-31', category: '교통' })
      await page.screenshot({
        path: `test-results/screenshots/home-${testInfo.project.name}-${scheme}.png`,
        fullPage: true,
      })
    })
  }
})
