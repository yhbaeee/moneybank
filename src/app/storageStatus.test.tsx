import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StorageUsageSection } from '../features/settings/StorageUsageSection'
import { LedgerDataContext, type LedgerDataValue } from './ledgerDataContext'
import { StorageModeContext, type StorageMode } from './ledgerContext'
import { StorageBanner } from './StorageBanner'

function value(usedChars: number, limitChars = 5_000_000, transactionCount = 1000): LedgerDataValue {
  return {
    transactions: Array.from({ length: transactionCount }, () => ({}) as never),
    categories: [],
    paymentMethods: [],
    usage: { usedChars, limitChars },
  } as unknown as LedgerDataValue
}

function renderWith(ui: React.ReactNode, data: LedgerDataValue, mode: StorageMode = 'persistent') {
  return render(
    <MemoryRouter>
      <StorageModeContext.Provider value={mode}>
        <LedgerDataContext.Provider value={data}>{ui}</LedgerDataContext.Provider>
      </StorageModeContext.Provider>
    </MemoryRouter>,
  )
}

describe('StorageBanner', () => {
  it('저장 공간에 여유가 있으면 아무것도 보여 주지 않는다', () => {
    const { container } = renderWith(<StorageBanner />, value(1_000_000))
    expect(container).toBeEmptyDOMElement()
  })

  it('80% 이상이면 남은 건수와 백업 권장을 알리고 설정 링크를 제공한다', () => {
    renderWith(<StorageBanner />, value(4_100_000))
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('저장 공간이 부족해지고 있습니다 (82% 사용 중)')
    // 건당 평균 4,100자(4,100,000 ÷ 1,000건) → 남은 900,000자 ÷ 4,100 = 219건
    expect(banner).toHaveTextContent('약 219건을 더 저장할 수 있습니다')
    expect(banner).toHaveTextContent('백업 파일을 내려받아 두고 오래된 내역 정리를 권장합니다')
    expect(screen.getByRole('link', { name: '설정에서 백업하기' })).toHaveAttribute('href', '/settings')
  })

  it('95% 이상이면 "거의 가득 찼습니다"로 강하게 알린다', () => {
    renderWith(<StorageBanner />, value(4_900_000))
    expect(screen.getByRole('status')).toHaveTextContent('저장 공간이 거의 가득 찼습니다 (98% 사용 중)')
  })

  it('"닫기"로 이 세션 동안 숨길 수 있다', async () => {
    renderWith(<StorageBanner />, value(4_100_000))
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('임시 저장소(세션 모드)에서는 데이터가 사라진다는 경고를 항상 보여 주고 닫을 수 없다', () => {
    renderWith(<StorageBanner />, value(0, Number.POSITIVE_INFINITY), 'session')
    expect(screen.getByRole('status')).toHaveTextContent('창을 닫으면 입력한 내용이 사라집니다')
    expect(screen.getByRole('link', { name: '백업 파일 내려받기' })).toHaveAttribute('href', '/settings')
    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument()
  })
})

describe('StorageUsageSection', () => {
  it('사용률, 크기, 남은 건수를 표시하고 진행 막대에 값을 노출한다', () => {
    renderWith(<StorageUsageSection />, value(3_000_000, 5_000_000, 12_000))
    const bar = screen.getByRole('progressbar', { name: '저장 공간 사용량' })
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText(/60% 사용 중 · 3\.0MB \/ 약 5\.0MB/)).toBeInTheDocument()
    expect(screen.getByText(/약 8,000건을 더 저장할 수 있습니다/)).toBeInTheDocument()
  })

  it('주의·거의 가득 참 상태를 글자로도 표시한다(색에만 의존하지 않는다)', () => {
    const { unmount } = renderWith(<StorageUsageSection />, value(4_200_000))
    expect(screen.getByText(/84% 사용 중 · 주의/)).toBeInTheDocument()
    unmount()
    renderWith(<StorageUsageSection />, value(4_900_000))
    expect(screen.getByText(/98% 사용 중 · 거의 가득 참/)).toBeInTheDocument()
  })

  it('임시 저장소에서는 사용률 대신 세션 한정 안내를 보여 준다', () => {
    renderWith(<StorageUsageSection />, value(0, Number.POSITIVE_INFINITY), 'session')
    expect(screen.getByText(/이 창이 열려 있는 동안만 유지됩니다/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
