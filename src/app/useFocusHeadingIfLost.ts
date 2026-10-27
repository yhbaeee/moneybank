import { useEffect, useRef } from 'react'
import { focusPageHeading } from './focus'

/**
 * 모달이 닫힌 뒤 포커스가 사라졌다면(눌렀던 행·버튼이 없어진 경우) 페이지 제목(h1)으로 옮긴다.
 * 처음 렌더링할 때는 아무것도 하지 않는다.
 */
export function useFocusHeadingIfLost(isOpen: boolean): void {
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !isOpen && (!document.activeElement || document.activeElement === document.body)) {
      focusPageHeading()
    }
    wasOpen.current = isOpen
  }, [isOpen])
}
