import { fireEvent, render, screen } from '@testing-library/react'
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

describe('Toast', () => {
  function Trigger() {
    const { showToast } = useToast()
    return <button onClick={() => showToast('저장했습니다')}>알림</button>
  }

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
