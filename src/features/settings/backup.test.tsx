import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { downloadTextFile } from '../../app/download'
import { asDateString } from '../../domain/date'
import { createSeedData } from '../../domain/defaults'
import type { LedgerData } from '../../domain/types'
import { createBackup, serializeBackup } from '../../storage/backup'
import { createLocalStorageRepository } from '../../storage/localStorageRepository'

vi.mock('../../app/download', () => ({ downloadTextFile: vi.fn() }))

/** 실제 저장소(localStorage)까지 연결한 설정 화면(백업·초기화) 흐름 테스트 */

async function openSettings() {
  window.history.pushState({}, '', '/settings')
  const result = render(<App />)
  await screen.findByRole('heading', { level: 1, name: '설정' })
  return result
}

function backupData(): LedgerData {
  const seed = createSeedData()
  return {
    ...seed,
    categories: [...seed.categories, { id: 'c-custom', name: '반려동물', type: 'expense', color: '#a855f7', isDefault: false, isProtected: false, sortOrder: 10 }],
    transactions: [
      {
        id: 't1',
        type: 'expense',
        amount: 12000,
        date: asDateString('2026-10-27'),
        categoryId: 'c-custom',
        paymentMethodId: 'pay-1',
        memo: '사료',
        tags: ['펫'],
        ownerId: 'member-me',
        createdAt: '2026-10-27T00:00:00.000Z',
        updatedAt: '2026-10-27T00:00:00.000Z',
      },
    ],
  }
}

const backupFile = (data: LedgerData = backupData()) =>
  new File([serializeBackup(createBackup(data, '2026-10-27T00:00:00.000Z'))], 'backup.json', { type: 'application/json' })

const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!
const currentData = () => createLocalStorageRepository().exportAll()

beforeEach(() => {
  localStorage.clear()
  vi.mocked(downloadTextFile).mockClear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('백업 내보내기', () => {
  it('날짜가 들어간 파일 이름으로 전체 데이터를 내려받는다', async () => {
    const repo = createLocalStorageRepository()
    await repo.init()
    await repo.importAll(backupData())

    const user = userEvent.setup()
    await openSettings()
    await user.click(screen.getByRole('button', { name: '백업 파일 내보내기' }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [fileName, text] = vi.mocked(downloadTextFile).mock.calls[0]
    expect(fileName).toBe('가계부-백업-2026-10-27.json')
    const parsed = JSON.parse(text)
    expect(parsed).toMatchObject({ schemaVersion: 1 })
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.transactions).toHaveLength(1)
    expect(parsed.categories).toHaveLength(14)
    expect(await screen.findByText('백업 파일을 내려받았습니다')).toBeInTheDocument()
  })
})

describe('백업 가져오기', () => {
  it('유효한 파일은 확인 후 전체를 교체한다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    await user.upload(fileInput(container), backupFile())

    const dialog = await screen.findByRole('dialog', { name: '백업으로 바꿀까요?' })
    expect(dialog).toHaveTextContent('현재 데이터(내역 0건, 카테고리 13개)')
    expect(dialog).toHaveTextContent('백업 파일의 데이터(내역 1건, 카테고리 14개)')
    // 확인 전에는 데이터가 바뀌지 않는다.
    expect((await currentData()).transactions).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: '바꾸기' }))
    await waitFor(async () => expect((await currentData()).transactions).toHaveLength(1))
    expect(await currentData()).toEqual(backupData())
    expect(await screen.findByText(/백업을 가져왔습니다 \(내역 1건, 카테고리 14개\)/)).toBeInTheDocument()
  })

  it('확인에서 취소하면 데이터를 바꾸지 않는다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    const before = await currentData()
    await user.upload(fileInput(container), backupFile())
    await user.click(within(await screen.findByRole('dialog', { name: '백업으로 바꿀까요?' })).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await currentData()).toEqual(before)
  })

  it('JSON이 아닌 파일은 거부하고 기존 데이터를 보존한다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    const before = localStorage.getItem('ledger.data')
    await user.upload(fileInput(container), new File(['이건 JSON이 아닙니다'], 'x.json', { type: 'application/json' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('백업 파일을 가져올 수 없습니다. 기존 데이터는 변경되지 않았습니다.')
    expect(alert).toHaveTextContent('JSON 형식이 올바르지 않습니다.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('ledger.data')).toBe(before)
  })

  it('스키마가 맞지 않으면 문제 목록(최대 5개)을 보여 주고 거부한다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    const broken = backupData()
    broken.transactions = Array.from({ length: 8 }, (_, i) => ({ ...broken.transactions[0], id: `t${i}`, amount: -1 }))
    await user.upload(fileInput(container), backupFile(broken))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getAllByRole('listitem')).toHaveLength(5)
    expect(alert).toHaveTextContent('amount')
    expect((await currentData()).transactions).toHaveLength(0)
  })

  it('더 새로운 버전의 파일은 거부한다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    const future = { ...backupData(), schemaVersion: 99, exportedAt: 'x' }
    await user.upload(fileInput(container), new File([JSON.stringify(future)], 'future.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('더 새로운 버전')
  })

  it('너무 큰 파일은 읽지 않고 거부한다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    await user.upload(fileInput(container), new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'big.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('파일이 너무 큽니다')
  })

  it('실패 후 올바른 파일을 다시 고르면 오류가 사라지고 진행된다', async () => {
    const user = userEvent.setup()
    const { container } = await openSettings()
    await user.upload(fileInput(container), new File(['x'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.upload(fileInput(container), backupFile())
    expect(await screen.findByRole('dialog', { name: '백업으로 바꿀까요?' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('전체 초기화', () => {
  async function seedData() {
    const repo = createLocalStorageRepository()
    await repo.init()
    await repo.importAll(backupData())
  }

  it('확인 후 기본 데이터로 되돌린다(건수와 백업 안내 표시)', async () => {
    await seedData()
    const user = userEvent.setup()
    await openSettings()
    await user.click(screen.getByRole('button', { name: '모든 데이터 초기화' }))
    const dialog = screen.getByRole('dialog', { name: '모든 데이터를 초기화할까요?' })
    expect(dialog).toHaveTextContent('내역 1건과 카테고리 14개')
    expect(dialog).toHaveTextContent('먼저 백업 파일을 내보내 두세요')

    await user.click(within(dialog).getByRole('button', { name: '초기화' }))
    await waitFor(async () => expect(await currentData()).toEqual(createSeedData()))
    expect(await screen.findByText('모든 데이터를 초기화했습니다')).toBeInTheDocument()
  })

  it('취소하면 데이터를 유지한다', async () => {
    await seedData()
    const user = userEvent.setup()
    await openSettings()
    await user.click(screen.getByRole('button', { name: '모든 데이터 초기화' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))
    expect(await currentData()).toEqual(backupData())
  })
})
