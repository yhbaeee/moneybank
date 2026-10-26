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
