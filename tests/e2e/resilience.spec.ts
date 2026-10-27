import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { addTransaction, fixToday, monthsForUsage, openHome, openList, quotaCharsFor, seedBulkTransactions, seedTransactions } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const rows = (page: Page) => page.getByRole('listitem')
const summaryLine = (page: Page) => page.getByText(/^\d+건 · 수입/)
const storedData = (page: Page) => page.evaluate(() => localStorage.getItem('ledger.data'))

// WebKit(Safari)은 한글 데이터에서 저장 한도가 절반이라 같은 사용률을 만드는 데이터 양이 다르다(ISS-018).
// 월 1,000건 × 개월 수로 만들며, 개월 수는 엔진에 맞춰 정한다(12개월 ≈ Chromium·Firefox 62%, 6개월 ≈ WebKit 62%).
const bulkMonths = (browserName: string) => monthsForUsage(62, browserName)

test.describe('대량 데이터 (월 1,000건 × 여러 달)', () => {
  test.setTimeout(90_000)

  test('내역 화면은 100건씩 보여 주고 "더 보기"로 이어 볼 수 있다', { tag: '@core' }, async ({ page, browserName }) => {
    await openHome(page)
    const { count } = await seedBulkTransactions(page, 1000, bulkMonths(browserName))
    expect(count).toBeGreaterThanOrEqual(6_000)

    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '내역' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
    // 합계·건수는 전체(이번 달 1,000건) 기준이고, 화면에는 처음 100건만 그린다.
    await expect(summaryLine(page)).toBeVisible()
    await expect(page.getByText(/^1000건 · 수입/)).toBeVisible()
    await expect(rows(page)).toHaveCount(100)
    await expect(page.getByText('1000건 중 100건 표시')).toBeVisible()

    await page.getByRole('button', { name: '더 보기 (900건 남음)' }).click()
    await expect(rows(page)).toHaveCount(200)
    await expect(page.getByText('1000건 중 200건 표시')).toBeVisible()
    // 새로 나타난 첫 행(101번째)으로 포커스가 이동한다.
    expect(await page.evaluate(() => document.activeElement === document.querySelectorAll('li > button')[100])).toBe(true)

    for (let remaining = 800; remaining > 0; remaining -= 100) {
      await page.getByRole('button', { name: `더 보기 (${remaining}건 남음)` }).click()
    }
    await expect(rows(page)).toHaveCount(1000)
    await expect(page.getByRole('button', { name: /더 보기/ })).toHaveCount(0)
  })

  test('검색·필터·월 이동은 전체 데이터에 적용되고 목록은 처음 100건부터 다시 시작한다', async ({ page, browserName }) => {
    await openHome(page)
    await seedBulkTransactions(page, 1000, bulkMonths(browserName))
    await page.goto('/transactions')
    await page.getByRole('button', { name: /더 보기/ }).click()
    await expect(rows(page)).toHaveCount(200)

    // 이번 달 메모 번호(1~1000) 중 "메모 999"가 들어간 건: 999번(1건)
    await page.getByLabel('검색').fill('메모 999')
    await expect(rows(page)).toHaveCount(1)
    await page.getByLabel('검색').fill('')
    await expect(rows(page)).toHaveCount(100) // 필터가 바뀌었다 돌아오면 처음부터

    await page.getByRole('button', { name: '이전 달' }).click()
    await expect(page.getByText('2026년 9월')).toBeVisible()
    await expect(page.getByText(/^1000건 · 수입/)).toBeVisible()
    await expect(rows(page)).toHaveCount(100)

    await page.getByRole('button', { name: '이번 달' }).click()
    await expect(rows(page)).toHaveCount(100)
  })

  test('홈 요약·차트와 내역 추가가 대량 데이터에서도 정확하다', async ({ page, browserName }) => {
    await openHome(page)
    await seedBulkTransactions(page, 1000, bulkMonths(browserName))
    await expect(page.getByRole('group', { name: '지출' })).toBeVisible()
    // 이번 달: 수입 100건(i%10==0) / 지출 900건. 합계는 정수로 정확히 계산되어 쉼표 표기와 '원'으로 나온다.
    await expect(page.getByRole('group', { name: '수입' })).toContainText(/^수입[\d,]+원$/)
    await expect(page.getByRole('img', { name: /월별 수입·지출 막대 차트/ })).toBeVisible()
    await expect(page.getByRole('img', { name: /카테고리별 지출 비율 도넛 차트/ })).toBeVisible()

    const before = await page.getByRole('group', { name: '지출' }).innerText()
    await addTransaction(page, { amount: '12,345', date: '2026-10-20', category: '식비', memo: '대량 데이터 추가' })
    await expect(page.getByRole('group', { name: '지출' })).not.toHaveText(before)

    await page.reload()
    await page.goto('/transactions')
    await page.getByLabel('검색').fill('대량 데이터 추가')
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('-12,345원')
  })

  test('설정에 저장 공간 사용률과 남은 건수가 표시되고, 80% 미만이면 경고 배너가 없다', async ({ page, browserName }) => {
    await openHome(page)
    const { chars } = await seedBulkTransactions(page, 1000, bulkMonths(browserName))
    const percent = Math.floor((chars * 100) / quotaCharsFor(browserName))
    expect(percent).toBeGreaterThan(50)
    expect(percent).toBeLessThan(80)

    await page.goto('/settings')
    const bar = page.getByRole('progressbar', { name: '저장 공간 사용량' })
    await expect(bar).toHaveAttribute('aria-valuenow', String(percent))
    await expect(page.getByText(new RegExp(`${percent}% 사용 중 · [\\d.]+MB / 약 5\\.0MB`))).toBeVisible()
    await expect(page.getByText(/약 [\d,]+건을 더 저장할 수 있습니다/)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: '저장 공간이' })).toHaveCount(0)
  })
})

test.describe('저장 공간 임박', () => {
  test.setTimeout(90_000)

  test('80% 이상이면 경고 배너가 나오고 닫을 수 있다', { tag: '@core' }, async ({ page, browserName }) => {
    await openHome(page)
    // 매달 500건씩 넣어 목표 사용률(약 88%)에 촘촘히 맞춘다.
    const { chars } = await seedBulkTransactions(page, 500, monthsForUsage(88, browserName, 500))
    const percent = Math.floor((chars * 100) / quotaCharsFor(browserName))
    expect(percent).toBeGreaterThanOrEqual(80)
    expect(percent).toBeLessThan(95)

    const banner = page.getByRole('status').filter({ hasText: '저장 공간이 부족해지고 있습니다' })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(`${percent}% 사용 중`)
    await expect(banner).toContainText('백업 파일을 내려받아 두고 오래된 내역 정리를 권장합니다')

    // 화면을 이동해도 유지되고, 설정 링크로 이동할 수 있다.
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '내역' }).click()
    await expect(banner).toBeVisible()
    await banner.getByRole('link', { name: '설정에서 백업하기' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
    await expect(page.getByText(new RegExp(`${percent}% 사용 중 · 주의`))).toBeVisible()

    await banner.getByRole('button', { name: '닫기' }).click()
    await expect(banner).toHaveCount(0)
    await page.reload() // 닫기는 이 세션(페이지 로드) 동안만
    await expect(page.getByRole('status').filter({ hasText: '저장 공간이 부족해지고 있습니다' })).toBeVisible()
  })

  test('95% 이상이면 "거의 가득 찼습니다"로 강하게 알린다', async ({ page, browserName }) => {
    await openHome(page)
    const { chars } = await seedBulkTransactions(page, 500, monthsForUsage(97, browserName, 500)) // 약 97%
    expect(Math.floor((chars * 100) / quotaCharsFor(browserName))).toBeGreaterThanOrEqual(95)
    await expect(page.getByRole('status').filter({ hasText: '저장 공간이 거의 가득 찼습니다' })).toBeVisible()
  })

  test('저장 공간이 실제로 가득 차면 오류를 알리고 입력을 보존하며, 공간을 비우면 저장된다', { tag: '@core' }, async ({ page }) => {
    await openList(page)
    // 남은 공간을 거의 다 채운다(이분 탐색으로 들어가는 최대 크기를 찾는다).
    await page.evaluate(() => {
      let lo = 0
      let hi = 6_000_000
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2)
        try {
          localStorage.setItem('filler', 'x'.repeat(mid))
          lo = mid
        } catch {
          hi = mid
        }
      }
      localStorage.setItem('filler', 'x'.repeat(lo))
    })

    await page.getByRole('button', { name: '내역 추가' }).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await dialog.getByLabel('금액').fill('7777')
    await dialog.getByLabel('메모').fill('공간 부족 테스트')
    await dialog.getByRole('button', { name: '저장' }).click()

    await expect(page.getByRole('alert').filter({ hasText: '저장 공간이 부족합니다.' })).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('메모')).toHaveValue('공간 부족 테스트')
    await expect(dialog.getByRole('button', { name: '저장' })).toBeEnabled()

    await page.evaluate(() => localStorage.removeItem('filler'))
    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /공간 부족 테스트/ })).toContainText('-7,777원')
  })
})

test.describe('손상된 데이터 복구', () => {
  async function corruptAndReload(page: Page) {
    await page.evaluate(() => localStorage.setItem('ledger.data', '{broken'))
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: '저장된 데이터를 읽을 수 없습니다' })).toBeVisible()
  }

  test('복구 화면에서 세 가지 선택지를 보여 주고 원본은 지우지 않는다', { tag: '@core' }, async ({ page }) => {
    await openHome(page)
    await corruptAndReload(page)
    await expect(page).toHaveTitle('데이터 복구 · 가계부')
    await expect(page.getByRole('alert').first()).toContainText('기존 데이터는 지우지 않고 그대로 두었습니다')
    await expect(page.getByRole('button', { name: '손상된 원본 데이터 저장' })).toBeVisible()
    await expect(page.getByRole('button', { name: '백업 파일로 복구' })).toBeVisible()
    await expect(page.getByRole('button', { name: '모든 데이터를 지우고 새로 시작' })).toBeVisible()
    expect(await storedData(page)).toBe('{broken')
  })

  test('손상된 원본을 파일로 저장한다(원문 그대로)', async ({ page }) => {
    await openHome(page)
    await corruptAndReload(page)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '손상된 원본 데이터 저장' }).click()])
    expect(download.suggestedFilename()).toBe('가계부-손상데이터-2026-10-27.txt')
    expect(readFileSync(await download.path(), 'utf-8')).toBe('{broken')
    expect(await storedData(page)).toBe('{broken')
  })

  test('백업 파일로 복구하면 데이터가 되돌아오고 앱이 열린다', async ({ page }) => {
    await openList(page)
    await seedTransactions(page, [{ amount: 8_000, date: '2026-10-05', categoryId: 'cat-expense-1', memo: '복구될 내역' }])
    await page.goto('/settings')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '백업 파일 내보내기' }).click()])
    const backupText = readFileSync(await download.path(), 'utf-8')
    const stored = await storedData(page)

    await corruptAndReload(page)
    await page.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) })

    // 복구 전에 보고 있던 화면(설정)이 그대로 열린다.
    await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
    expect(await storedData(page)).toBe(stored)
    await page.goto('/transactions')
    await expect(page.getByRole('button', { name: /복구될 내역/ })).toContainText('-8,000원')
  })

  test('잘못된 백업 파일은 거부하고 복구 화면과 원본을 유지한다', async ({ page }) => {
    await openHome(page)
    await corruptAndReload(page)
    await page.locator('input[type="file"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('JSON 아님') })
    await expect(page.getByRole('alert').filter({ hasText: '백업 파일을 사용할 수 없습니다. 기존 데이터는 변경되지 않았습니다.' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '저장된 데이터를 읽을 수 없습니다' })).toBeVisible()
    expect(await storedData(page)).toBe('{broken')
  })

  test('"새로 시작"은 확인을 거쳐야 하고, 확인하면 기본 상태로 앱이 열린다', async ({ page }) => {
    await openHome(page)
    await corruptAndReload(page)
    await page.getByRole('button', { name: '모든 데이터를 지우고 새로 시작' }).click()
    const dialog = page.getByRole('dialog', { name: '모두 지우고 새로 시작할까요?' })
    await expect(dialog).toContainText("먼저 '손상된 원본 데이터 저장'")
    await dialog.getByRole('button', { name: '취소' }).click()
    expect(await storedData(page)).toBe('{broken')

    await page.getByRole('button', { name: '모든 데이터를 지우고 새로 시작' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '새로 시작' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    const data = JSON.parse((await storedData(page))!)
    expect(data.transactions).toEqual([])
    expect(data.categories).toHaveLength(13)
  })

  test('복구 화면이 모바일에서도 화면 안에 들어온다', async ({ page }) => {
    await openHome(page)
    await corruptAndReload(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
})

test.describe('브라우저 저장소를 쓸 수 없는 환경', () => {
  test.beforeEach(async ({ page }) => {
    // 시크릿 모드·쿠키 차단처럼 localStorage 접근이 막힌 상황
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('denied', 'SecurityError')
        },
      })
    })
  })

  test('임시 저장소로 계속 쓸 수 있고 데이터가 사라진다는 경고가 계속 보인다', { tag: '@core' }, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()
    const banner = page.getByRole('status').filter({ hasText: '창을 닫으면 입력한 내용이 사라집니다' })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('button', { name: '닫기' })).toHaveCount(0) // 닫을 수 없다

    await addTransaction(page, { amount: '4,500', date: '2026-10-05', category: '식비', memo: '임시 저장' })
    await expect(page.getByRole('group', { name: '지출' })).toContainText('4,500원')
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '내역' }).click()
    await expect(page.getByRole('button', { name: /임시 저장/ })).toBeVisible()
    await expect(banner).toBeVisible()
  })

  test('설정에서 백업 파일을 내려받아 데이터를 지킬 수 있고, 새로고침하면 임시 데이터는 사라진다', async ({ page }) => {
    await page.goto('/')
    await addTransaction(page, { amount: '9,000', date: '2026-10-05', category: '식비', memo: '지켜야 할 내역' })
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '설정' }).click()
    await expect(page.getByText(/이 창이 열려 있는 동안만 유지됩니다/)).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '백업 파일 내보내기' }).click()])
    const backup = JSON.parse(readFileSync(await download.path(), 'utf-8'))
    expect(backup.transactions).toHaveLength(1)
    expect(backup.transactions[0].memo).toBe('지켜야 할 내역')

    await page.reload()
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '내역' }).click()
    await expect(page.getByText('이 달의 내역이 없습니다')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: '창을 닫으면 입력한 내용이 사라집니다' })).toBeVisible()
  })
})

test.describe('여러 탭', () => {
  test('다른 탭에서 바꾼 내용이 새로고침 없이 반영된다', { tag: '@core' }, async ({ page, context }) => {
    await openList(page)
    await expect(page.getByText('이 달의 내역이 없습니다')).toBeVisible()

    const other = await context.newPage()
    await fixToday(other)
    await other.goto('/transactions')
    await expect(other.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
    await addTransaction(other, { amount: '3,300', date: '2026-10-05', category: '식비', memo: '다른 탭에서 추가' })

    // 첫 번째 탭은 새로고침하지 않아도 갱신된다.
    await expect(page.getByRole('button', { name: /다른 탭에서 추가/ })).toContainText('-3,300원')

    // 삭제도 반영된다.
    await other.getByRole('button', { name: /다른 탭에서 추가/ }).click()
    await other.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await other.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByText('이 달의 내역이 없습니다')).toBeVisible()
    await other.close()
  })

  test('두 탭에서 번갈아 저장해도 서로의 내역이 사라지지 않는다', async ({ page, context }) => {
    await openList(page)
    const other = await context.newPage()
    await fixToday(other)
    await other.goto('/transactions')
    await expect(other.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()

    await addTransaction(page, { amount: '1,000', date: '2026-10-01', category: '식비', memo: '첫 탭 1' })
    await addTransaction(other, { amount: '2,000', date: '2026-10-02', category: '식비', memo: '둘째 탭 1' })
    await addTransaction(page, { amount: '3,000', date: '2026-10-03', category: '식비', memo: '첫 탭 2' })

    for (const target of [page, other]) {
      await expect(target.getByRole('listitem')).toHaveCount(3)
    }
    await other.close()
  })
})
