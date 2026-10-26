import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Input, Select } from '../components/Field'
import { Modal } from '../components/Modal'
import { useToast } from '../components/toastContext'

/** 개발 전용 컴포넌트 쇼케이스. 프로덕션 빌드에서는 라우트가 등록되지 않는다. */
export function DevComponents() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { showToast } = useToast()

  return (
    <section aria-labelledby="dev-title" className="flex flex-col gap-4">
      <h1 id="dev-title" className="text-xl font-bold">
        컴포넌트 쇼케이스
      </h1>

      <Card className="flex flex-wrap gap-2">
        <Button>기본</Button>
        <Button variant="secondary">보조</Button>
        <Button variant="danger">삭제</Button>
        <Button variant="ghost">고스트</Button>
        <Button disabled>비활성</Button>
      </Card>

      <Card className="flex flex-wrap gap-2">
        <Badge>기본</Badge>
        <Badge tone="income">+ 수입</Badge>
        <Badge tone="expense">− 지출</Badge>
      </Card>

      <Card className="grid gap-4 md:grid-cols-2">
        <Input label="금액" placeholder="0" hint="원 단위 정수" />
        <Input label="메모" defaultValue="잘못된 값" error="메모를 확인해 주세요" />
        <Select label="카테고리">
          <option>식비</option>
          <option>교통</option>
        </Select>
      </Card>

      <Card className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          모달 열기
        </Button>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          확인 대화상자
        </Button>
        <Button variant="secondary" onClick={() => showToast('저장했습니다', 'success')}>
          토스트
        </Button>
      </Card>

      <EmptyState title="빈 상태" description="표시할 항목이 없습니다." />

      <Modal open={modalOpen} title="모달 제목" onClose={() => setModalOpen(false)}>
        <p className="text-sm text-muted">모달 내용입니다.</p>
        <Button onClick={() => setModalOpen(false)}>닫기</Button>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="삭제할까요?"
        message="이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}
