import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Field'
import { Modal } from './Modal'

describe('Select', () => {
  it('오류가 있으면 aria-invalid와 설명(오류 먼저, 안내문 다음)을 연결한다', () => {
    render(
      <Select label="카테고리" error="선택해 주세요" hint="필수">
        <option value="a">가</option>
      </Select>,
    )
    const select = screen.getByLabelText('카테고리')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('선택해 주세요 필수')
  })
})

describe('Modal', () => {
  it('대화상자 바깥(배경)을 누르면 닫히지만 내용을 누르면 닫히지 않는다', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="제목" onClose={onClose}>
        <button>내용 버튼</button>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: '내용 버튼' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog', { name: '제목' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('open이 false가 되면 대화상자를 닫고 본문 스크롤 잠금을 해제한다', () => {
    const { rerender } = render(
      <Modal open title="제목" onClose={() => {}}>
        <p>내용</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Modal open={false} title="제목" onClose={() => {}}>
        <p>내용</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
