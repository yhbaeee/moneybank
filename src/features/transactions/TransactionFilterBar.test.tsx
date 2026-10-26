import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { createSeedData } from '../../domain/defaults'
import { EMPTY_FILTERS, type TransactionFilters } from '../../domain/filter'
import { TransactionFilterBar } from './TransactionFilterBar'

const { categories, paymentMethods } = createSeedData()

function Harness({ initial = EMPTY_FILTERS, tags = ['외식', '회사'] }: { initial?: TransactionFilters; tags?: string[] }) {
  const [filters, setFilters] = useState(initial)
  return (
    <>
      <TransactionFilterBar filters={filters} onChange={setFilters} categories={categories} paymentMethods={paymentMethods} tags={tags} />
      <output data-testid="state">{JSON.stringify(filters)}</output>
    </>
  )
}

function state() {
  return JSON.parse(screen.getByTestId('state').textContent!) as TransactionFilters
}

describe('TransactionFilterBar', () => {
  it('검색어를 입력하면 필터가 갱신된다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('검색'), '점심')
    expect(state().query).toBe('점심')
  })

  it('유형·카테고리·결제수단·태그 선택이 필터에 반영된다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.selectOptions(screen.getByLabelText('유형'), '지출')
    await user.selectOptions(screen.getByLabelText('카테고리'), '식비')
    await user.selectOptions(screen.getByLabelText('결제수단'), '체크카드')
    await user.selectOptions(screen.getByLabelText('태그'), '회사')
    expect(state()).toEqual({ query: '', type: 'expense', categoryId: 'cat-expense-1', paymentMethodId: 'pay-2', tag: '회사' })
  })

  it('유형이 전체이면 카테고리를 지출/수입으로 묶어 보여 준다', () => {
    render(<Harness />)
    const select = screen.getByLabelText('카테고리')
    expect(within(select).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['지출', '수입'])
  })

  it('유형을 고르면 그 유형의 카테고리만 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.selectOptions(screen.getByLabelText('유형'), '수입')
    const names = within(screen.getByLabelText('카테고리')).getAllByRole('option').map((o) => o.textContent)
    expect(names).toEqual(['전체', '급여', '부수입', '용돈', '기타'])
  })

  it('유형과 맞지 않는 카테고리 선택은 유형을 바꿀 때 해제한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.selectOptions(screen.getByLabelText('카테고리'), '식비')
    await user.selectOptions(screen.getByLabelText('유형'), '수입')
    expect(state().categoryId).toBe('')
  })

  it('유형과 맞는 카테고리 선택은 유지한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.selectOptions(screen.getByLabelText('카테고리'), '식비')
    await user.selectOptions(screen.getByLabelText('유형'), '지출')
    expect(state().categoryId).toBe('cat-expense-1')
  })

  it('필터가 있을 때만 초기화 버튼을 보여 주고, 누르면 모두 비운다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('검색'), 'a')
    await user.selectOptions(screen.getByLabelText('유형'), '수입')
    await user.click(screen.getByRole('button', { name: '필터 초기화' }))
    expect(state()).toEqual(EMPTY_FILTERS)
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument()
  })

  it('모바일 필터 버튼은 접힘 상태를 알리고 활성 필터 개수를 표시한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const toggle = screen.getByRole('button', { name: '필터' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: '필터' })).toHaveAttribute('aria-expanded', 'true')

    await user.selectOptions(screen.getByLabelText('유형'), '지출')
    await user.selectOptions(screen.getByLabelText('태그'), '외식')
    expect(screen.getByRole('button', { name: '필터 (2)' })).toBeInTheDocument()
  })

  it('이 달에 없는 태그를 선택 중이어도 선택지에서 사라지지 않는다', () => {
    render(<Harness initial={{ ...EMPTY_FILTERS, tag: '지난달태그' }} tags={['외식']} />)
    const options = within(screen.getByLabelText('태그')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['전체', '지난달태그', '외식'])
    expect(screen.getByLabelText('태그')).toHaveValue('지난달태그')
  })
})
