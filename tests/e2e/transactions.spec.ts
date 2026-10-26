import { expect, test } from '@playwright/test'
import { addTransaction, fillForm, openList } from './helpers.ts'

test.describe('내역 등록', () => {
  test('지출 내역을 추가할 수 있다', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('아직 내역이 없습니다')).toBeVisible()

    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = await fillForm(page, {
      amount: '12000',
      date: '2026-10-27',
      category: '식비',
      payment: '체크카드',
      memo: '점심',
      tags: '외식, 회사',
    })
    await dialog.getByRole('button', { name: '저장' }).click()

    await expect(page.getByRole('status').filter({ hasText: '저장했습니다' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '10월 27일 (화)' })).toBeVisible()
    const row = page.getByRole('button', { name: /점심/ })
    await expect(row).toContainText('식비')
    await expect(row).toContainText('체크카드')
    await expect(row).toContainText('-12,000원')
    await expect(row).toContainText('#외식')
    await expect(row).toContainText('#회사')
  })

  test('수입 내역을 추가할 수 있다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await dialog.getByRole('radio', { name: '수입' }).check()
    await expect(dialog.getByLabel('카테고리').locator('option')).toHaveText(['급여', '부수입', '용돈', '기타'])
    await fillForm(page, { type: 'income', amount: '3,000,000', date: '2026-10-25', category: '급여', memo: '10월 급여' })
    await dialog.getByRole('button', { name: '저장' }).click()

    const row = page.getByRole('button', { name: /10월 급여/ })
    await expect(row).toContainText('+3,000,000원')
    await expect(row).toContainText('급여')
  })

  test('금액 입력을 포커스를 잃을 때 쉼표로 정리한다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const amount = page.getByRole('dialog').getByLabel('금액')
    await amount.fill('1234567')
    await amount.blur()
    await expect(amount).toHaveValue('1,234,567')
  })
})

test.describe('입력값 검증', () => {
  const cases: [string, string | RegExp][] = [
    ['', '금액을 입력해 주세요.'],
    ['0', '금액은 1원 이상이어야 합니다.'],
    ['1.5', /숫자만 입력/],
    ['-100', /숫자만 입력/],
    ['10,000,000,000', /이하로 입력/],
  ]

  for (const [amount, message] of cases) {
    test(`금액 "${amount}"는 거부하고 저장하지 않는다`, async ({ page }) => {
      await openList(page)
      await page.getByRole('button', { name: '내역 추가' }).click()
      const dialog = await fillForm(page, { amount, date: '2026-10-27' })
      await dialog.getByRole('button', { name: '저장' }).click()

      await expect(dialog.getByRole('alert')).toContainText(message)
      await expect(dialog.getByLabel('금액')).toHaveAttribute('aria-invalid', 'true')
      await expect(dialog.getByLabel('금액')).toBeFocused()
      await expect(dialog).toBeVisible()

      await dialog.getByRole('button', { name: '취소' }).click()
      await expect(page.getByText('아직 내역이 없습니다')).toBeVisible()
    })
  }

  test('날짜를 비우면 거부한다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = await fillForm(page, { amount: '1000', date: '2026-10-27' })
    await dialog.getByLabel('날짜').fill('')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toContainText('올바른 날짜')
  })

  test('오류를 고치면 저장할 수 있다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = await fillForm(page, { amount: '0', date: '2026-10-27', memo: '재시도' })
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByLabel('금액').fill('500')
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('button', { name: /재시도/ })).toContainText('-500원')
  })
})

test.describe('수정과 삭제', () => {
  test('내역을 수정할 수 있다', async ({ page }) => {
    await openList(page)
    await addTransaction(page, { amount: '12000', date: '2026-10-27', category: '식비', memo: '점심' })

    await page.getByRole('button', { name: /점심/ }).click()
    const dialog = page.getByRole('dialog', { name: '내역 수정' })
    await expect(dialog.getByLabel('금액')).toHaveValue('12,000')
    await expect(dialog.getByLabel('카테고리')).toHaveValue('cat-expense-1')

    await dialog.getByLabel('금액').fill('15000')
    await dialog.getByLabel('날짜').fill('2026-10-28')
    await dialog.getByLabel('카테고리').selectOption({ label: '교통' })
    await dialog.getByLabel('메모').fill('택시')
    await dialog.getByRole('button', { name: '저장' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('listitem')).toHaveCount(1)
    const row = page.getByRole('button', { name: /택시/ })
    await expect(row).toContainText('교통')
    await expect(row).toContainText('-15,000원')
    await expect(page.getByRole('heading', { name: '10월 28일 (수)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '10월 27일 (화)' })).toHaveCount(0)
  })

  test('삭제 확인에서 취소하면 유지하고 확인하면 삭제한다', async ({ page }) => {
    await openList(page)
    await addTransaction(page, { amount: '12000', date: '2026-10-27', memo: '점심' })
    await addTransaction(page, { amount: '5000', date: '2026-10-27', memo: '커피' })

    await page.getByRole('button', { name: /점심/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    const confirm = page.getByRole('dialog', { name: '내역을 삭제할까요?' })
    await expect(confirm).toBeVisible()

    await confirm.getByRole('button', { name: '취소' }).click()
    await expect(confirm).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: '내역 수정' })).toBeVisible()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '취소' }).click()
    await expect(page.getByRole('button', { name: /점심/ })).toBeVisible()

    await page.getByRole('button', { name: /점심/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /점심/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /커피/ })).toBeVisible()
  })

  test('마지막 내역을 삭제하면 빈 상태가 표시된다', async ({ page }) => {
    await openList(page)
    await addTransaction(page, { amount: '3000', date: '2026-10-27', memo: '간식' })
    await page.getByRole('button', { name: /간식/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByText('아직 내역이 없습니다')).toBeVisible()
  })
})

test.describe('데이터 유지', () => {
  test('새로고침 후에도 내역이 유지되고 날짜 내림차순으로 표시된다', async ({ page }) => {
    await openList(page)
    await addTransaction(page, { amount: '1000', date: '2026-10-01', memo: '첫날' })
    await addTransaction(page, { amount: '2000', date: '2026-10-31', memo: '말일' })
    await addTransaction(page, { type: 'income', amount: '500000', date: '2026-10-15', category: '부수입', memo: '중순' })

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
    const rows = page.getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('말일')
    await expect(rows.nth(1)).toContainText('중순')
    await expect(rows.nth(2)).toContainText('첫날')
  })
})

test.describe('모바일/데스크톱 진입점', () => {
  test('홈 화면에서도 내역을 추가할 수 있다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    await page.getByRole('button', { name: '내역 추가' }).click()
    await expect(page.getByRole('dialog', { name: '내역 추가' })).toBeVisible()
  })

  test('폼이 화면 안에 들어오고 가로 스크롤이 없다', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()!
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    // 긴 폼은 모달 안에서 스크롤되므로 저장 버튼은 스크롤해서 접근할 수 있다.
    await dialog.getByRole('button', { name: '저장' }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: '저장' })).toBeInViewport()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
})

test.describe('스크린샷', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`내역 목록과 폼 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openList(page)
      await addTransaction(page, { amount: '12,000', date: '2026-10-27', category: '식비', payment: '체크카드', memo: '점심', tags: '외식' })
      await addTransaction(page, { type: 'income', amount: '3,000,000', date: '2026-10-27', category: '급여', memo: '10월 급여' })
      await addTransaction(page, { amount: '4,500', date: '2026-10-26', category: '교통' })
      const name = `${testInfo.project.name}-${scheme}`
      await page.screenshot({ path: `test-results/screenshots/transactions-list-${name}.png`, fullPage: true })

      await page.getByRole('button', { name: /점심/ }).click()
      await expect(page.getByRole('dialog', { name: '내역 수정' })).toBeVisible()
      await page.screenshot({ path: `test-results/screenshots/transactions-form-${name}.png` })
    })
  }
})
