/**
 * 화면 전환이나 포커스를 잃은 뒤에 페이지 제목(h1)으로 포커스를 옮긴다.
 * 제목은 원래 포커스 대상이 아니므로 tabindex=-1을 붙여 프로그램으로만 포커스할 수 있게 한다.
 */
export function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>('main h1')
  if (!heading) return
  heading.tabIndex = -1
  heading.focus()
}
