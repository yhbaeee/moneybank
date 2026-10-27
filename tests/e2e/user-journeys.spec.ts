import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { addTransaction, fixToday, openFilterPanel, filterBar } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const mainNav = (page: Page) => page.getByRole('navigation', { name: '주 메뉴' })
const monthNav = (page: Page) => page.getByRole('navigation', { name: '월 이동' })
const card = (page: Page, name: '수입' | '지출' | '잔액') => page.getByRole('group', { name })
const donut = (page: Page) => page.getByRole('img', { name: /카테고리별 지출 비율 도넛 차트/ })

async function goTo(page: Page, tab: '홈' | '내역' | '설정') {
  await mainNav(page).getByRole('link', { name: tab }).click()
  await expect(page.getByRole('heading', { level: 1, name: tab })).toBeVisible()
}

async function expectSummary(page: Page, income: string, expense: string, balance: string) {
  await expect(card(page, '수입')).toContainText(income)
  await expect(card(page, '지출')).toContainText(expense)
  await expect(card(page, '잔액')).toContainText(balance)
}

/**
 * PRD의 핵심 사용자 여정을 화면 이동(주소 직접 이동 없이)만으로 한 번에 이어서 검증한다.
 * 단계별 테스트가 모두 통과해도 단계 사이의 연결(상태 공유, 갱신, 저장)에서 생기는 문제를 잡기 위한 통합 시나리오다.
 */
test('핵심 사용자 여정: 기록 → 요약 → 탐색 → 수정·삭제 → 카테고리 → 백업·복원', { tag: '@core' }, async ({ page }) => {
  // 11단계에 걸친 긴 시나리오(다운로드·가져오기 포함)라 느린 엔진·부하에서는 기본 30초가 빠듯하다.
  test.slow()
  await test.step('첫 진입: 빈 화면과 0원 요약', async () => {
    await page.goto('/')
    await expect(page).toHaveTitle('홈 · 가계부')
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    await expect(monthNav(page)).toContainText('2026년 10월')
    await expectSummary(page, '0원', '0원', '0원')
    await expect(page.getByText('이 달의 지출 내역이 없습니다')).toBeVisible()
  })

  await test.step('수입·지출 기록 (지난달 1건 포함)', async () => {
    await addTransaction(page, { type: 'income', amount: '3,000,000', date: '2026-10-01', category: '급여', memo: '10월 급여' })
    await addTransaction(page, { amount: '12,000', date: '2026-10-10', category: '식비', payment: '체크카드', memo: '점심', tags: '외식' })
    await addTransaction(page, { amount: '3,000', date: '2026-10-11', category: '교통', memo: '버스' })
    await addTransaction(page, { amount: '45,000', date: '2026-10-12', category: '쇼핑', memo: '운동화', tags: '운동' })
    await addTransaction(page, { amount: '40,000', date: '2026-09-15', category: '식비', memo: '지난달 식사' })
  })

  await test.step('홈: 월 요약, 카테고리 집계, 6개월 추이', async () => {
    await expectSummary(page, '3,000,000원', '60,000원', '2,940,000원')
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 쇼핑 75.0%, 식비 20.0%, 교통 5.0%')
    await page.getByText('표로 보기').click()
    const table = page.getByRole('table', { name: '최근 6개월 수입·지출' })
    const row = (month: string) => table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: month }) })
    await expect(row('2026.10').getByRole('cell')).toHaveText(['3,000,000원', '60,000원', '2,940,000원'])
    await expect(row('2026.09').getByRole('cell')).toHaveText(['0원', '40,000원', '-40,000원'])
  })

  await test.step('내역: 월 이동, 검색, 필터', async () => {
    await goTo(page, '내역')
    await expect(page.getByRole('listitem')).toHaveCount(4)

    await monthNav(page).getByRole('button', { name: '이전 달' }).click()
    await expect(monthNav(page)).toContainText('2026년 9월')
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /지난달 식사/ })).toContainText('-40,000원')
    await monthNav(page).getByRole('button', { name: '이번 달' }).click()
    await expect(monthNav(page)).toContainText('2026년 10월')

    await filterBar(page).getByLabel('검색').fill('운동')
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /운동화/ })).toBeVisible()
    await filterBar(page).getByLabel('검색').fill('')

    await openFilterPanel(page)
    await filterBar(page).getByLabel('유형').selectOption({ label: '수입' })
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await filterBar(page).getByRole('button', { name: '필터 초기화' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(4)
  })

  await test.step('수정: 금액을 바꾸면 홈 요약과 집계에 반영', async () => {
    await page.getByRole('button', { name: /운동화/ }).click()
    const dialog = page.getByRole('dialog', { name: '내역 수정' })
    await dialog.getByLabel('금액').fill('15000')
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await goTo(page, '홈')
    await expectSummary(page, '3,000,000원', '30,000원', '2,970,000원')
  })

  await test.step('삭제: 확인 후 내역이 사라지고 요약이 갱신', async () => {
    await goTo(page, '내역')
    await page.getByRole('button', { name: /점심/ }).click()
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('button', { name: /점심/ })).toHaveCount(0)
    await goTo(page, '홈')
    await expectSummary(page, '3,000,000원', '18,000원', '2,982,000원')
    await expect(donut(page)).toHaveAttribute('aria-label', '카테고리별 지출 비율 도넛 차트: 쇼핑 83.3%, 교통 16.7%')
  })

  await test.step('카테고리 추가 후 내역에 사용', async () => {
    await goTo(page, '설정')
    await page.getByRole('link', { name: '카테고리 관리' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const form = page.getByRole('dialog', { name: '지출 카테고리 추가' })
    await form.getByLabel('이름').fill('반려동물')
    await form.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('list', { name: '지출 카테고리 목록' })).toContainText('반려동물')

    await goTo(page, '홈')
    await addTransaction(page, { amount: '22,000', date: '2026-10-20', category: '반려동물', memo: '사료' })
    await expectSummary(page, '3,000,000원', '40,000원', '2,960,000원')
    await expect(donut(page)).toContainText('4만원')
  })

  let before: string[] = []
  let backupText = ''
  await test.step('백업: 내보내기', async () => {
    await goTo(page, '내역')
    before = await page.getByRole('listitem').allInnerTexts()
    expect(before).toHaveLength(4)
    await goTo(page, '설정')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '백업 파일 내보내기' }).click()])
    expect(download.suggestedFilename()).toBe('가계부-백업-2026-10-27.json')
    backupText = readFileSync(await download.path(), 'utf-8')
    expect(JSON.parse(backupText).transactions).toHaveLength(5)
  })

  await test.step('초기화: 모든 데이터가 기본 상태로', async () => {
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    await page.getByRole('dialog', { name: '모든 데이터를 초기화할까요?' }).getByRole('button', { name: '초기화' }).click()
    await expect(page.getByRole('status').filter({ hasText: '모든 데이터를 초기화했습니다' })).toBeVisible()
    await goTo(page, '홈')
    await expectSummary(page, '0원', '0원', '0원')
  })

  await test.step('복원: 백업 파일을 가져오면 초기화 전과 같다', async () => {
    await goTo(page, '설정')
    await page.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) })
    const confirm = page.getByRole('dialog', { name: '백업으로 바꿀까요?' })
    await expect(confirm).toContainText('백업 파일의 데이터(내역 5건, 카테고리 14개)')
    await confirm.getByRole('button', { name: '바꾸기' }).click()
    await expect(page.getByRole('status').filter({ hasText: '백업을 가져왔습니다' })).toBeVisible()

    await goTo(page, '홈')
    await expectSummary(page, '3,000,000원', '40,000원', '2,960,000원')
    await goTo(page, '내역')
    expect(await page.getByRole('listitem').allInnerTexts()).toEqual(before)
  })

  await test.step('새로고침 후에도 데이터 유지', async () => {
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
    expect(await page.getByRole('listitem').allInnerTexts()).toEqual(before)
    await goTo(page, '홈')
    await expectSummary(page, '3,000,000원', '40,000원', '2,960,000원')
  })
})

test('데이터 보호 여정: 손상된 저장 데이터는 덮어쓰지 않고, 백업으로 복구할 수 있다', { tag: '@core' }, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
  await addTransaction(page, { amount: '9,000', date: '2026-10-05', category: '식비', memo: '보호할 내역' })
  await goTo(page, '설정')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '백업 파일 내보내기' }).click()])
  const backupText = readFileSync(await download.path(), 'utf-8')

  // 저장 데이터가 손상된 상황(다른 도구가 값을 망가뜨림)
  await page.evaluate(() => localStorage.setItem('ledger.data', '{broken'))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: '저장된 데이터를 읽을 수 없습니다' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('ledger.data'))).toBe('{broken')

  // 사용자는 복구 화면에서 손상된 원본을 따로 저장해 둔 뒤, 백업 파일로 복구한다(저장소를 직접 만질 필요 없음).
  const [rawDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '손상된 원본 데이터 저장' }).click()])
  expect(readFileSync(await rawDownload.path(), 'utf-8')).toBe('{broken')
  await page.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) })
  await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
  await goTo(page, '내역')
  await expect(page.getByRole('button', { name: /보호할 내역/ })).toContainText('-9,000원')
})
