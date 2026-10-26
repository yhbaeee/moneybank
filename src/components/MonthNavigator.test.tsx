import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asMonthString } from '../domain/date'
import { MonthNavigator } from './MonthNavigator'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MonthNavigator', () => {
  it('현재 월을 한글로 표시한다', () => {
    render(<MonthNavigator month={asMonthString('2026-09')} onChange={() => {}} />)
    expect(screen.getByText('2026년 9월')).toBeInTheDocument()
  })

  it('이전 달·다음 달로 이동하며 연도 경계를 넘는다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<MonthNavigator month={asMonthString('2026-01')} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '이전 달' }))
    expect(onChange).toHaveBeenLastCalledWith('2025-12')

    rerender(<MonthNavigator month={asMonthString('2026-12')} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '다음 달' }))
    expect(onChange).toHaveBeenLastCalledWith('2027-01')
  })

  it('이번 달로 돌아가는 버튼은 이미 이번 달이면 비활성이다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<MonthNavigator month={asMonthString('2026-10')} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '이번 달' })).toBeDisabled()

    rerender(<MonthNavigator month={asMonthString('2026-03')} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '이번 달' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-10')
  })

  it('지원 범위의 끝에서는 이동 버튼이 비활성이다', () => {
    const { rerender } = render(<MonthNavigator month={asMonthString('1900-01')} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음 달' })).toBeEnabled()

    rerender(<MonthNavigator month={asMonthString('2999-12')} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled()
  })
})
