import { describe, expect, it } from 'vitest'
import { normalizeTags, parseTagInput } from './tags'

describe('normalizeTags', () => {
  it('공백과 앞의 #을 제거한다', () => {
    expect(normalizeTags(['  #외식 ', '##출장'])).toEqual(['외식', '출장'])
  })

  it('빈 값을 제거한다', () => {
    expect(normalizeTags(['', '  ', '#'])).toEqual([])
  })

  it('대소문자를 무시하고 중복을 제거하며 먼저 나온 표기를 유지한다', () => {
    expect(normalizeTags(['Coffee', 'coffee', '#COFFEE', '식비'])).toEqual(['Coffee', '식비'])
  })
})

describe('parseTagInput', () => {
  it('쉼표와 공백으로 나눈다', () => {
    expect(parseTagInput('식비, #외식 회식,,외식')).toEqual(['식비', '외식', '회식'])
    expect(parseTagInput('')).toEqual([])
  })
})
