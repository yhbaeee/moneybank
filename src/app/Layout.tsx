import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { focusPageHeading } from './focus'
import { StorageBanner } from './StorageBanner'
import { documentTitleFor } from './routeMeta'
import { useTransactionEditor } from './transactionEditorContext'

interface NavItem {
  to: string
  label: string
  /** 이 경로들 중 하나로 시작하면 활성 상태로 표시한다. (카테고리는 설정 하위) */
  alsoActiveFor?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈' },
  { to: '/transactions', label: '내역' },
  { to: '/settings', label: '설정', alsoActiveFor: ['/categories'] },
]

function useIsActive() {
  const { pathname } = useLocation()
  return (item: NavItem) => {
    if (item.to === '/') return pathname === '/'
    return [item.to, ...(item.alsoActiveFor ?? [])].some((prefix) => pathname.startsWith(prefix))
  }
}

const FAB_PATHS = ['/', '/transactions']

export function Layout() {
  const isActive = useIsActive()
  const { pathname } = useLocation()
  const { openCreate } = useTransactionEditor()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  // 화면마다 문서 제목을 바꾸고, 화면을 이동했을 때(처음 열 때는 제외) 페이지 제목으로 포커스를 옮긴다.
  useEffect(() => {
    document.title = documentTitleFor(pathname)
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      focusPageHeading()
    }
  }, [pathname])

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-fg"
      >
        본문으로 건너뛰기
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold">가계부</span>
          <nav aria-label="주 메뉴" className="hidden gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item) ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(item) ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-primary-soft'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <StorageBanner />

      <main id="main-content" ref={mainRef} tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-24 pt-4 outline-none md:pb-8">
        <Outlet />
      </main>

      {FAB_PATHS.includes(pathname) && (
        <button
          type="button"
          aria-label="내역 추가"
          onClick={openCreate}
          className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-3xl text-primary-fg shadow-lg md:hidden"
        >
          <span aria-hidden="true">+</span>
        </button>
      )}

      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isActive(item) ? 'page' : undefined}
            className={`flex min-h-14 items-center justify-center text-sm font-medium ${
              isActive(item) ? 'text-primary' : 'text-muted'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
