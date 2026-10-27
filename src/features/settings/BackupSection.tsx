import { useRef, useState, type ChangeEvent } from 'react'
import { downloadTextFile } from '../../app/download'
import { useLedgerData } from '../../app/ledgerDataContext'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useToast } from '../../components/toastContext'
import { todayString } from '../../domain/date'
import type { LedgerData } from '../../domain/types'
import { backupFileName, createBackup, serializeBackup } from '../../storage/backup'
import { readBackupFile } from '../../storage/backupFile'

interface ImportFailure {
  message: string
  details: string[]
}

function describeCounts(data: Pick<LedgerData, 'transactions' | 'categories'>): string {
  return `내역 ${data.transactions.length}건, 카테고리 ${data.categories.length}개`
}

export function BackupSection() {
  const ledger = useLedgerData()
  const { showToast } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState<ImportFailure | null>(null)
  const [pending, setPending] = useState<LedgerData | null>(null)

  async function handleExport() {
    try {
      const data = await ledger.exportData()
      const backup = createBackup(data, new Date().toISOString())
      downloadTextFile(backupFileName(todayString()), serializeBackup(backup))
      showToast('백업 파일을 내려받았습니다', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '백업 파일을 만들지 못했습니다.', 'error')
    }
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    // 같은 파일을 다시 고를 수 있도록 선택 값을 비운다.
    input.value = ''
    setFailure(null)
    if (!file) return

    const result = await readBackupFile(file)
    if (result.ok) setPending(result.data)
    else setFailure({ message: result.message, details: result.details })
  }

  async function handleConfirmImport() {
    if (!pending) return
    const data = pending
    setPending(null)
    try {
      await ledger.importData(data)
      showToast(`백업을 가져왔습니다 (${describeCounts(data)})`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '백업을 가져오지 못했습니다.', 'error')
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">데이터 백업</h2>
        <p className="mt-1 text-sm text-muted">
          데이터는 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 사라지므로 주기적으로 백업 파일(JSON)을 내려받아 두세요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExport}>백업 파일 내보내기</Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          백업 파일 가져오기
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {failure && (
        <div role="alert" className="rounded-lg border border-danger p-3 text-sm">
          <p className="font-medium text-danger">백업 파일을 가져올 수 없습니다. 기존 데이터는 변경되지 않았습니다.</p>
          <p className="mt-1">{failure.message}</p>
          {failure.details.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {failure.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="백업으로 바꿀까요?"
        message={
          pending
            ? `현재 데이터(${describeCounts(ledger)})가 모두 사라지고 백업 파일의 데이터(${describeCounts(pending)})로 바뀝니다. 되돌릴 수 없으니 필요하면 먼저 현재 데이터를 내보내 두세요.`
            : ''
        }
        confirmLabel="바꾸기"
        destructive
        onConfirm={handleConfirmImport}
        onCancel={() => setPending(null)}
      />
    </Card>
  )
}
