import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/toastContext'
import type { Transaction } from '../domain/types'
import { TransactionForm } from '../features/transactions/TransactionForm'
import { focusPageHeading } from './focus'
import { useLedgerData } from './ledgerDataContext'
import { TransactionEditorContext, type TransactionEditorValue } from './transactionEditorContext'

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; transaction: Transaction }

/** 내역 등록/수정 폼과 삭제 확인을 한 곳에서 관리해 어느 화면에서든 열 수 있게 한다. */
export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const { removeTransaction } = useLedgerData()
  const { showToast } = useToast()
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const wasOpen = useRef(false)
  const isOpen = editor.mode !== 'closed'

  // 폼을 닫았는데 포커스가 사라졌다면(예: 삭제로 눌렀던 행이 없어짐) 페이지 제목으로 옮긴다.
  useEffect(() => {
    if (wasOpen.current && !isOpen && (!document.activeElement || document.activeElement === document.body)) {
      focusPageHeading()
    }
    wasOpen.current = isOpen
  }, [isOpen])

  const value = useMemo<TransactionEditorValue>(
    () => ({
      openCreate: () => setEditor({ mode: 'create' }),
      openEdit: (transaction) => setEditor({ mode: 'edit', transaction }),
    }),
    [],
  )

  async function handleConfirmDelete() {
    if (editor.mode !== 'edit') return
    try {
      await removeTransaction(editor.transaction.id)
      showToast('삭제했습니다', 'success')
      setConfirmingDelete(false)
      setEditor({ mode: 'closed' })
    } catch (error) {
      setConfirmingDelete(false)
      showToast(error instanceof Error ? error.message : '삭제하지 못했습니다.', 'error')
    }
  }

  return (
    <TransactionEditorContext.Provider value={value}>
      {children}
      <TransactionForm
        open={editor.mode !== 'closed'}
        transaction={editor.mode === 'edit' ? editor.transaction : undefined}
        onClose={() => setEditor({ mode: 'closed' })}
        onRequestDelete={() => setConfirmingDelete(true)}
      />
      <ConfirmDialog
        open={confirmingDelete}
        title="내역을 삭제할까요?"
        message="삭제한 내역은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </TransactionEditorContext.Provider>
  )
}
