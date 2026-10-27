/** 텍스트를 파일로 내려받게 한다. (브라우저가 다운로드를 시작할 시간을 주고 나서 URL을 해제한다.) */
export function downloadTextFile(fileName: string, text: string, mimeType = 'application/json'): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
