export const APP_NAME = '가계부'

const PAGE_TITLES: Record<string, string> = {
  '/': '홈',
  '/transactions': '내역',
  '/categories': '카테고리 관리',
  '/settings': '설정',
  '/dev/components': '컴포넌트 쇼케이스',
}

/** 경로에 해당하는 화면 이름. 알 수 없는 경로는 홈 화면을 보여 주므로 "홈"이다. */
export function pageTitleFor(pathname: string): string {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PAGE_TITLES[normalized] ?? PAGE_TITLES['/']
}

/** 브라우저 탭/스크린리더가 읽는 문서 제목. 예: "내역 · 가계부" */
export function documentTitleFor(pathname: string): string {
  return `${pageTitleFor(pathname)} · ${APP_NAME}`
}
