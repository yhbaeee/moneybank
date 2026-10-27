import { useState } from 'react'
import { Link } from 'react-router-dom'
import { summarizeUsage } from '../domain/storageUsage'
import { useLedgerData } from './ledgerDataContext'
import { useStorageMode } from './ledgerContext'

const linkClass = 'inline-flex min-h-11 items-center font-medium text-primary underline'

/**
 * 저장 상태에 문제가 있을 때 화면 위쪽에 계속 보여 주는 안내:
 * - 임시 저장소(브라우저 저장소를 쓸 수 없음): 창을 닫으면 사라지므로 백업을 권한다. 닫을 수 없다.
 * - 저장 공간이 80% 이상: 백업과 정리를 권한다. 이 세션 동안 닫을 수 있다.
 */
export function StorageBanner() {
  const mode = useStorageMode()
  const { usage, transactions } = useLedgerData()
  const [dismissed, setDismissed] = useState(false)

  if (mode === 'session') {
    return (
      <div role="status" className="border-b border-danger bg-primary-soft px-4 py-2 text-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3">
          <p>
            이 브라우저에서는 데이터를 저장할 수 없어 <strong>창을 닫으면 입력한 내용이 사라집니다.</strong>
          </p>
          <Link to="/settings" className={linkClass}>
            백업 파일 내려받기
          </Link>
        </div>
      </div>
    )
  }

  const summary = summarizeUsage(usage, transactions.length)
  if (summary.level === 'ok' || dismissed) return null

  return (
    <div role="status" className={`border-b bg-primary-soft px-4 py-2 text-sm ${summary.level === 'critical' ? 'border-danger' : 'border-line'}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3">
        <p>
          {summary.level === 'critical' ? '저장 공간이 거의 가득 찼습니다' : '저장 공간이 부족해지고 있습니다'} ({summary.percent}% 사용 중).
          {summary.remainingTransactions !== null && ` 약 ${summary.remainingTransactions.toLocaleString('ko-KR')}건을 더 저장할 수 있습니다.`}{' '}
          백업 파일을 내려받아 두고 오래된 내역 정리를 권장합니다.
        </p>
        <span className="flex items-center gap-3">
          <Link to="/settings" className={linkClass}>
            설정에서 백업하기
          </Link>
          <button type="button" onClick={() => setDismissed(true)} className="inline-flex min-h-11 items-center px-2 underline">
            닫기
          </button>
        </span>
      </div>
    </div>
  )
}
