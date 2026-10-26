import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fixToday, openHome, openList, seedTransactions, type SeedTransaction } from './helpers.ts'

// 오늘 = 2026-10-27
test.beforeEach(async ({ page }) => {
  await fixToday(page)
})

const addButton = (page: Page) => page.getByRole('button', { name: '내역 추가' })

test.describe('검사 도구 자체 확인', () => {
  test('axe가 실제 위반(대체 텍스트 없는 이미지)을 찾아낸다', async ({ page }) => {
    await openHome(page)
    await page.evaluate(() => {
      const img = document.createElement('img')
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
      document.body.append(img)
    })
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze()
    expect(violations.map((v) => v.id)).toContain('image-alt')
  })
})

test.describe('건너뛰기 링크와 화면 전환', () => {
  test('첫 Tab에서 "본문으로 건너뛰기" 링크가 보이고, Enter로 본문에 포커스가 간다', async ({ page }) => {
    await openHome(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '본문으로 건너뛰기' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()

    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('화면마다 문서 제목이 바뀐다', async ({ page }) => {
    const cases: [string, string][] = [
      ['/', '홈 · 가계부'],
      ['/transactions', '내역 · 가계부'],
      ['/categories', '카테고리 관리 · 가계부'],
      ['/settings', '설정 · 가계부'],
    ]
    for (const [path, title] of cases) {
      await page.goto(path)
      await expect(page).toHaveTitle(title)
    }
  })

  test('메뉴로 화면을 이동하면 제목이 바뀌고 포커스가 페이지 제목(h1)으로 간다', async ({ page }) => {
    await openHome(page)
    const nav = page.getByRole('navigation', { name: '주 메뉴' })
    await nav.getByRole('link', { name: '내역' }).click()
    await expect(page).toHaveTitle('내역 · 가계부')
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeFocused()

    await nav.getByRole('link', { name: '설정' }).click()
    await expect(page).toHaveTitle('설정 · 가계부')
    await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeFocused()
  })

  test('처음 열 때는 포커스를 빼앗지 않는다', async ({ page }) => {
    await openHome(page)
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY')
  })
})

test.describe('키보드 조작', () => {
  test('키보드만으로 내역을 등록하고 포커스가 열었던 버튼으로 돌아온다', async ({ page }) => {
    await openList(page)
    await addButton(page).focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await expect(dialog).toBeVisible()
    // 포커스는 대화상자 안에 있다.
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)

    await dialog.getByLabel('금액').focus()
    await page.keyboard.type('12000')
    await dialog.getByLabel('메모').focus()
    await page.keyboard.type('키보드 입력')
    await page.keyboard.press('Enter') // 입력창에서 Enter → 저장

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /키보드 입력/ })).toBeVisible()
    await expect(addButton(page)).toBeFocused()
  })

  test('Esc로 닫으면 열었던 버튼으로 포커스가 돌아온다', async ({ page }) => {
    await openList(page)
    await addButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: '내역 추가' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(addButton(page)).toBeFocused()
  })

  test('Tab을 눌러도 대화상자 뒤쪽 화면으로 포커스가 새지 않는다', async ({ page }) => {
    await openList(page)
    await addButton(page).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    await expect(dialog).toBeVisible()
    // 네이티브 모달 대화상자는 끝에서 Tab을 누르면 브라우저 UI로 넘어가므로(activeElement가 body) 허용하고,
    // 대화상자 뒤쪽의 페이지 요소(헤더·본문·내비게이션)로는 절대 가지 않아야 한다.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      const inside = await dialog.evaluate((el) => el.contains(document.activeElement))
      const behind = await page.evaluate(
        () => !!document.activeElement?.closest('header, main, nav, a[href="#main-content"]'),
      )
      expect(inside || !behind).toBe(true)
    }
  })

  test('내역을 삭제한 뒤 포커스가 사라지지 않는다', async ({ page }) => {
    await openList(page)
    await seedTransactions(page, [{ amount: 1000, date: '2026-10-10', categoryId: 'cat-expense-1', memo: '삭제대상' }])
    const row = page.getByRole('button', { name: /삭제대상/ })
    await row.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('dialog', { name: '내역 수정' }).getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '내역을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeFocused()
  })

  test('Tab으로 이동할 때 포커스 표시(윤곽선)가 보인다', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await openList(page)
      await page.keyboard.press('Tab') // 건너뛰기 링크
      await page.keyboard.press('Tab')
      const outline = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement!)
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) }
      })
      expect(outline.style, `${scheme} 포커스 윤곽선`).not.toBe('none')
      expect(outline.width).toBeGreaterThanOrEqual(2)
    }
  })
})

test.describe('폼 접근성', () => {
  test('필수 입력을 표시하고, 오류와 안내문이 입력창에 연결된다', async ({ page }) => {
    await openList(page)
    await addButton(page).click()
    const dialog = page.getByRole('dialog', { name: '내역 추가' })
    for (const label of ['금액', '날짜', '카테고리', '결제수단']) {
      await expect(dialog.getByLabel(label)).toHaveJSProperty('required', true)
    }
    await expect(dialog.getByLabel('메모')).toHaveJSProperty('required', false)
    await expect(dialog.getByLabel('금액')).toHaveAccessibleDescription('원 단위 정수')

    await dialog.getByRole('button', { name: '저장' }).click()
    await expect(dialog.getByLabel('금액')).toBeFocused()
    await expect(dialog.getByLabel('금액')).toHaveAccessibleDescription(/금액을 입력해 주세요.*원 단위 정수|원 단위 정수.*금액을 입력해 주세요/)
  })
})

test.describe('움직임 줄이기', () => {
  test('prefers-reduced-motion이면 전환 효과가 없다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openList(page)
    const duration = await addButton(page).evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(parseFloat(duration)).toBe(0)
  })
})

test.describe('터치·클릭 대상 크기', () => {
  const DATA: SeedTransaction[] = [
    { amount: 20_000, date: '2026-10-10', categoryId: 'cat-expense-1', memo: '점심', tags: ['외식'] },
    { type: 'income', amount: 100_000, date: '2026-10-01', categoryId: 'cat-income-1' },
  ]

  async function undersizedTargets(page: Page) {
    return page.evaluate(() => {
      const selector = 'a[href], button, summary, input:not([type="hidden"]), select, textarea, [tabindex="0"]'
      const result: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') continue
        // 건너뛰기 링크는 포커스될 때만 보이도록 화면 밖에 둘 수 있다.
        if (el.matches('a[href="#main-content"]')) continue
        if (rect.width < 24 || rect.height < 24) {
          result.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`)
        }
      }
      return result
    })
  }

  test('홈·내역·설정의 조작 요소는 최소 24×24px이다', async ({ page }) => {
    await openHome(page)
    await seedTransactions(page, DATA)
    await expect(page.getByText('표로 보기')).toBeVisible()
    expect(await undersizedTargets(page), '홈').toEqual([])

    await page.goto('/transactions')
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()
    expect(await undersizedTargets(page), '내역').toEqual([])

    await page.goto('/settings')
    await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
    expect(await undersizedTargets(page), '설정').toEqual([])

    await page.goto('/categories')
    await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
    expect(await undersizedTargets(page), '카테고리 관리').toEqual([])
  })

  test('주요 버튼은 44px 이상이다', async ({ page }) => {
    await openList(page)
    await seedTransactions(page, DATA)
    const nav = page.getByRole('navigation', { name: '월 이동' })
    for (const locator of [addButton(page), nav.getByRole('button', { name: '이전 달' }), nav.getByRole('button', { name: '다음 달' })]) {
      const box = await locator.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('반응형 리플로우', () => {
  test.skip(({ isMobile }) => isMobile, '폭을 직접 지정하므로 데스크톱 프로젝트에서만 실행한다')

  const WIDTHS = [320, 360, 390, 768, 1024]
  const BIG: SeedTransaction[] = [
    { type: 'income', amount: 9_999_999_999, date: '2026-10-01', categoryId: 'cat-income-1', memo: '아주 긴 메모 '.repeat(10), tags: ['아주긴태그입니다열글자', '두번째태그'] },
    { amount: 9_999_999_999, date: '2026-10-02', categoryId: 'cat-expense-4', memo: 'LongUnbrokenMemoWithoutSpacesLongUnbrokenMemoWithoutSpaces' },
    { amount: 1, date: '2026-10-03', categoryId: 'cat-expense-2' },
    { amount: 5_000, date: '2026-09-03', categoryId: 'cat-expense-1' },
  ]

  async function horizontalOverflow(page: Page) {
    return page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
  }

  for (const width of WIDTHS) {
    test(`${width}px 폭에서 가로 스크롤이 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await openHome(page)
      await seedTransactions(page, BIG)

      for (const path of ['/', '/transactions', '/settings', '/categories']) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(await horizontalOverflow(page), `${path} @${width}`).toMatchObject({ overflow: false })
      }

      // 홈: 표로 보기까지 펼친 상태
      await page.goto('/')
      await page.getByText('표로 보기').click()
      expect(await horizontalOverflow(page), `홈(표 펼침) @${width}`).toMatchObject({ overflow: false })

      // 내역: 필터 패널을 연 상태
      await page.goto('/transactions')
      const toggle = page.getByRole('button', { name: /^필터( \(\d+\))?$/ })
      if (await toggle.isVisible()) await toggle.click()
      expect(await horizontalOverflow(page), `내역(필터 펼침) @${width}`).toMatchObject({ overflow: false })

      // 등록 폼이 화면 안에 들어온다.
      await addButton(page).click()
      const dialog = page.getByRole('dialog', { name: '내역 추가' })
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    })
  }

  test('월별 표의 가로 스크롤 영역은 키보드로 접근할 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await openHome(page)
    await seedTransactions(page, BIG)
    await page.getByText('표로 보기').click()
    const scroller = page.getByRole('region', { name: '월별 수입·지출 표' })
    await expect(scroller).toHaveAttribute('tabindex', '0')
    await scroller.focus()
    await expect(scroller).toBeFocused()
  })
})

test.describe('스크린샷', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`건너뛰기 링크 포커스 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openHome(page)
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: '본문으로 건너뛰기' })).toBeFocused()
      await page.screenshot({ path: `test-results/screenshots/a11y-skip-link-${testInfo.project.name}-${scheme}.png` })
    })
  }
})
