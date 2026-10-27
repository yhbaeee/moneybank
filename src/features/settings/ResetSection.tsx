import { useState } from 'react'
import { useLedgerData } from '../../app/ledgerDataContext'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useToast } from '../../components/toastContext'

export function ResetSection() {
  const { transactions, categories, resetData } = useLedgerData()
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)

  async function handleReset() {
    setConfirming(false)
    try {
      await resetData()
      showToast('모든 데이터를 초기화했습니다', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '초기화하지 못했습니다.', 'error')
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">데이터 초기화</h2>
        <p className="mt-1 text-sm text-muted">모든 내역과 직접 만든 카테고리를 지우고 처음 상태(기본 카테고리·결제수단)로 되돌립니다.</p>
      </div>
      <div>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          모든 데이터 초기화
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="모든 데이터를 초기화할까요?"
        message={`내역 ${transactions.length}건과 카테고리 ${categories.length}개를 포함한 모든 데이터가 삭제되고 기본 상태로 돌아갑니다. 되돌릴 수 없으니 필요하면 먼저 백업 파일을 내보내 두세요.`}
        confirmLabel="초기화"
        destructive
        onConfirm={handleReset}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  )
}
