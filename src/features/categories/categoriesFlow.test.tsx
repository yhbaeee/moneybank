import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { createLocalStorageRepository } from '../../storage/localStorageRepository'

/** 실제 저장소(localStorage)까지 연결한 카테고리 관리 화면 흐름 테스트 */

async function openCategories() {
  window.history.pushState({}, '', '/categories')
  render(<App />)
  await screen.findByRole('heading', { level: 1, name: '카테고리 관리' })
}

const expenseList = () => screen.getByRole('list', { name: '지출 카테고리 목록' })
const incomeList = () => screen.getByRole('list', { name: '수입 카테고리 목록' })
const names = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.font-medium')?.textContent)

beforeEach(() => {
  localStorage.clear()
})

describe('카테고리 목록', () => {
  it('지출·수입 기본 카테고리를 구역별로 보여 준다', async () => {
    await openCategories()
    expect(names(expenseList())).toEqual(['식비', '교통', '주거·통신', '쇼핑', '의료·건강', '문화·여가', '교육', '경조사', '기타'])
    expect(names(incomeList())).toEqual(['급여', '부수입', '용돈', '기타'])
    expect(within(expenseList()).getAllByText('기본')).toHaveLength(9)
  })

  it("유형별 '기타'에는 삭제 버튼 대신 '삭제 불가'를 표시한다", async () => {
    await openCategories()
    expect(screen.getByRole('button', { name: '지출 카테고리 식비 삭제' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지출 카테고리 기타 삭제' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '수입 카테고리 기타 삭제' })).not.toBeInTheDocument()
    expect(screen.getAllByText('삭제 불가')).toHaveLength(2)
  })

  it('카테고리별 사용 건수를 표시한다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    const base = { type: 'expense' as const, categoryId: 'cat-expense-1', paymentMethodId: 'pay-1', memo: '', tags: [] }
    await repo.transactions.create({ ...base, amount: 1000, date: '2026-10-01' })
    await repo.transactions.create({ ...base, amount: 2000, date: '2026-09-01' })
    await openCategories()
    const food = within(expenseList()).getAllByRole('listitem')[0]
    expect(food).toHaveTextContent('2건')
  })
})

describe('카테고리 추가·수정', () => {
  it('새 카테고리를 추가한다(색은 같은 유형에서 순환 배정)', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 추가' })
    expect(within(dialog).getByRole('radio', { name: '인디고' })).toBeChecked()

    await user.type(within(dialog).getByLabelText('이름'), '  반려동물  ')
    await user.click(within(dialog).getByRole('radio', { name: '보라' }))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(names(expenseList())).toContain('반려동물')
    expect(names(expenseList()).at(-1)).toBe('반려동물')
    expect(names(incomeList())).not.toContain('반려동물')
  })

  it('수입 카테고리도 추가한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '수입 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '수입 카테고리 추가' })
    await user.type(within(dialog).getByLabelText('이름'), '이자')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(names(incomeList())).toEqual(['급여', '부수입', '용돈', '기타', '이자'])
  })

  it('빈 이름과 같은 유형의 중복 이름은 거부하고 필드에 오류를 표시한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 추가' })

    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('카테고리 이름은 1~20자로 입력해 주세요.')
    expect(within(dialog).getByLabelText('이름')).toHaveFocus()

    await user.type(within(dialog).getByLabelText('이름'), '식비')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('같은 이름의 카테고리가 이미 있습니다.')
    expect(screen.getByRole('dialog', { name: '지출 카테고리 추가' })).toBeInTheDocument()
  })

  it('같은 이름이라도 다른 유형이면 추가할 수 있다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '수입 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '수입 카테고리 추가' })
    await user.type(within(dialog).getByLabelText('이름'), '식비')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(names(incomeList())).toContain('식비')
  })

  it('이름과 색을 수정한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 식비 수정' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 수정' })
    expect(within(dialog).getByLabelText('이름')).toHaveValue('식비')
    expect(within(dialog).getByRole('radio', { name: '인디고' })).toBeChecked()

    await user.clear(within(dialog).getByLabelText('이름'))
    await user.type(within(dialog).getByLabelText('이름'), '외식·식비')
    await user.click(within(dialog).getByRole('radio', { name: '빨강' }))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(names(expenseList())[0]).toBe('외식·식비')
    const saved = await createLocalStorageRepository().categories.list()
    expect(saved.find((c) => c.id === 'cat-expense-1')).toMatchObject({ name: '외식·식비', color: '#ef4444' })
  })

  it('수정 중 자기 이름은 중복으로 보지 않지만 다른 카테고리 이름은 거부한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 식비 수정' }))
    let dialog = screen.getByRole('dialog', { name: '지출 카테고리 수정' })
    await user.click(within(dialog).getByRole('button', { name: '저장' })) // 이름 그대로 저장
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '지출 카테고리 식비 수정' }))
    dialog = screen.getByRole('dialog', { name: '지출 카테고리 수정' })
    await user.clear(within(dialog).getByLabelText('이름'))
    await user.type(within(dialog).getByLabelText('이름'), '교통')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('같은 이름')
  })

  it('취소하면 변경하지 않는다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 추가' })
    await user.type(within(dialog).getByLabelText('이름'), '취소할이름')
    await user.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(names(expenseList())).not.toContain('취소할이름')
  })
})

describe('카테고리 삭제', () => {
  it('사용하지 않는 카테고리는 확인 후 바로 삭제한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 교통 삭제' }))
    const dialog = screen.getByRole('dialog', { name: '카테고리 삭제' })
    expect(dialog).toHaveTextContent('‘교통’ 카테고리를 삭제할까요?')
    expect(within(dialog).queryByLabelText('옮길 카테고리')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))
    expect(names(expenseList())).not.toContain('교통')
  })

  it('삭제를 취소하면 유지한다', async () => {
    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 교통 삭제' }))
    await user.click(within(screen.getByRole('dialog', { name: '카테고리 삭제' })).getByRole('button', { name: '취소' }))
    expect(names(expenseList())).toContain('교통')
  })

  it('사용 중인 카테고리는 같은 유형의 카테고리로 내역을 옮겨야 삭제된다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    const base = { type: 'expense' as const, categoryId: 'cat-expense-1', paymentMethodId: 'pay-1', memo: '', tags: [] }
    const a = await repo.transactions.create({ ...base, amount: 1000, date: '2026-10-01' })
    const b = await repo.transactions.create({ ...base, amount: 2000, date: '2026-10-02' })

    const user = userEvent.setup()
    await openCategories()
    await user.click(screen.getByRole('button', { name: '지출 카테고리 식비 삭제' }))
    const dialog = screen.getByRole('dialog', { name: '카테고리 삭제' })
    expect(dialog).toHaveTextContent('내역이 2건 있습니다')

    const select = within(dialog).getByLabelText('옮길 카테고리')
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).not.toContain('식비')
    expect(options).toHaveLength(8)
    expect(select).toHaveValue('cat-expense-9') // 보호된 '기타'가 기본값

    await user.selectOptions(select, '교통')
    await user.click(within(dialog).getByRole('button', { name: '옮기고 삭제' }))

    expect(names(expenseList())).not.toContain('식비')
    const after = createLocalStorageRepository()
    expect((await after.transactions.get(a.id))?.categoryId).toBe('cat-expense-2')
    expect((await after.transactions.get(b.id))?.categoryId).toBe('cat-expense-2')
    expect(within(expenseList()).getAllByRole('listitem')[0]).toHaveTextContent('2건') // 교통
  })
})
