import { expect, type Page } from '@playwright/test'

export interface NewTransaction {
  type?: 'expense' | 'income'
  amount: string
  date: string
  category?: string
  payment?: string
  memo?: string
  tags?: string
}

/** "오늘"을 고정한다. 반드시 page.goto 전에 호출한다. */
export async function fixToday(page: Page, isoDate = '2026-10-27') {
  await page.clock.setFixedTime(new Date(`${isoDate}T12:00:00+09:00`))
}

export async function openList(page: Page) {
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
}

export async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
}

/** 열려 있는 등록 폼에 입력한다. 저장 버튼은 누르지 않는다. */
export async function fillForm(page: Page, tx: NewTransaction) {
  const dialog = page.getByRole('dialog', { name: '내역 추가' })
  if (tx.type === 'income') await dialog.getByRole('radio', { name: '수입' }).check()
  await dialog.getByLabel('금액').fill(tx.amount)
  await dialog.getByLabel('날짜').fill(tx.date)
  if (tx.category) await dialog.getByLabel('카테고리').selectOption({ label: tx.category })
  if (tx.payment) await dialog.getByLabel('결제수단').selectOption({ label: tx.payment })
  if (tx.memo) await dialog.getByLabel('메모').fill(tx.memo)
  if (tx.tags) await dialog.getByLabel('태그').fill(tx.tags)
  return dialog
}

/** 현재 화면에서 "내역 추가"를 눌러 입력하고 저장한다. */
export async function addTransaction(page: Page, tx: NewTransaction) {
  await page.getByRole('button', { name: '내역 추가' }).click()
  const dialog = await fillForm(page, tx)
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

export interface SeedTransaction {
  type?: 'expense' | 'income'
  amount: number
  date: string
  /** 기본 카테고리 id (예: cat-expense-1=식비, cat-expense-2=교통, cat-income-1=급여) */
  categoryId: string
  /** 기본 결제수단 id (pay-1=현금, pay-2=체크카드, pay-3=신용카드, pay-4=계좌이체) */
  paymentMethodId?: string
  memo?: string
  tags?: string[]
}

/**
 * localStorage 문서에 거래를 직접 추가한 뒤 새로고침한다. 많은 데이터가 필요한 시나리오를 빠르게 준비할 때 쓴다.
 * 앱이 최초 데이터를 저장한 뒤여야 하므로 먼저 페이지를 한 번 열어야 한다.
 */
export async function seedTransactions(page: Page, transactions: SeedTransaction[]) {
  await page.evaluate((items) => {
    const key = 'ledger.data'
    const data = JSON.parse(localStorage.getItem(key)!)
    items.forEach((item, index) => {
      data.transactions.push({
        id: `seed-${data.transactions.length + 1}`,
        type: item.type ?? 'expense',
        amount: item.amount,
        date: item.date,
        categoryId: item.categoryId,
        paymentMethodId: item.paymentMethodId ?? 'pay-1',
        memo: item.memo ?? '',
        tags: item.tags ?? [],
        ownerId: 'member-me',
        createdAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
        updatedAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
      })
    })
    localStorage.setItem(key, JSON.stringify(data))
  }, transactions)
  await page.reload()
}

/** 모바일에서는 접혀 있는 필터 패널을 펼친다(데스크톱은 항상 펼쳐져 있어 아무 일도 하지 않는다). */
export async function openFilterPanel(page: Page) {
  const toggle = page.getByRole('button', { name: /^필터( \(\d+\))?$/ })
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click()
  }
}

export function filterBar(page: Page) {
  return page.getByRole('region', { name: '내역 필터' })
}
