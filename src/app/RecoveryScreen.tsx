import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/toastContext'
import { todayString } from '../domain/date'
import { readBackupFile } from '../storage/backupFile'
import type { LedgerRepository } from '../storage/repository'
import { downloadTextFile } from './download'

interface RecoveryScreenProps {
  repository: LedgerRepository
  /** 복구(또는 새로 시작)에 성공했을 때. 호출자는 저장소를 다시 초기화한다. */
  onRecovered: () => void
}

interface Failure {
  message: string
  details: string[]
}

/**
 * 저장된 데이터가 손상되어 읽을 수 없을 때 보여 주는 복구 화면. 사용자가 막히지 않도록 세 가지 길을 준다:
 * 손상된 원본을 파일로 저장 / 백업 파일로 복구 / 모두 지우고 새로 시작. 원본은 사용자가 직접 선택하기 전에는 지우지 않는다.
 */
export function RecoveryScreen({ repository, onRecovered }: RecoveryScreenProps) {
  const { showToast } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    document.title = '데이터 복구 · 가계부'
  }, [])

  async function saveOriginal() {
    try {
      const raw = await repository.exportRaw()
      if (raw === null) {
        showToast('저장된 원본이 없습니다.', 'error')
        return
      }
      downloadTextFile(`가계부-손상데이터-${todayString()}.txt`, raw, 'text/plain')
      showToast('손상된 원본을 파일로 저장했습니다', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '원본을 저장하지 못했습니다.', 'error')
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    setFailure(null)
    if (!file) return

    const result = await readBackupFile(file)
    if (!result.ok) {
      setFailure({ message: result.message, details: result.details })
      return
    }
    try {
      await repository.importAll(result.data)
      showToast('백업으로 복구했습니다', 'success')
      onRecovered()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '복구하지 못했습니다.', 'error')
    }
  }

  async function startFresh() {
    setConfirmingReset(false)
    try {
      await repository.reset()
      showToast('새로 시작합니다', 'success')
      onRecovered()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '초기화하지 못했습니다.', 'error')
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div role="alert">
        <h1 className="text-xl font-bold">저장된 데이터를 읽을 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted">
          저장된 데이터가 손상되어 읽을 수 없습니다. 기존 데이터는 지우지 않고 그대로 두었습니다. 아래 방법 중 하나로 계속할 수
          있습니다.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">1. 손상된 원본 저장</h2>
        <p className="text-sm text-muted">나중에 복구를 시도해 볼 수 있도록 손상된 원본을 파일로 저장합니다. 다른 방법을 쓰기 전에 먼저 해 두세요.</p>
        <div>
          <Button variant="secondary" onClick={saveOriginal}>
            손상된 원본 데이터 저장
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">2. 백업 파일로 복구</h2>
        <p className="text-sm text-muted">이전에 내려받은 백업 파일(JSON)이 있다면 그 데이터로 바꿉니다. 손상된 원본은 대체됩니다.</p>
        <div>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            백업 파일로 복구
          </Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
        </div>
        {failure && (
          <div role="alert" className="rounded-lg border border-danger p-3 text-sm">
            <p className="font-medium text-danger">백업 파일을 사용할 수 없습니다. 기존 데이터는 변경되지 않았습니다.</p>
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
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">3. 새로 시작</h2>
        <p className="text-sm text-muted">손상된 데이터를 지우고 처음 상태(기본 카테고리·결제수단)로 시작합니다. 되돌릴 수 없습니다.</p>
        <div>
          <Button variant="danger" onClick={() => setConfirmingReset(true)}>
            모든 데이터를 지우고 새로 시작
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmingReset}
        title="모두 지우고 새로 시작할까요?"
        message="손상된 데이터가 삭제되고 처음 상태로 돌아갑니다. 되돌릴 수 없으니 필요하면 먼저 '손상된 원본 데이터 저장'으로 파일을 받아 두세요."
        confirmLabel="새로 시작"
        destructive
        onConfirm={startFresh}
        onCancel={() => setConfirmingReset(false)}
      />
    </main>
  )
}
