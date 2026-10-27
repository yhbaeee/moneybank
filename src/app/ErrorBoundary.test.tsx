import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEDGER_STORAGE_KEY } from '../storage/localStorageRepository'
import { downloadTextFile } from './download'
import { ErrorBoundary } from './ErrorBoundary'

vi.mock('./download', () => ({ downloadTextFile: vi.fn() }))

function Bomb(): never {
  throw new Error('렌더링 중 폭발')
}

beforeEach(() => {
  // React가 잡힌 오류를 console.error로 출력하므로 테스트 출력이 지저분해지지 않게 막는다.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(downloadTextFile).mockClear()
})

describe('ErrorBoundary', () => {
  it('오류가 없으면 자식을 그대로 보여 준다', () => {
    render(
      <ErrorBoundary>
        <p>정상 화면</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('정상 화면')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('렌더링 오류가 나면 빈 화면 대신 안내를 보여 주고 데이터는 건드리지 않았다고 알린다', () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{"keep":"me"}')
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('문제가 발생했습니다')
    expect(alert).toHaveTextContent('저장된 데이터는 변경되지 않았습니다')
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument()
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{"keep":"me"}')
    expect(console.error).toHaveBeenCalled()
  })

  it('"데이터 내려받기"는 저장된 원문을 그대로 파일로 내려받는다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{"keep":"me"}')
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '데이터 내려받기' }))
    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [fileName, text] = vi.mocked(downloadTextFile).mock.calls[0]
    expect(fileName).toMatch(/^가계부-백업-\d{4}-\d{2}-\d{2}\.json$/)
    expect(text).toBe('{"keep":"me"}')
    expect(await screen.findByText('데이터를 파일로 내려받았습니다.')).toBeInTheDocument()
  })

  it('저장된 데이터가 없으면 내려받지 않고 알려 준다', async () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '데이터 내려받기' }))
    expect(downloadTextFile).not.toHaveBeenCalled()
    expect(await screen.findByText('저장된 데이터가 없습니다.')).toBeInTheDocument()
  })

  it('내려받기에 실패해도 화면은 유지하고 실패를 알린다', async () => {
    vi.mocked(downloadTextFile).mockImplementationOnce(() => {
      throw new Error('다운로드 실패')
    })
    localStorage.setItem(LEDGER_STORAGE_KEY, '{}')
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '데이터 내려받기' }))
    expect(await screen.findByText('데이터를 내려받지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('"다시 불러오기"는 페이지를 새로 고친다', async () => {
    const reload = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } })
    try {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      )
      await userEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })
})
