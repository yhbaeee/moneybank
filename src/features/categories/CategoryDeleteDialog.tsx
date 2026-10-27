import { useState } from 'react'
import { useLedgerData } from '../../app/ledgerDataContext'
import { Button } from '../../components/Button'
import { Select } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import type { Category } from '../../domain/types'

interface CategoryDeleteDialogProps {
  /** 삭제하려는 카테고리. null이면 닫힌 상태 */
  category: Category | null
  /** 이 카테고리를 쓰는 내역 건수 */
  usageCount: number
  onClose: () => void
}

export function CategoryDeleteDialog({ category, usageCount, onClose }: CategoryDeleteDialogProps) {
  return (
    <Modal open={category !== null} title="카테고리 삭제" onClose={onClose}>
      {category && <DeleteBody category={category} usageCount={usageCount} onClose={onClose} />}
    </Modal>
  )
}

function DeleteBody({ category, usageCount, onClose }: { category: Category; usageCount: number; onClose: () => void }) {
  const { categories, removeCategory } = useLedgerData()
  const { showToast } = useToast()
  const inUse = usageCount > 0

  // 내역을 옮길 수 있는 같은 유형의 다른 카테고리. 보호된 '기타'를 기본으로 제안한다.
  const destinations = categories.filter((c) => c.type === category.type && c.id !== category.id)
  const [destinationId, setDestinationId] = useState(() => (destinations.find((c) => c.isProtected) ?? destinations[0])?.id ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    if (submitting) return
    setSubmitting(true)
    try {
      await removeCategory(category.id, inUse ? destinationId : undefined)
      showToast(inUse ? `내역 ${usageCount}건을 옮기고 삭제했습니다` : '삭제했습니다', 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '삭제하지 못했습니다.', 'error')
      setSubmitting(false)
    }
  }

  return (
    <>
      {inUse ? (
        <>
          <p className="text-sm text-muted">
            ‘{category.name}’ 카테고리를 쓰는 내역이 {usageCount}건 있습니다. 삭제하려면 이 내역을 옮길 카테고리를 선택해 주세요.
          </p>
          <Select label="옮길 카테고리" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <p className="text-sm text-muted">‘{category.name}’ 카테고리를 삭제할까요? 이 카테고리를 쓰는 내역은 없습니다.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={submitting || (inUse && destinationId === '')}>
          {inUse ? '옮기고 삭제' : '삭제'}
        </Button>
      </div>
    </>
  )
}
