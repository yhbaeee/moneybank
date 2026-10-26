import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'

/** 실제 저장소(localStorage)까지 연결한 화면 단위 흐름 테스트 */

async function openTransactions() {
  window.history.pushState({}, '', '/transactions')
  const result = render(<App />)
  await screen.findByRole('heading', { level: 1, name: '내역' })
  return result
}

async function openCreateForm(user: ReturnType<typeof userEvent.setup>) {
  // jsdom에는 CSS 미디어 쿼리가 없어 페이지 버튼과 FAB가 모두 보이므로 첫 번째를 사용한다.
  await user.click(screen.getAllByRole('button', { name: '내역 추가' })[0])
  return screen.getByRole('dialog', { name: '내역 추가' })
}

async function fillAndSave(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  fields: { amount: string; date?: string; category?: string; memo?: string; tags?: string },
) {
  const form = within(dialog)
  await user.clear(form.getByLabelText('금액'))
  if (fields.amount) await user.type(form.getByLabelText('금액'), fields.amount)
  if (fields.date) fireEvent.change(form.getByLabelText('날짜'), { target: { value: fields.date } })
  if (fields.category) await user.selectOptions(form.getByLabelText('카테고리'), fields.category)
  if (fields.memo) await user.type(form.getByLabelText('메모'), fields.memo)
  if (fields.tags) await user.type(form.getByLabelText('태그'), fields.tags)
  await user.click(form.getByRole('button', { name: '저장' }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('내역 등록·수정·삭제 흐름', () => {
  it('지출을 등록하면 목록에 표시되고 모달이 닫힌다', async () => {
    const user = userEvent.setup()
    await openTransactions()
    expect(screen.getByText('아직 내역이 없습니다')).toBeInTheDocument()

    const dialog = await openCreateForm(user)
    await fillAndSave(user, dialog, { amount: '12000', date: '2026-10-27', category: '식비', memo: '점심', tags: '외식' })

    const row = await screen.findByRole('button', { name: /점심/ })
    expect(row).toHaveTextContent('-12,000원')
    expect(row).toHaveTextContent('#외식')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('유형을 수입으로 바꾸면 수입 카테고리가 나오고 수입으로 저장된다', async () => {
    const user = userEvent.setup()
    await openTransactions()

    const dialog = await openCreateForm(user)
    await user.click(within(dialog).getByRole('radio', { name: '수입' }))
    const options = within(within(dialog).getByLabelText('카테고리')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['급여', '부수입', '용돈', '기타'])

    await fillAndSave(user, dialog, { amount: '3,000,000', date: '2026-10-25', category: '급여' })
    expect(await screen.findByText('+3,000,000원')).toBeInTheDocument()
  })

  it.each([
    ['', '금액을 입력해 주세요.'],
    ['0', '금액은 1원 이상이어야 합니다.'],
    ['1.5', /숫자만 입력/],
    ['-100', /숫자만 입력/],
  ])('금액 "%s"는 오류를 표시하고 저장하지 않는다', async (amount, message) => {
    const user = userEvent.setup()
    await openTransactions()

    const dialog = await openCreateForm(user)
    await fillAndSave(user, dialog, { amount })

    const input = within(dialog).getByLabelText('금액')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveFocus()
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('dialog', { name: '내역 추가' })).toBeInTheDocument()
    expect(screen.getByText('아직 내역이 없습니다')).toBeInTheDocument()
  })

  it('입력을 고치면 해당 필드의 오류가 사라진다', async () => {
    const user = userEvent.setup()
    await openTransactions()
    const dialog = await openCreateForm(user)
    await fillAndSave(user, dialog, { amount: '' })
    expect(within(dialog).getByRole('alert')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('금액'), '1')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('내역을 수정할 수 있다', async () => {
    const user = userEvent.setup()
    await openTransactions()
    await fillAndSave(user, await openCreateForm(user), { amount: '12000', date: '2026-10-27', memo: '점심' })

    await user.click(await screen.findByRole('button', { name: /점심/ }))
    const dialog = screen.getByRole('dialog', { name: '내역 수정' })
    expect(within(dialog).getByLabelText('금액')).toHaveValue('12,000')
    expect(within(dialog).getByLabelText('메모')).toHaveValue('점심')

    await user.clear(within(dialog).getByLabelText('금액'))
    await user.type(within(dialog).getByLabelText('금액'), '15000')
    await user.clear(within(dialog).getByLabelText('메모'))
    await user.type(within(dialog).getByLabelText('메모'), '저녁')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    const row = await screen.findByRole('button', { name: /저녁/ })
    expect(row).toHaveTextContent('-15,000원')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('삭제 확인에서 취소하면 유지하고, 확인하면 삭제한다', async () => {
    const user = userEvent.setup()
    await openTransactions()
    await fillAndSave(user, await openCreateForm(user), { amount: '12000', date: '2026-10-27', memo: '점심' })

    await user.click(await screen.findByRole('button', { name: /점심/ }))
    const editDialog = screen.getByRole('dialog', { name: '내역 수정' })
    await user.click(within(editDialog).getByRole('button', { name: '삭제' }))

    const confirm = screen.getByRole('dialog', { name: '내역을 삭제할까요?' })
    await user.click(within(confirm).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog', { name: '내역을 삭제할까요?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '내역 수정' })).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog', { name: '내역 수정' })).getByRole('button', { name: '삭제' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '내역을 삭제할까요?' })).getByRole('button', { name: '삭제' }),
    )

    expect(await screen.findByText('아직 내역이 없습니다')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('앱을 다시 열어도(새로고침) 저장한 내역이 유지된다', async () => {
    const user = userEvent.setup()
    const first = await openTransactions()
    await fillAndSave(user, await openCreateForm(user), { amount: '8000', date: '2026-10-27', memo: '커피' })
    await screen.findByRole('button', { name: /커피/ })

    first.unmount()
    await openTransactions()
    expect(await screen.findByRole('button', { name: /커피/ })).toHaveTextContent('-8,000원')
  })
})
