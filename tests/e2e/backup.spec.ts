import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { fixToday, openList, seedTransactions, type SeedTransaction } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const DATA: SeedTransaction[] = [
  { amount: 12_000, date: '2026-10-10', categoryId: 'cat-expense-1', paymentMethodId: 'pay-2', memo: '점심', tags: ['외식'] },
  { type: 'income', amount: 3_000_000, date: '2026-10-01', categoryId: 'cat-income-1', paymentMethodId: 'pay-4', memo: '10월 급여' },
  { amount: 45_000, date: '2026-10-12', categoryId: 'cat-expense-4', memo: '운동화', tags: ['운동', '쇼핑'] },
]

async function openSettings(page: Page) {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
}

async function prepareData(page: Page) {
  await openList(page)
  await seedTransactions(page, DATA)
}

async function exportBackup(page: Page): Promise<{ fileName: string; text: string }> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '백업 파일 내보내기' }).click(),
  ])
  const path = await download.path()
  return { fileName: download.suggestedFilename(), text: readFileSync(path, 'utf-8') }
}

async function chooseFile(page: Page, name: string, content: string) {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) })
}

const storedData = (page: Page) => page.evaluate(() => localStorage.getItem('ledger.data'))

/** 내역 화면의 행 텍스트(순서 포함) */
async function listSnapshot(page: Page) {
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
  return page.getByRole('listitem').allInnerTexts()
}

test.describe('내보내기', () => {
  test('날짜가 들어간 JSON 파일을 내려받는다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const { fileName, text } = await exportBackup(page)
    expect(fileName).toBe('가계부-백업-2026-10-27.json')

    const backup = JSON.parse(text)
    expect(backup.schemaVersion).toBe(1)
    expect(typeof backup.exportedAt).toBe('string')
    expect(backup.transactions).toHaveLength(3)
    expect(backup.categories).toHaveLength(13)
    expect(backup.paymentMethods).toHaveLength(5)
    expect(backup.members).toHaveLength(1)
    expect(backup.theme).toBeUndefined() // 테마는 기기 설정이라 백업에 포함하지 않는다.
    await expect(page.getByRole('status').filter({ hasText: '백업 파일을 내려받았습니다' })).toBeVisible()
  })

  test('데이터가 없어도 내보낼 수 있다', async ({ page }) => {
    await openSettings(page)
    const { text } = await exportBackup(page)
    expect(JSON.parse(text).transactions).toEqual([])
  })
})

test.describe('내보내기 → 초기화 → 가져오기 왕복', () => {
  test('복원 후 내역과 카테고리가 이전과 같다', async ({ page }) => {
    await prepareData(page)

    // 직접 만든 카테고리도 포함해 백업한다.
    await page.goto('/categories')
    await page.getByRole('button', { name: '지출 카테고리 추가' }).click()
    const form = page.getByRole('dialog', { name: '지출 카테고리 추가' })
    await form.getByLabel('이름').fill('반려동물')
    await form.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const before = await listSnapshot(page)
    expect(before).toHaveLength(3)
    const storedBefore = await storedData(page)

    await openSettings(page)
    const { text } = await exportBackup(page)

    // 초기화: 내역과 직접 만든 카테고리가 사라진다.
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    const confirmReset = page.getByRole('dialog', { name: '모든 데이터를 초기화할까요?' })
    await expect(confirmReset).toContainText('내역 3건과 카테고리 14개')
    await confirmReset.getByRole('button', { name: '초기화' }).click()
    await expect(page.getByRole('status').filter({ hasText: '모든 데이터를 초기화했습니다' })).toBeVisible()
    expect(await listSnapshot(page)).toEqual([])
    await page.goto('/categories')
    await expect(page.getByRole('list', { name: '지출 카테고리 목록' })).not.toContainText('반려동물')

    // 가져오기로 복원
    await openSettings(page)
    await chooseFile(page, 'backup.json', text)
    const confirmImport = page.getByRole('dialog', { name: '백업으로 바꿀까요?' })
    await expect(confirmImport).toContainText('현재 데이터(내역 0건, 카테고리 13개)')
    await expect(confirmImport).toContainText('백업 파일의 데이터(내역 3건, 카테고리 14개)')
    await confirmImport.getByRole('button', { name: '바꾸기' }).click()
    await expect(page.getByRole('status').filter({ hasText: '백업을 가져왔습니다 (내역 3건, 카테고리 14개)' })).toBeVisible()

    expect(await listSnapshot(page)).toEqual(before)
    expect(await storedData(page)).toBe(storedBefore)
    await page.goto('/categories')
    await expect(page.getByRole('list', { name: '지출 카테고리 목록' })).toContainText('반려동물')
  })

  test('가져온 데이터는 새로고침해도 유지되고 홈 요약에 반영된다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const { text } = await exportBackup(page)
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '초기화' }).click()

    await chooseFile(page, 'backup.json', text)
    await page.getByRole('dialog', { name: '백업으로 바꿀까요?' }).getByRole('button', { name: '바꾸기' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.goto('/')
    await expect(page.getByRole('group', { name: '수입' })).toContainText('3,000,000원')
    await expect(page.getByRole('group', { name: '지출' })).toContainText('57,000원')
    await page.reload()
    await expect(page.getByRole('group', { name: '잔액' })).toContainText('2,943,000원')
  })
})

test.describe('잘못된 파일', () => {
  const cases: [string, string, string | RegExp][] = [
    ['JSON이 아닌 파일', '이건 JSON이 아닙니다', 'JSON 형식이 올바르지 않습니다.'],
    ['배열 JSON', '[]', '데이터 형식이 올바르지 않습니다.'],
    ['schemaVersion 없음', '{"members":[]}', 'schemaVersion이 올바르지 않습니다.'],
    ['더 새로운 버전', JSON.stringify({ schemaVersion: 99 }), '더 새로운 버전'],
    ['필드 누락', JSON.stringify({ schemaVersion: 1, members: [], categories: [], paymentMethods: [] }), '데이터 형식이 올바르지 않습니다.'],
  ]

  for (const [name, content, message] of cases) {
    test(`${name}은(는) 거부하고 기존 데이터를 바꾸지 않는다`, async ({ page }) => {
      await prepareData(page)
      await openSettings(page)
      const before = await storedData(page)

      await chooseFile(page, 'bad.json', content)
      const alert = page.getByRole('alert')
      await expect(alert).toContainText('백업 파일을 가져올 수 없습니다. 기존 데이터는 변경되지 않았습니다.')
      await expect(alert).toContainText(message)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(await storedData(page)).toBe(before)
    })
  }

  test('내용 검증에 실패하면 문제 위치를 보여 준다(최대 5개)', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const { text } = await exportBackup(page)
    const broken = JSON.parse(text)
    broken.transactions = broken.transactions.map((t: Record<string, unknown>, i: number) => ({ ...t, amount: -1, categoryId: `없는-${i}` }))
    const before = await storedData(page)

    await chooseFile(page, 'broken.json', JSON.stringify(broken))
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('데이터 검증에 실패했습니다.')
    const problems = alert.getByRole('listitem')
    expect(await problems.count()).toBeGreaterThan(0)
    expect(await problems.count()).toBeLessThanOrEqual(5)
    await expect(alert).toContainText('transactions[0]')
    expect(await storedData(page)).toBe(before)
  })

  test('오류 뒤에 올바른 파일을 고르면 오류가 사라지고 진행된다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const { text } = await exportBackup(page)
    await chooseFile(page, 'bad.json', 'x')
    await expect(page.getByRole('alert')).toBeVisible()
    await chooseFile(page, 'backup.json', text)
    await expect(page.getByRole('dialog', { name: '백업으로 바꿀까요?' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test.describe('확인 취소', () => {
  test('가져오기 확인에서 취소하면 데이터가 그대로다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const { text } = await exportBackup(page)
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '초기화' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const emptied = await storedData(page)

    await chooseFile(page, 'backup.json', text)
    await page.getByRole('dialog', { name: '백업으로 바꿀까요?' }).getByRole('button', { name: '취소' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await storedData(page)).toBe(emptied)
  })

  test('초기화 확인에서 취소하면 데이터가 그대로다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    const before = await storedData(page)
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    const dialog = page.getByRole('dialog', { name: '모든 데이터를 초기화할까요?' })
    await expect(dialog).toContainText('먼저 백업 파일을 내보내 두세요')
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await storedData(page)).toBe(before)
  })

  test('초기화하면 테마 같은 기기 설정은 유지된다', async ({ page }) => {
    await openSettings(page)
    await page.getByLabel('테마').selectOption('dark')
    await page.getByRole('button', { name: '모든 데이터 초기화' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '초기화' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('키보드와 레이아웃', () => {
  test('키보드만으로 초기화 확인 대화상자를 열고 닫는다', async ({ page }) => {
    await openSettings(page)
    const reset = page.getByRole('button', { name: '모든 데이터 초기화' })
    await reset.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: '모든 데이터를 초기화할까요?' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(reset).toBeFocused()
  })

  test('설정 화면이 화면 안에 들어오고 가로 스크롤이 없다', async ({ page }) => {
    await prepareData(page)
    await openSettings(page)
    await chooseFile(page, 'bad.json', 'x')
    await expect(page.getByRole('alert')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`스크린샷 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await prepareData(page)
      await openSettings(page)
      await chooseFile(page, 'bad.json', '{"schemaVersion":1,"members":[],"categories":[],"paymentMethods":[],"transactions":[]}')
      await expect(page.getByRole('alert')).toBeVisible()
      await page.screenshot({ path: `test-results/screenshots/settings-${testInfo.project.name}-${scheme}.png`, fullPage: true })
    })
  }
})
