import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createLocalStorageRepository, LEDGER_STORAGE_KEY } from '../storage/localStorageRepository'
import { LedgerProvider } from './LedgerProvider'

describe('LedgerProvider', () => {
  it('초기화가 끝나면 자식을 렌더링하고 기본 데이터를 저장한다', async () => {
    render(
      <LedgerProvider repository={createLocalStorageRepository()}>
        <p>본문</p>
      </LedgerProvider>,
    )
    expect(await screen.findByText('본문')).toBeInTheDocument()
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).not.toBeNull()
  })

  it('손상된 데이터면 오류를 표시하고 원본을 보존한다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    render(
      <LedgerProvider repository={createLocalStorageRepository()}>
        <p>본문</p>
      </LedgerProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('손상')
    expect(screen.queryByText('본문')).not.toBeInTheDocument()
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })
})
