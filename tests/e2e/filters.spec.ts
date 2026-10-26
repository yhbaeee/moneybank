import { expect, test, type Page } from '@playwright/test'
import { filterBar, fixToday, openFilterPanel, openList, seedTransactions } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
  await openList(page)
  await seedTransactions(page, [
    { amount: 12000, date: '2026-10-01', categoryId: 'cat-expense-1', paymentMethodId: 'pay-2', memo: '점심 회식', tags: ['외식', '회사'] },
    { amount: 3000, date: '2026-10-02', categoryId: 'cat-expense-2', paymentMethodId: 'pay-1', memo: '버스' },
    { amount: 45000, date: '2026-10-03', categoryId: 'cat-expense-4', paymentMethodId: 'pay-3', memo: '운동화', tags: ['운동'] },
    { amount: 8000, date: '2026-10-04', categoryId: 'cat-expense-1', paymentMethodId: 'pay-1', memo: 'Coffee', tags: ['카페', 'Work'] },
    { type: 'income', amount: 3000000, date: '2026-10-05', categoryId: 'cat-income-1', paymentMethodId: 'pay-4', memo: '10월 급여', tags: ['회사'] },
    { type: 'income', amount: 50000, date: '2026-10-06', categoryId: 'cat-income-2', paymentMethodId: 'pay-4', memo: '중고 판매' },
    // 다른 달: 월 범위 밖이라 항상 제외되어야 한다.
    { amount: 7000, date: '2026-09-30', categoryId: 'cat-expense-1', memo: '지난달 점심' },
  ])
  await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
})

const rows = (page: Page) => page.getByRole('listitem')
const summaryLine = (page: Page) => page.getByText(/^\d+건 · 수입/)
const search = (page: Page) => filterBar(page).getByLabel('검색')

async function selectFilter(page: Page, label: '유형' | '카테고리' | '결제수단' | '태그', option: string) {
  await openFilterPanel(page)
  await filterBar(page).getByLabel(label).selectOption({ label: option })
}

test.describe('기본 표시', () => {
  test('선택한 월의 전체 내역과 합계를 보여 준다', async ({ page }) => {
    await expect(rows(page)).toHaveCount(6)
    await expect(summaryLine(page)).toHaveText('6건 · 수입 3,050,000원 · 지출 68,000원')
    await expect(page.getByText('지난달 점심')).toHaveCount(0)
    await expect(filterBar(page).getByRole('button', { name: '필터 초기화' })).toHaveCount(0)
  })
})

test.describe('검색', () => {
  test('메모로 검색한다', async ({ page }) => {
    await search(page).fill('점심')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('점심 회식')
    await expect(summaryLine(page)).toHaveText('1건 · 수입 0원 · 지출 12,000원')
  })

  test('대소문자를 구분하지 않는다', async ({ page }) => {
    await search(page).fill('COFFEE')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('Coffee')
  })

  test('태그로 검색하며 #은 무시한다', async ({ page }) => {
    await search(page).fill('#회사')
    await expect(rows(page)).toHaveCount(2)
    await search(page).fill('회사')
    await expect(rows(page)).toHaveCount(2)
  })

  test('카테고리명으로 검색한다', async ({ page }) => {
    await search(page).fill('교통')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('버스')
  })

  test('여러 단어는 모두 일치해야 한다', async ({ page }) => {
    await search(page).fill('식비 coffee')
    await expect(rows(page)).toHaveCount(1)
    await search(page).fill('식비 운동')
    await expect(rows(page)).toHaveCount(0)
    await expect(page.getByText('조건에 맞는 내역이 없습니다')).toBeVisible()
  })

  test('결과가 없으면 안내와 초기화 버튼을 보여 주고, 초기화하면 전체가 돌아온다', async ({ page }) => {
    await search(page).fill('존재하지않는검색어')
    await expect(page.getByText('조건에 맞는 내역이 없습니다')).toBeVisible()
    await expect(summaryLine(page)).toHaveText('0건 · 수입 0원 · 지출 0원')
    await page.getByRole('main').getByRole('button', { name: '필터 초기화' }).last().click()
    await expect(rows(page)).toHaveCount(6)
    await expect(search(page)).toHaveValue('')
  })
})

test.describe('필터', () => {
  test('유형으로 거른다', async ({ page }) => {
    await selectFilter(page, '유형', '수입')
    await expect(rows(page)).toHaveCount(2)
    await expect(summaryLine(page)).toHaveText('2건 · 수입 3,050,000원 · 지출 0원')

    await selectFilter(page, '유형', '지출')
    await expect(rows(page)).toHaveCount(4)
    await expect(summaryLine(page)).toHaveText('4건 · 수입 0원 · 지출 68,000원')
  })

  test('카테고리로 거른다', async ({ page }) => {
    await selectFilter(page, '카테고리', '식비')
    await expect(rows(page)).toHaveCount(2)
    await expect(summaryLine(page)).toHaveText('2건 · 수입 0원 · 지출 20,000원')
  })

  test('결제수단으로 거른다', async ({ page }) => {
    await selectFilter(page, '결제수단', '현금')
    await expect(rows(page)).toHaveCount(2)
    await expect(rows(page).nth(0)).toContainText('Coffee')
    await expect(rows(page).nth(1)).toContainText('버스')
  })

  test('태그로 거르며 선택지는 이 달의 태그만 보여 준다', async ({ page }) => {
    await openFilterPanel(page)
    await expect(filterBar(page).getByLabel('태그').locator('option')).toHaveText(['전체', '외식', '운동', '카페', '회사', 'Work'])
    await selectFilter(page, '태그', '회사')
    await expect(rows(page)).toHaveCount(2)
  })

  test('여러 조건은 AND로 결합한다', async ({ page }) => {
    await selectFilter(page, '유형', '지출')
    await selectFilter(page, '태그', '회사')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('점심 회식')

    await search(page).fill('커피없음')
    await expect(rows(page)).toHaveCount(0)

    await search(page).fill('')
    await selectFilter(page, '결제수단', '현금')
    await expect(rows(page)).toHaveCount(0) // 지출 + 회사 태그 + 현금 → 없음
  })

  test('유형을 바꾸면 맞지 않는 카테고리 선택은 해제된다', async ({ page }) => {
    await selectFilter(page, '카테고리', '식비')
    await expect(rows(page)).toHaveCount(2)
    await selectFilter(page, '유형', '수입')
    await expect(filterBar(page).getByLabel('카테고리')).toHaveValue('')
    await expect(rows(page)).toHaveCount(2)
    await expect(summaryLine(page)).toHaveText('2건 · 수입 3,050,000원 · 지출 0원')
  })

  test('필터 초기화 버튼이 모든 입력을 비운다', async ({ page }) => {
    await search(page).fill('점')
    await selectFilter(page, '유형', '지출')
    await selectFilter(page, '결제수단', '체크카드')
    await filterBar(page).getByRole('button', { name: '필터 초기화' }).click()

    await expect(search(page)).toHaveValue('')
    await openFilterPanel(page)
    await expect(filterBar(page).getByLabel('유형')).toHaveValue('all')
    await expect(filterBar(page).getByLabel('결제수단')).toHaveValue('')
    await expect(rows(page)).toHaveCount(6)
  })
})

test.describe('월 이동과 필터', () => {
  test('필터는 월을 이동해도 유지되고 새 월에 적용된다', async ({ page }) => {
    await search(page).fill('점심')
    await expect(rows(page)).toHaveCount(1)

    await page.getByRole('navigation', { name: '월 이동' }).getByRole('button', { name: '이전 달' }).click()
    await expect(page.getByRole('navigation', { name: '월 이동' })).toContainText('2026년 9월')
    await expect(search(page)).toHaveValue('점심')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('지난달 점심')
  })

  test('수정·삭제하면 필터 결과와 합계가 갱신된다', async ({ page }) => {
    await search(page).fill('버스')
    await expect(rows(page)).toHaveCount(1)
    await rows(page).first().getByRole('button').click()
    const dialog = page.getByRole('dialog', { name: '내역 수정' })
    await dialog.getByLabel('금액').fill('5000')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(summaryLine(page)).toHaveText('1건 · 수입 0원 · 지출 5,000원')

    await rows(page).first().getByRole('button').click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByText('조건에 맞는 내역이 없습니다')).toBeVisible()
    await expect(search(page)).toHaveValue('버스')
  })
})

test.describe('모바일 필터 패널', () => {
  test('모바일에서는 필터가 접혀 있고 버튼으로 펼치며 활성 개수를 표시한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, '모바일 전용')
    const toggle = filterBar(page).getByRole('button', { name: '필터' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(filterBar(page).getByLabel('유형')).toBeHidden()
    await expect(search(page)).toBeVisible()

    await toggle.click()
    await expect(filterBar(page).getByLabel('유형')).toBeVisible()
    await filterBar(page).getByLabel('유형').selectOption({ label: '지출' })
    await filterBar(page).getByLabel('태그').selectOption({ label: '회사' })
    await expect(filterBar(page).getByRole('button', { name: '필터 (2)' })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })

  test('데스크톱에서는 필터가 항상 펼쳐져 있고 필터 버튼이 없다', async ({ page, isMobile }) => {
    test.skip(isMobile, '데스크톱 전용')
    await expect(filterBar(page).getByLabel('유형')).toBeVisible()
    await expect(filterBar(page).getByRole('button', { name: /^필터( \(\d+\))?$/ })).toBeHidden()
  })
})

test.describe('스크린샷', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`필터 화면 (${scheme})`, async ({ page, isMobile }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.reload()
      await search(page).fill('회')
      if (isMobile) await openFilterPanel(page)
      await selectFilter(page, '유형', '지출')
      await page.screenshot({
        path: `test-results/screenshots/filters-${testInfo.project.name}-${scheme}.png`,
        fullPage: true,
      })
    })
  }
})
