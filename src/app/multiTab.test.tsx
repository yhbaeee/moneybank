import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalStorageRepository, LEDGER_STORAGE_KEY } from '../storage/localStorageRepository'
import { App } from './App'

/** 다른 탭이 같은 저장소를 바꿨을 때 현재 탭 화면이 따라가는지 검증한다. */

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

async function openList() {
  window.history.pushState({}, '', '/transactions')
  render(<App />)
  await screen.findByRole('heading', { level: 1, name: '내역' })
}

const newTransaction = (memo: string) => ({
  type: 'expense' as const,
  amount: 3000,
  date: '2026-10-05',
  categoryId: 'cat-expense-1',
  paymentMethodId: 'pay-1',
  memo,
  tags: [],
})

function fireStorageEvent(key: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key }))
  })
}

describe('다른 탭 변경 반영', () => {
  it('다른 탭이 내역을 추가하면 storage 이벤트로 화면이 갱신된다', async () => {
    await openList()
    expect(screen.getByText('이 달의 내역이 없습니다')).toBeInTheDocument()

    // 다른 탭: 같은 localStorage에 쓴다(이 탭에는 storage 이벤트가 온다).
    await createLocalStorageRepository().transactions.create(newTransaction('다른 탭에서 추가'))
    fireStorageEvent(LEDGER_STORAGE_KEY)

    expect(await screen.findByRole('button', { name: /다른 탭에서 추가/ })).toBeInTheDocument()
  })

  it('다른 탭이 저장소를 비우거나(key=null) 데이터를 지워도 반영한다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    await repo.transactions.create(newTransaction('곧 사라질 내역'))
    await openList()
    expect(await screen.findByRole('button', { name: /곧 사라질 내역/ })).toBeInTheDocument()

    await createLocalStorageRepository().reset()
    fireStorageEvent(null)
    expect(await screen.findByText('이 달의 내역이 없습니다')).toBeInTheDocument()
  })

  it('관련 없는 키의 변경은 무시한다', async () => {
    await openList()
    await createLocalStorageRepository().transactions.create(newTransaction('아직 안 보여야 함'))
    fireStorageEvent('ledger.theme')
    // 비동기 갱신이 일어났다면 나타났을 시간을 기다린 뒤에도 화면은 그대로다.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(screen.queryByRole('button', { name: /아직 안 보여야 함/ })).not.toBeInTheDocument()
  })

  it('다른 탭이 데이터를 망가뜨리면 안내 화면을 보여 주고 원본은 보존한다', async () => {
    await openList()
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    fireStorageEvent(LEDGER_STORAGE_KEY)
    expect(await screen.findByRole('alert')).toHaveTextContent('데이터를 불러올 수 없습니다')
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })

  it('이 탭에서 저장한 뒤 화면은 한 번만 갱신된다(storage 이벤트 없이도 즉시 반영)', async () => {
    await openList()
    // 이 탭의 저장은 storage 이벤트를 발생시키지 않지만 화면은 즉시 반영되어야 한다.
    const repo = createLocalStorageRepository()
    await repo.transactions.create(newTransaction('이 탭 저장'))
    fireStorageEvent(LEDGER_STORAGE_KEY)
    expect(await screen.findByRole('button', { name: /이 탭 저장/ })).toBeInTheDocument()
  })
})
