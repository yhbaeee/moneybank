import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fixToday, openFilterPanel, openHome, openList, seedTransactions, type SeedTransaction } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** WCAG 2.1 A/AA 규칙 위반이 없어야 한다. 실패하면 위반 규칙과 대상 요소를 메시지에 담는다. */
async function expectNoViolations(page: Page, context: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes
          .slice(0, 4)
          .map((n) => `    - ${n.target.join(' ')}\n      ${n.failureSummary?.split('\n').slice(1, 3).join(' / ')}`)
          .join('\n'),
    )
    .join('\n')
  expect(violations, `${context}에서 접근성 위반 ${violations.length}건\n${summary}`).toEqual([])
}

const DATA: SeedTransaction[] = [
  { amount: 10_000, date: '2026-05-10', categoryId: 'cat-expense-1', memo: '5월 식사', tags: ['외식'] },
  { type: 'income', amount: 100_000, date: '2026-06-01', categoryId: 'cat-income-1', memo: '6월 급여' },
  { amount: 30_000, date: '2026-08-15', categoryId: 'cat-expense-2', memo: '택시' },
  { type: 'income', amount: 80_000, date: '2026-09-01', categoryId: 'cat-income-1' },
  { amount: 40_000, date: '2026-09-15', categoryId: 'cat-expense-1' },
  { type: 'income', amount: 3_000_000, date: '2026-10-01', categoryId: 'cat-income-1', memo: '10월 급여', tags: ['회사'] },
  { amount: 20_000, date: '2026-10-10', categoryId: 'cat-expense-1', paymentMethodId: 'pay-2', memo: '점심', tags: ['외식', '회사'] },
  { amount: 10_000, date: '2026-10-11', categoryId: 'cat-expense-2', memo: '버스' },
  { amount: 45_000, date: '2026-10-12', categoryId: 'cat-expense-4', paymentMethodId: 'pay-3', memo: '운동화', tags: ['운동'] },
  { amount: 8_000, date: '2026-10-13', categoryId: 'cat-expense-3', memo: '통신비' },
]

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`접근성 자동 검사 (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
    })

    test('홈: 내역이 없을 때', async ({ page }) => {
      await openHome(page)
      await expectNoViolations(page, '홈(빈 상태)')
    })

    test('홈: 데이터가 있을 때(차트 표 펼침)', async ({ page }) => {
      await openHome(page)
      await seedTransactions(page, DATA)
      await page.getByText('표로 보기').click()
      await expectNoViolations(page, '홈(데이터)')
    })

    test('내역: 목록과 필터 펼침', async ({ page }) => {
      await openList(page)
      await seedTransactions(page, DATA)
      await openFilterPanel(page)
      await expectNoViolations(page, '내역(필터 펼침)')
    })

    test('내역: 필터 적용 상태와 결과 없음', async ({ page }) => {
      await openList(page)
      await seedTransactions(page, DATA)
      await page.getByLabel('검색').fill('존재하지않는검색어')
      await expect(page.getByText('조건에 맞는 내역이 없습니다')).toBeVisible()
      await expectNoViolations(page, '내역(결과 없음)')
    })

    test('내역: 빈 달', async ({ page }) => {
      await openList(page)
      await expectNoViolations(page, '내역(빈 달)')
    })

    test('등록 폼', async ({ page }) => {
      await openList(page)
      await page.getByRole('button', { name: '내역 추가' }).click()
      await expect(page.getByRole('dialog', { name: '내역 추가' })).toBeVisible()
      await expectNoViolations(page, '등록 폼')
    })

    test('등록 폼: 오류 표시 상태', async ({ page }) => {
      await openList(page)
      await page.getByRole('button', { name: '내역 추가' }).click()
      const dialog = page.getByRole('dialog', { name: '내역 추가' })
      await dialog.getByLabel('날짜').fill('')
      await dialog.getByRole('button', { name: '저장' }).click()
      await expect(dialog.getByRole('alert').first()).toBeVisible()
      await expectNoViolations(page, '등록 폼(오류)')
    })

    test('수정 폼과 삭제 확인', async ({ page }) => {
      await openList(page)
      await seedTransactions(page, DATA)
      await page.getByRole('button', { name: /점심/ }).click()
      await expect(page.getByRole('dialog', { name: '내역 수정' })).toBeVisible()
      await expectNoViolations(page, '수정 폼')

      await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
      await expect(page.getByRole('dialog', { name: '내역을 삭제할까요?' })).toBeVisible()
      await expectNoViolations(page, '삭제 확인')
    })

    test('설정', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
      await expectNoViolations(page, '설정')
    })

    test('카테고리 관리', async ({ page }) => {
      await page.goto('/categories')
      await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
      await expectNoViolations(page, '카테고리 관리')
    })
  })
}
