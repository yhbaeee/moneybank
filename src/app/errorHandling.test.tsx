import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalStorageRepository } from '../storage/localStorageRepository'
import { App } from './App'

/**
 * 저장 실패, 다른 탭에서 바뀐 데이터 등 "정상 경로가 아닌" 상황에서 사용자에게 어떻게 보이는지 검증한다.
 * Storage 프로토타입을 직접 가로채 실제 localStorage 오류를 흉내 낸다.
 */

type User = ReturnType<typeof userEvent.setup>

function failWrites(error: Error = new DOMException('quota', 'QuotaExceededError')) {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error
  })
}

async function open(path: string, heading: string) {
  window.history.pushState({}, '', path)
  const result = render(<App />)
  await screen.findByRole('heading', { level: 1, name: heading })
  return result
}

async function fillExpense(user: User, dialog: HTMLElement, memo = '실패할 저장') {
  await user.type(within(dialog).getByLabelText('금액'), '5000')
  await user.type(within(dialog).getByLabelText('메모'), memo)
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('내역 저장 실패', () => {
  it('저장 공간이 부족하면 오류 알림을 보여 주고 폼과 입력값을 유지한다', async () => {
    const user = userEvent.setup()
    await open('/transactions', '내역')
    await user.click(screen.getAllByRole('button', { name: '내역 추가' })[0])
    const dialog = screen.getByRole('dialog', { name: '내역 추가' })
    await fillExpense(user, dialog)

    const spy = failWrites()
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
    expect(screen.getByRole('dialog', { name: '내역 추가' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('메모')).toHaveValue('실패할 저장')
    // 다시 시도할 수 있도록 저장 버튼이 활성화되어 있다.
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled()

    spy.mockRestore()
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('button', { name: /실패할 저장/ })).toBeInTheDocument()
  })

  it('저장소가 막혀 있으면 안내 메시지를 보여 준다', async () => {
    const user = userEvent.setup()
    await open('/transactions', '내역')
    await user.click(screen.getAllByRole('button', { name: '내역 추가' })[0])
    const dialog = screen.getByRole('dialog', { name: '내역 추가' })
    await fillExpense(user, dialog)
    failWrites(new DOMException('denied', 'SecurityError'))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('브라우저 저장소를 사용할 수 없습니다.')
  })

  it('다른 탭에서 카테고리가 삭제되어 저장소가 거부하면 해당 필드에 오류를 표시한다', async () => {
    const user = userEvent.setup()
    await open('/transactions', '내역')
    await user.click(screen.getAllByRole('button', { name: '내역 추가' })[0])
    const dialog = screen.getByRole('dialog', { name: '내역 추가' })
    await fillExpense(user, dialog)

    // 다른 탭이 같은 저장소에서 선택된 카테고리(식비)를 지운 상황
    await createLocalStorageRepository().categories.remove('cat-expense-1')

    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    const select = within(dialog).getByLabelText('카테고리')
    await waitFor(() => expect(select).toHaveAttribute('aria-invalid', 'true'))
    expect(select).toHaveFocus()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('선택한 유형에 맞는 카테고리를 선택해 주세요.')
    expect(screen.getByRole('dialog', { name: '내역 추가' })).toBeInTheDocument()
  })

  it('수정 중인 내역이 다른 탭에서 삭제되었으면 오류 알림을 보여 준다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    const created = await repo.transactions.create({
      type: 'expense',
      amount: 1000,
      date: '2026-10-05',
      categoryId: 'cat-expense-1',
      paymentMethodId: 'pay-1',
      memo: '사라질 내역',
      tags: [],
    })
    const user = userEvent.setup()
    await open('/transactions', '내역')
    await user.click(await screen.findByRole('button', { name: /사라질 내역/ }))
    const dialog = screen.getByRole('dialog', { name: '내역 수정' })

    await repo.transactions.remove(created.id) // 다른 탭에서 삭제
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('내역을 찾을 수 없습니다.')
  })
})

describe('내역 삭제 실패', () => {
  it('삭제에 실패하면 오류 알림을 보여 주고 내역은 남는다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    await repo.transactions.create({
      type: 'expense',
      amount: 1000,
      date: '2026-10-05',
      categoryId: 'cat-expense-1',
      paymentMethodId: 'pay-1',
      memo: '지켜질 내역',
      tags: [],
    })
    const user = userEvent.setup()
    await open('/transactions', '내역')
    await user.click(await screen.findByRole('button', { name: /지켜질 내역/ }))
    await user.click(within(screen.getByRole('dialog', { name: '내역 수정' })).getByRole('button', { name: '삭제' }))

    failWrites()
    await user.click(within(screen.getByRole('dialog', { name: '내역을 삭제할까요?' })).getByRole('button', { name: '삭제' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
    vi.restoreAllMocks()
    expect((await createLocalStorageRepository().transactions.list()).map((t) => t.memo)).toEqual(['지켜질 내역'])
  })
})

describe('카테고리 변경 실패', () => {
  it('추가 중 저장에 실패하면 오류 알림을 보여 주고 폼을 유지한다', async () => {
    const user = userEvent.setup()
    await open('/categories', '카테고리 관리')
    await user.click(screen.getByRole('button', { name: '지출 카테고리 추가' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 추가' })
    await user.type(within(dialog).getByLabelText('이름'), '반려동물')
    failWrites()
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
    expect(screen.getByRole('dialog', { name: '지출 카테고리 추가' })).toBeInTheDocument()
  })

  it('삭제 중 저장에 실패하면 오류 알림을 보여 주고 카테고리는 남는다', async () => {
    const user = userEvent.setup()
    await open('/categories', '카테고리 관리')
    await user.click(screen.getByRole('button', { name: '지출 카테고리 교통 삭제' }))
    failWrites()
    await user.click(within(screen.getByRole('dialog', { name: '카테고리 삭제' })).getByRole('button', { name: '삭제' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
    vi.restoreAllMocks()
    expect((await createLocalStorageRepository().categories.list()).map((c) => c.name)).toContain('교통')
  })

  it('다른 탭에서 이미 삭제된 카테고리를 수정하려 하면 오류 알림을 보여 준다', async () => {
    const user = userEvent.setup()
    await open('/categories', '카테고리 관리')
    await user.click(screen.getByRole('button', { name: '지출 카테고리 교통 수정' }))
    const dialog = screen.getByRole('dialog', { name: '지출 카테고리 수정' })
    await createLocalStorageRepository().categories.remove('cat-expense-2')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('카테고리를 찾을 수 없습니다.')
  })
})

describe('설정 화면 실패', () => {
  async function chooseBackup(user: User, container: HTMLElement) {
    const seed = await createLocalStorageRepository().exportAll()
    const file = new File([JSON.stringify(seed)], 'backup.json', { type: 'application/json' })
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, file)
  }

  it('백업 내보내기 중 저장소를 읽지 못하면 오류 알림을 보여 준다', async () => {
    const user = userEvent.setup()
    await open('/settings', '설정')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('읽기 실패')
    })
    await user.click(screen.getByRole('button', { name: '백업 파일 내보내기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('브라우저 저장소를 사용할 수 없습니다.')
  })

  it('가져오기 저장에 실패하면 오류 알림을 보여 주고 기존 데이터를 보존한다', async () => {
    const user = userEvent.setup()
    const { container } = await open('/settings', '설정')
    await chooseBackup(user, container)
    const dialog = await screen.findByRole('dialog', { name: '백업으로 바꿀까요?' })
    const before = localStorage.getItem('ledger.data')
    failWrites()
    await user.click(within(dialog).getByRole('button', { name: '바꾸기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
    vi.restoreAllMocks()
    expect(localStorage.getItem('ledger.data')).toBe(before)
  })

  it('파일을 읽지 못하면(파일 오류) 안내를 보여 주고 아무것도 바꾸지 않는다', async () => {
    const user = userEvent.setup()
    const { container } = await open('/settings', '설정')
    const file = new File(['{}'], 'broken.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => Promise.reject(new Error('read error')) })
    const before = localStorage.getItem('ledger.data')
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, file)
    expect(await screen.findByRole('alert')).toHaveTextContent('파일을 읽지 못했습니다.')
    expect(localStorage.getItem('ledger.data')).toBe(before)
  })

  it('초기화 저장에 실패하면 오류 알림을 보여 준다', async () => {
    const user = userEvent.setup()
    await open('/settings', '설정')
    await user.click(screen.getByRole('button', { name: '모든 데이터 초기화' }))
    failWrites()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 부족합니다.')
  })
})

describe('시작 시 저장소 문제', () => {
  it('저장소를 읽을 수 없으면 이 세션에서만 저장되는 임시 저장소로 계속 쓸 수 있고 경고를 계속 보여 준다', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const user = userEvent.setup()
    window.history.pushState({}, '', '/transactions')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: '내역' })).toBeInTheDocument()
    const banner = screen.getAllByRole('status').find((el) => el.textContent?.includes('창을 닫으면 입력한 내용이 사라집니다'))
    expect(banner).toBeDefined()

    // 내역을 입력하고 저장하면 이 세션 안에서는 그대로 보인다.
    await user.click(screen.getAllByRole('button', { name: '내역 추가' })[0])
    const dialog = screen.getByRole('dialog', { name: '내역 추가' })
    await user.type(within(dialog).getByLabelText('금액'), '4500')
    await user.type(within(dialog).getByLabelText('메모'), '임시 저장')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('button', { name: /임시 저장/ })).toHaveTextContent('-4,500원')
    // 실제 브라우저 저장소에는 아무것도 쓰지 않는다.
    expect(localStorage.length).toBe(0)
  })

  it('저장된 데이터가 손상되었으면 원본을 보존하고 안내한다', async () => {
    localStorage.setItem('ledger.data', '{broken')
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('손상')
    expect(localStorage.getItem('ledger.data')).toBe('{broken')
  })
})
