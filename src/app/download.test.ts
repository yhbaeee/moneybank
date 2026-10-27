import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

describe('downloadTextFile', () => {
  let blobs: Blob[]
  let clicked: HTMLAnchorElement[]

  beforeEach(() => {
    vi.useFakeTimers()
    blobs = []
    clicked = []
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob)
      return 'blob:test-url'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('파일 이름과 내용으로 다운로드 링크를 눌렀다가 정리한다', async () => {
    downloadTextFile('가계부-백업.json', '{"a":1}')

    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('가계부-백업.json')
    expect(clicked[0].getAttribute('href')).toBe('blob:test-url')
    expect(blobs[0].type).toBe('application/json;charset=utf-8')
    expect(await blobs[0].text()).toBe('{"a":1}')
    // 링크는 눌린 뒤 문서에서 제거된다.
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('다운로드가 시작될 시간을 준 뒤에 URL을 해제한다', () => {
    downloadTextFile('a.json', '{}')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('MIME 형식을 지정할 수 있다', () => {
    downloadTextFile('a.csv', 'x', 'text/csv')
    expect(blobs[0].type).toBe('text/csv;charset=utf-8')
  })
})
