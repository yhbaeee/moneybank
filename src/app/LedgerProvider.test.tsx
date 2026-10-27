import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { createSeedData } from '../domain/defaults'
import { serializeBackup, createBackup } from '../storage/backup'
import { createLocalStorageRepository, LEDGER_STORAGE_KEY } from '../storage/localStorageRepository'
import { downloadTextFile } from './download'
import { useStorageMode } from './ledgerContext'
import { LedgerProvider } from './LedgerProvider'

vi.mock('./download', () => ({ downloadTextFile: vi.fn() }))

function Probe() {
  return <p data-testid="mode">{useStorageMode()}</p>
}

function renderProvider() {
  return render(
    <ToastProvider>
      <LedgerProvider repository={createLocalStorageRepository()}>
        <p>본문</p>
        <Probe />
      </LedgerProvider>
    </ToastProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(downloadTextFile).mockClear()
})

describe('LedgerProvider', () => {
  it('초기화가 끝나면 자식을 렌더링하고 기본 데이터를 저장한다', async () => {
    renderProvider()
    expect(await screen.findByText('본문')).toBeInTheDocument()
    expect(screen.getByTestId('mode')).toHaveTextContent('persistent')
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).not.toBeNull()
  })

  it('브라우저 저장소를 쓸 수 없으면 이 세션에서만 유지되는 임시 저장소로 계속 쓸 수 있게 한다', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    renderProvider()
    expect(await screen.findByText('본문')).toBeInTheDocument()
    expect(screen.getByTestId('mode')).toHaveTextContent('session')
  })
})

describe('손상된 데이터 복구 화면', () => {
  it('손상된 데이터면 복구 화면을 보여 주고 원본은 그대로 둔다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    renderProvider()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('손상')
    expect(alert).toHaveTextContent('지우지 않고 그대로 두었습니다')
    expect(screen.queryByText('본문')).not.toBeInTheDocument()
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
    expect(document.title).toBe('데이터 복구 · 가계부')
    expect(screen.getByRole('button', { name: '손상된 원본 데이터 저장' })).toBeInTheDocument()
  })

  it('손상된 원본을 파일로 저장할 수 있다(원문 그대로)', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    const user = userEvent.setup()
    renderProvider()
    await user.click(await screen.findByRole('button', { name: '손상된 원본 데이터 저장' }))
    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [fileName, text, mime] = vi.mocked(downloadTextFile).mock.calls[0]
    expect(fileName).toMatch(/^가계부-손상데이터-\d{4}-\d{2}-\d{2}\.txt$/)
    expect(text).toBe('{broken')
    expect(mime).toBe('text/plain')
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })

  it('백업 파일로 복구하면 데이터가 바뀌고 앱이 열린다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    const user = userEvent.setup()
    const { container } = renderProvider()
    await screen.findByRole('alert')

    const backup = serializeBackup(createBackup(createSeedData(), '2026-10-27T00:00:00.000Z'))
    const file = new File([backup], 'backup.json', { type: 'application/json' })
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, file)

    expect(await screen.findByText('본문')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEDGER_STORAGE_KEY)!)).toMatchObject({ schemaVersion: 1 })
    expect(screen.getByTestId('mode')).toHaveTextContent('persistent')
  })

  it('잘못된 백업 파일은 거부하고 손상된 원본을 그대로 둔다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    const user = userEvent.setup()
    const { container } = renderProvider()
    await screen.findByRole('alert')

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['x'], 'bad.json', { type: 'application/json' }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((a) => a.textContent?.includes('백업 파일을 사용할 수 없습니다. 기존 데이터는 변경되지 않았습니다.'))).toBe(true)
    expect(screen.queryByText('본문')).not.toBeInTheDocument()
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })

  it('새로 시작은 확인을 거쳐야 하고, 확인하면 기본 데이터로 시작한다', async () => {
    localStorage.setItem(LEDGER_STORAGE_KEY, '{broken')
    const user = userEvent.setup()
    renderProvider()
    await user.click(await screen.findByRole('button', { name: '모든 데이터를 지우고 새로 시작' }))
    const dialog = screen.getByRole('dialog', { name: '모두 지우고 새로 시작할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(localStorage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')

    await user.click(screen.getByRole('button', { name: '모든 데이터를 지우고 새로 시작' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '새로 시작' }))
    expect(await screen.findByText('본문')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEDGER_STORAGE_KEY)!).transactions).toEqual([])
  })
})
