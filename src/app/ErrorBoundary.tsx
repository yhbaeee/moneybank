import { Component, type ErrorInfo, type ReactNode } from 'react'
import { todayString } from '../domain/date'
import { ledgerRepository } from '../storage'
import { downloadTextFile } from './download'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
  /** 백업 내려받기 실패 안내 */
  backupMessage: string | null
}

/**
 * 렌더링 중 예기치 못한 오류가 나도 빈 화면 대신 안내를 보여 준다.
 * 저장된 데이터는 건드리지 않았으므로 새로 불러오거나, 원본을 파일로 내려받아 둘 수 있다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, backupMessage: null }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 렌더링 중 오류가 발생했습니다.', error, info.componentStack)
  }

  private handleBackup = async () => {
    try {
      const raw = await ledgerRepository.exportRaw()
      if (raw === null) {
        this.setState({ backupMessage: '저장된 데이터가 없습니다.' })
        return
      }
      downloadTextFile(`가계부-백업-${todayString()}.json`, raw)
      this.setState({ backupMessage: '데이터를 파일로 내려받았습니다.' })
    } catch {
      this.setState({ backupMessage: '데이터를 내려받지 못했습니다.' })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" className="mx-auto flex max-w-md flex-col gap-4 p-4">
        <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
        <p className="text-sm text-muted">
          화면을 표시하는 중 예기치 못한 오류가 생겼습니다. 저장된 데이터는 변경되지 않았습니다. 다시 불러와도 같은 문제가
          반복되면 먼저 데이터를 내려받아 두세요.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            다시 불러오기
          </button>
          <button
            type="button"
            onClick={this.handleBackup}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium"
          >
            데이터 내려받기
          </button>
        </div>
        {this.state.backupMessage && (
          <p role="status" className="text-sm">
            {this.state.backupMessage}
          </p>
        )}
      </main>
    )
  }
}
