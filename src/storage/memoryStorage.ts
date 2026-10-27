/** 메모리에만 저장하는 Storage 구현. 브라우저 저장소를 쓸 수 없을 때 이 세션 동안만 동작하는 대체 저장소로 쓴다. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  }
}
