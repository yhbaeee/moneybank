export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 20

/** 공백 제거, 앞의 `#` 제거, 빈 값 제거, 대소문자 무시 중복 제거(먼저 나온 표기 유지). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, '').trim()
    if (tag === '') continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

/** 입력창 문자열("식비, #외식 회식")을 쉼표·공백 기준으로 나눠 정규화한다. */
export function parseTagInput(text: string): string[] {
  return normalizeTags(text.split(/[,\s]+/))
}
