import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'
import { Input } from './Field'
import { Modal } from './Modal'
import { ToastProvider } from './Toast'
import { useToast } from './toastContext'

describe('Input', () => {
  it('라벨을 입력창에 연결한다', () => {
    render(<Input label="금액" />)
    expect(screen.getByLabelText('금액')).toBeInTheDocument()
  })

  it('오류가 있으면 aria-invalid와 오류 메시지를 연결한다', () => {
    render(<Input label="금액" error="금액을 입력해 주세요" />)
    const input = screen.getByLabelText('금액')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('금액을 입력해 주세요')
  })
})

describe('Modal', () => {
  it('열리면 제목이 있는 대화상자를 표시한다', () => {
    render(
      <Modal open title="제목" onClose={() => {}}>
        <p>내용</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: '제목' })).toBeInTheDocument()
  })

  it('닫혀 있으면 내용을 렌더링하지 않는다', () => {
    render(
      <Modal open={false} title="제목" onClose={() => {}}>
        <p>내용</p>
      </Modal>,
    )
    expect(screen.queryByText('내용')).not.toBeInTheDocument()
  })

  it('ESC(cancel 이벤트)로 onClose를 호출한다', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="제목" onClose={onClose}>
        <p>내용</p>
      </Modal>,
    )
    fireEvent(screen.getByRole('dialog', { name: '제목' }), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  it('확인과 취소 콜백을 호출한다', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="삭제할까요?"
        message="되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('Input 설명 연결', () => {
  it('안내문과 오류가 모두 있으면 둘 다 입력창 설명에 연결한다(오류 먼저)', () => {
    render(<Input label="금액" hint="원 단위 정수" error="금액을 입력해 주세요" />)
    const input = screen.getByLabelText('금액')
    expect(input).toHaveAccessibleDescription('금액을 입력해 주세요 원 단위 정수')
    expect(screen.getByText('원 단위 정수')).toBeVisible()
  })

  it('안내문만 있으면 안내문이 설명이다', () => {
    render(<Input label="금액" hint="원 단위 정수" />)
    expect(screen.getByLabelText('금액')).toHaveAccessibleDescription('원 단위 정수')
    expect(screen.getByLabelText('금액')).not.toHaveAttribute('aria-invalid')
  })
})

describe('Toast 표시 시간', () => {
  function Buttons() {
    const { showToast } = useToast()
    return (
      <>
        <button onClick={() => showToast('성공', 'success')}>성공</button>
        <button onClick={() => showToast('오류', 'error')}>오류</button>
      </>
    )
  }

  it('성공 알림은 6초, 오류 알림은 10초 동안 보인 뒤 사라진다', () => {
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <Buttons />
        </ToastProvider>,
      )
      fireEvent.click(screen.getByRole('button', { name: '성공' }))
      act(() => void vi.advanceTimersByTime(5999))
      expect(screen.getByText('성공', { selector: 'div' })).toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(2))
      expect(screen.queryByText('성공', { selector: 'div' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '오류' }))
      act(() => void vi.advanceTimersByTime(9999))
      expect(screen.getByRole('alert')).toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(2))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('새 알림이 오면 이전 알림 대신 최신 알림 하나만 보여 준다', () => {
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '성공' }))
    fireEvent.click(screen.getByRole('button', { name: '오류' }))
    expect(screen.queryByText('성공', { selector: 'div' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('오류')
  })
})

describe('Toast', () => {
  function Trigger() {
    const { showToast } = useToast()
    return <button onClick={() => showToast('저장했습니다')}>알림</button>
  }

  function ErrorTrigger() {
    const { showToast } = useToast()
    return <button onClick={() => showToast('저장하지 못했습니다', 'error')}>실패</button>
  }

  it('오류 알림은 role=alert로 즉시 읽히게 한다', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: '실패' }))
    expect(screen.getByRole('alert')).toHaveTextContent('저장하지 못했습니다')
  })

  it('알림 메시지를 status 영역에 표시한다', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: '알림' }))
    expect(screen.getByRole('status')).toHaveTextContent('저장했습니다')
  })
})
