import { describe, expect, it } from 'vitest'
import { documentTitleFor, pageTitleFor } from './routeMeta'

describe('routeMeta', () => {
  it('경로별 화면 이름과 문서 제목을 돌려준다', () => {
    expect(pageTitleFor('/')).toBe('홈')
    expect(pageTitleFor('/transactions')).toBe('내역')
    expect(pageTitleFor('/categories')).toBe('카테고리 관리')
    expect(documentTitleFor('/settings')).toBe('설정 · 가계부')
  })

  it('끝의 슬래시를 무시하고, 알 수 없는 경로는 홈으로 본다', () => {
    expect(pageTitleFor('/transactions/')).toBe('내역')
    expect(pageTitleFor('/nope')).toBe('홈')
  })
})
