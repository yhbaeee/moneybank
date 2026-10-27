import { afterEach, describe, expect, it } from 'vitest'
import { focusPageHeading } from './focus'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusPageHeading', () => {
  it('main 안의 h1에 포커스를 준다(tabindex를 붙여서)', () => {
    document.body.innerHTML = '<main><h1>제목</h1></main>'
    focusPageHeading()
    const heading = document.querySelector('h1')!
    expect(heading).toHaveFocus()
    expect(heading.tabIndex).toBe(-1)
  })

  it('main 밖의 h1이나 제목이 없는 화면에서는 아무 일도 하지 않는다', () => {
    document.body.innerHTML = '<h1>밖</h1><main><p>내용</p></main>'
    expect(() => focusPageHeading()).not.toThrow()
    expect(document.body).toHaveFocus()
  })
})
