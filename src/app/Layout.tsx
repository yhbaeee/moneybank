import { Link, Outlet, useLocation } from 'react-router-dom'
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

  return (
    <div className="min-h-dvh bg-bg text-fg">
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

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">
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
