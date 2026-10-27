import { expect, test, type Page } from '@playwright/test'
import { addTransaction, fixToday, openHome, openList, seedTransactions } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const expenseList = (page: Page) => page.getByRole('list', { name: '지출 카테고리 목록' })
const incomeList = (page: Page) => page.getByRole('list', { name: '수입 카테고리 목록' })

async function openCategories(page: Page) {
  await page.goto('/categories')
  await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
}

async function addCategory(page: Page, type: '지출' | '수입', name: string, color?: string) {
  await page.getByRole('button', { name: `${type} 카테고리 추가` }).click()
  const dialog = page.getByRole('dialog', { name: `${type} 카테고리 추가` })
  await dialog.getByLabel('이름').fill(name)
  if (color) await dialog.getByRole('radio', { name: color }).check()
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('목록', () => {
  test('지출 9개·수입 4개 기본 카테고리를 보여 주고 \'기타\'는 삭제할 수 없다', async ({ page }) => {
    await openCategories(page)
    await expect(expenseList(page).getByRole('listitem')).toHaveCount(9)
    await expect(incomeList(page).getByRole('listitem')).toHaveCount(4)
    await expect(page.getByRole('button', { name: '지출 카테고리 식비 삭제' })).toBeVisible()
    await expect(page.getByRole('button', { name: '지출 카테고리 기타 삭제' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '수입 카테고리 기타 삭제' })).toHaveCount(0)
    await expect(page.getByText('삭제 불가')).toHaveCount(2)
  })

  test('설정 화면에서 카테고리 관리로 이동할 수 있다', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('link', { name: '카테고리 관리' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
    await expect(page).toHaveTitle('카테고리 관리 · 가계부')
  })
})

test.describe('추가', () => {
  test('카테고리를 추가하면 목록·내역 폼·차트에서 쓸 수 있고 새로고침 후에도 유지된다', async ({ page }) => {
    await openCategories(page)
    await addCategory(page, '지출', '반려동물', '보라')
    await expect(expenseList(page).getByRole('listitem')).toHaveCount(10)
    await expect(expenseList(page).getByRole('listitem').last()).toContainText('반려동물')
    await expect(incomeList(page)).not.toContainText('반려동물')

    // 내역 폼에서 선택해 저장
    await openList(page)
    await addTransaction(page, { amount: '30,000', date: '2026-10-05', category: '반려동물', memo: '사료' })
    await expect(page.getByRole('button', { name: /사료/ })).toContainText('반려동물')

    // 홈 도넛에 반영
    await openHome(page)
    await expect(page.getByRole('img', { name: /카테고리별 지출 비율 도넛 차트: 반려동물 100.0%/ })).toBeVisible()
    await expect(page.locator('circle[data-category] ').first()).toHaveAttribute('stroke', '#a855f7')

    // 새로고침 후에도 유지
    await page.goto('/categories')
    await expect(expenseList(page)).toContainText('반려동물')
    await expect(expenseList(page).getByRole('listitem').last()).toContainText('1건')
  })

  test('수입 카테고리도 추가한다', async ({ page }) => {
    await openCategories(page)
    await addCategory(page, '수입', '이자')
    await expect(incomeList(page).getByRole('listitem')).toHaveCount(5)
    await expect(expenseList(page)).not.toContainText('이자')
  })

  test('빈 이름·중복 이름은 거부하고 필드 오류를 표시하며, 고치면 저장된다', async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '지출 카테고리 추가' })

    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toContainText('1~20자')
    await expect(dialog.getByLabel('이름')).toBeFocused()
    await expect(dialog.getByLabel('이름')).toHaveAttribute('aria-invalid', 'true')

    await dialog.getByLabel('이름').fill('식비')
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toContainText('같은 이름의 카테고리가 이미 있습니다.')

    await dialog.getByLabel('이름').fill('가'.repeat(21))
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toContainText('1~20자')

    await dialog.getByLabel('이름').fill('반려동물')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(expenseList(page)).toContainText('반려동물')
  })

  test('같은 이름도 다른 유형이면 추가할 수 있다', async ({ page }) => {
    await openCategories(page)
    await addCategory(page, '수입', '식비')
    await expect(incomeList(page)).toContainText('식비')
  })

  test('취소하면 아무것도 추가되지 않는다', async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '지출 카테고리 추가' })
    await dialog.getByLabel('이름').fill('취소할이름')
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(expenseList(page)).not.toContainText('취소할이름')
  })
})

test.describe('수정', () => {
  test('이름과 색을 바꾸면 내역 목록과 차트에 반영된다', async ({ page }) => {
    await openList(page)
    await seedTransactions(page, [{ amount: 12_000, date: '2026-10-10', categoryId: 'cat-expense-1', memo: '점심' }])

    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 식비 수정' }).click()
    const dialog = page.getByRole('dialog', { name: '지출 카테고리 수정' })
    await expect(dialog.getByLabel('이름')).toHaveValue('식비')
    await dialog.getByLabel('이름').fill('외식·식비')
    await dialog.getByRole('radio', { name: '빨강' }).check()
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(expenseList(page).getByRole('listitem').first()).toContainText('외식·식비')

    await openList(page)
    await expect(page.getByRole('button', { name: /점심/ })).toContainText('외식·식비')
    await openHome(page)
    await expect(page.locator('circle[data-category="cat-expense-1"]')).toHaveAttribute('stroke', '#ef4444')
  })

  test('수정 중 다른 카테고리와 같은 이름은 거부하고, 자기 이름 그대로는 저장된다', async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 식비 수정' }).click()
    let dialog = page.getByRole('dialog', { name: '지출 카테고리 수정' })
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: '지출 카테고리 식비 수정' }).click()
    dialog = page.getByRole('dialog', { name: '지출 카테고리 수정' })
    await dialog.getByLabel('이름').fill('교통')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toContainText('같은 이름')
  })

  test("보호된 '기타'도 이름과 색은 수정할 수 있다", async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '수입 카테고리 기타 수정' }).click()
    const dialog = page.getByRole('dialog', { name: '수입 카테고리 수정' })
    await dialog.getByLabel('이름').fill('기타 수입')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(incomeList(page)).toContainText('기타 수입')
    await expect(page.getByRole('button', { name: '수입 카테고리 기타 수입 삭제' })).toHaveCount(0)
  })
})

test.describe('삭제', () => {
  test('사용하지 않는 카테고리는 확인 후 삭제하고, 취소하면 유지한다', async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 교통 삭제' }).click()
    const dialog = page.getByRole('dialog', { name: '카테고리 삭제' })
    await expect(dialog).toContainText('‘교통’ 카테고리를 삭제할까요?')
    await expect(dialog.getByLabel('옮길 카테고리')).toHaveCount(0)
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(expenseList(page)).toContainText('교통')

    await page.getByRole('button', { name: '지출 카테고리 교통 삭제' }).click()
    await page.getByRole('dialog', { name: '카테고리 삭제' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(expenseList(page)).not.toContainText('교통')
    await expect(expenseList(page).getByRole('listitem')).toHaveCount(8)
    // 삭제 후 포커스가 사라지지 않는다.
    await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeFocused()
  })

  test('사용 중인 카테고리는 내역을 다른 카테고리로 옮겨야 삭제된다', { tag: '@core' }, async ({ page }) => {
    await openList(page)
    await seedTransactions(page, [
      { amount: 10_000, date: '2026-10-10', categoryId: 'cat-expense-1', memo: '점심' },
      { amount: 5_000, date: '2026-10-11', categoryId: 'cat-expense-1', memo: '저녁' },
      { amount: 3_000, date: '2026-10-12', categoryId: 'cat-expense-2', memo: '버스' },
    ])

    await openCategories(page)
    await expect(expenseList(page).getByRole('listitem').first()).toContainText('2건')
    await page.getByRole('button', { name: '지출 카테고리 식비 삭제' }).click()
    const dialog = page.getByRole('dialog', { name: '카테고리 삭제' })
    await expect(dialog).toContainText('내역이 2건 있습니다')
    await expect(dialog.getByLabel('옮길 카테고리')).toHaveValue('cat-expense-9') // '기타'가 기본값
    await expect(dialog.getByLabel('옮길 카테고리').locator('option')).toHaveCount(8)
    await expect(dialog.getByLabel('옮길 카테고리')).not.toContainText('식비')

    await dialog.getByLabel('옮길 카테고리').selectOption({ label: '교통' })
    await dialog.getByRole('button', { name: '옮기고 삭제' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: '내역 2건을 옮기고 삭제했습니다' })).toBeVisible()
    await expect(expenseList(page)).not.toContainText('식비')
    // 옮긴 내역 수: 교통 1건 + 2건 = 3건
    await expect(expenseList(page).getByRole('listitem').first()).toContainText('3건')

    await openList(page)
    await expect(page.getByRole('button', { name: /점심/ })).toContainText('교통')
    await expect(page.getByRole('button', { name: /저녁/ })).toContainText('교통')
  })

  test('수입 카테고리 삭제는 수입 카테고리로만 옮길 수 있다', async ({ page }) => {
    await openList(page)
    await seedTransactions(page, [{ type: 'income', amount: 100_000, date: '2026-10-01', categoryId: 'cat-income-3', memo: '용돈받음' }])
    await openCategories(page)
    await page.getByRole('button', { name: '수입 카테고리 용돈 삭제' }).click()
    const dialog = page.getByRole('dialog', { name: '카테고리 삭제' })
    const options = await dialog.getByLabel('옮길 카테고리').locator('option').allTextContents()
    expect(options).toEqual(['급여', '부수입', '기타'])
  })
})

test.describe('키보드와 레이아웃', () => {
  test('키보드만으로 카테고리를 추가한다', async ({ page }) => {
    await openCategories(page)
    const add = page.getByRole('button', { name: '지출 카테고리 추가' })
    await add.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: '지출 카테고리 추가' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('이름').focus()
    await page.keyboard.type('키보드카테고리')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(expenseList(page)).toContainText('키보드카테고리')
    await expect(add).toBeFocused()
  })

  test('색상은 방향키로 고를 수 있다', async ({ page }) => {
    await openCategories(page)
    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '지출 카테고리 추가' })
    const first = dialog.getByRole('radio', { name: '인디고' })
    await first.focus()
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByRole('radio', { name: '하늘' })).toBeChecked()
  })

  test('긴 이름과 많은 카테고리에서도 화면 안에 들어오고 가로 스크롤이 없다', async ({ page }) => {
    await openCategories(page)
    for (const name of ['가'.repeat(20), 'LongNameWithoutSpaces12']) {
      await addCategory(page, '지출', name.slice(0, 20))
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const box = await page.getByRole('dialog', { name: '지출 카테고리 추가' }).boundingBox()
    const viewport = page.viewportSize()!
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`스크린샷 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openList(page)
      await seedTransactions(page, [
        { amount: 10_000, date: '2026-10-10', categoryId: 'cat-expense-1' },
        { amount: 3_000, date: '2026-10-12', categoryId: 'cat-expense-2' },
      ])
      await openCategories(page)
      await page.screenshot({ path: `test-results/screenshots/categories-${testInfo.project.name}-${scheme}.png`, fullPage: true })

      await page.getByRole('button', { name: '지출 카테고리 식비 삭제' }).click()
      await expect(page.getByRole('dialog', { name: '카테고리 삭제' })).toBeVisible()
      await page.screenshot({ path: `test-results/screenshots/categories-delete-${testInfo.project.name}-${scheme}.png` })
    })
  }
})
