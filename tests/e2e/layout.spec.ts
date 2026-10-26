import { expect, test } from '@playwright/test'

test.describe('레이아웃과 내비게이션', () => {
  test('화면 간 이동이 가능하다', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: '주 메뉴' })
    await expect(page.getByRole('heading', { level: 1, name: '홈' })).toBeVisible()

    await nav.getByRole('link', { name: '내역' }).click()
    await expect(page).toHaveURL(/\/transactions$/)
    await expect(page.getByRole('heading', { level: 1, name: '내역' })).toBeVisible()

    await nav.getByRole('link', { name: '설정' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()

    await page.getByRole('link', { name: '카테고리 관리' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '카테고리 관리' })).toBeVisible()
    // 카테고리는 설정 하위이므로 설정 메뉴가 활성 상태로 유지된다.
    await expect(nav.getByRole('link', { name: '설정' })).toHaveAttribute('aria-current', 'page')
  })

  test('뷰포트에 따라 하나의 주 메뉴만 보이고 가로 스크롤이 없다', async ({ page, isMobile }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toHaveCount(1)
    const box = await page.getByRole('navigation', { name: '주 메뉴' }).boundingBox()
    expect(box).not.toBeNull()
    if (isMobile) {
      // 모바일: 하단 탭
      const viewport = page.viewportSize()!
      expect(box!.y).toBeGreaterThan(viewport.height / 2)
    } else {
      // 데스크톱: 상단 내비게이션
      expect(box!.y).toBeLessThan(100)
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
  })
})

test.describe('테마', () => {
  test('테마를 전환하고 새로고침 후에도 유지한다', async ({ page }) => {
    await page.goto('/settings')
    const html = page.locator('html')

    await page.getByLabel('테마').selectOption('dark')
    await expect(html).toHaveClass(/dark/)

    await page.reload()
    await expect(html).toHaveClass(/dark/)
    await expect(page.getByLabel('테마')).toHaveValue('dark')

    await page.getByLabel('테마').selectOption('light')
    await expect(html).not.toHaveClass(/dark/)
  })

  test('시스템 다크 설정을 따른다', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('스크린샷', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`컴포넌트 쇼케이스 (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/dev/components')
      await expect(page.getByRole('heading', { name: '컴포넌트 쇼케이스' })).toBeVisible()
      await page.screenshot({
        path: `test-results/screenshots/${testInfo.project.name}-${scheme}.png`,
        fullPage: true,
      })
    })
  }
})

test.describe('모달', () => {
  test('모달이 열리고 ESC로 닫힌다', async ({ page }) => {
    await page.goto('/dev/components')
    await page.getByRole('button', { name: '모달 열기' }).click()
    await expect(page.getByRole('dialog', { name: '모달 제목' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('확인 대화상자를 취소할 수 있다', async ({ page }) => {
    await page.goto('/dev/components')
    await page.getByRole('button', { name: '확인 대화상자' }).click()
    const dialog = page.getByRole('dialog', { name: '삭제할까요?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
