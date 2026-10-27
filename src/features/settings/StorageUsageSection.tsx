import { useLedgerData } from '../../app/ledgerDataContext'
import { useStorageMode } from '../../app/ledgerContext'
import { Card } from '../../components/Card'
import { formatMegabytes, summarizeUsage } from '../../domain/storageUsage'

export function StorageUsageSection() {
  const mode = useStorageMode()
  const { usage, transactions } = useLedgerData()

  if (mode === 'session') {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">저장 공간</h2>
        <p className="text-sm text-muted">
          이 브라우저에서는 데이터를 저장할 수 없어 이 창이 열려 있는 동안만 유지됩니다. 아래에서 백업 파일을 내려받아 두세요.
        </p>
      </Card>
    )
  }

  const summary = summarizeUsage(usage, transactions.length)
  const levelLabel = summary.level === 'critical' ? ' · 거의 가득 참' : summary.level === 'warning' ? ' · 주의' : ''

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">저장 공간</h2>
      <div
        role="progressbar"
        aria-label="저장 공간 사용량"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.percent}
        className="h-3 overflow-hidden rounded-full bg-primary-soft"
      >
        <div
          className={`h-full rounded-full ${summary.level === 'ok' ? 'bg-primary' : 'bg-danger'}`}
          style={{ width: `${summary.percent}%` }}
        />
      </div>
      <p className="text-sm">
        {summary.percent}% 사용 중{levelLabel} · {formatMegabytes(usage.usedChars)} / 약 {formatMegabytes(usage.limitChars)}
      </p>
      {summary.remainingTransactions !== null && (
        <p className="text-sm text-muted">
          지금 추세로 약 {summary.remainingTransactions.toLocaleString('ko-KR')}건을 더 저장할 수 있습니다. 브라우저 저장 공간은 한계가
          있으므로 가까워지면 백업 후 오래된 내역을 정리해 주세요.
        </p>
      )}
    </Card>
  )
}
