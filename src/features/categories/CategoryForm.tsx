import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLedgerData } from '../../app/ledgerDataContext'
import { Button } from '../../components/Button'
import { Input } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { CATEGORY_COLOR_OPTIONS, pickCategoryColor } from '../../domain/defaults'
import type { Category, TransactionType } from '../../domain/types'
import { CategoryRuleError } from '../../storage/errors'

const MAX_CATEGORY_NAME_LENGTH = 20

const TYPE_LABEL: Record<TransactionType, string> = { expense: '지출', income: '수입' }

export type CategoryFormState =
  | { mode: 'closed' }
  | { mode: 'create'; type: TransactionType }
  | { mode: 'edit'; category: Category }

interface CategoryFormProps {
  state: CategoryFormState
  onClose: () => void
}

export function CategoryForm({ state, onClose }: CategoryFormProps) {
  const title =
    state.mode === 'create'
      ? `${TYPE_LABEL[state.type]} 카테고리 추가`
      : state.mode === 'edit'
        ? `${TYPE_LABEL[state.category.type]} 카테고리 수정`
        : '카테고리'
  return (
    <Modal open={state.mode !== 'closed'} title={title} onClose={onClose}>
      {state.mode !== 'closed' && <CategoryFormBody state={state} onClose={onClose} />}
    </Modal>
  )
}

/** Modal이 열릴 때마다 새로 마운트되므로 입력 상태는 열 때마다 초기화된다. */
function CategoryFormBody({ state, onClose }: { state: Exclude<CategoryFormState, { mode: 'closed' }>; onClose: () => void }) {
  const { categories, createCategory, updateCategory } = useLedgerData()
  const { showToast } = useToast()
  const editing = state.mode === 'edit' ? state.category : null
  const type = state.mode === 'edit' ? state.category.type : state.type

  const [name, setName] = useState(editing?.name ?? '')
  const [color, setColor] = useState(() => editing?.color ?? pickCategoryColor(categories, type))
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [error])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      if (editing) await updateCategory(editing.id, { name, color })
      else await createCategory({ name, type, color })
      showToast('저장했습니다', 'success')
      onClose()
    } catch (caught) {
      if (caught instanceof CategoryRuleError && (caught.code === 'invalid-name' || caught.code === 'duplicate-name')) {
        setError(caught.message)
      } else {
        showToast(caught instanceof Error ? caught.message : '저장하지 못했습니다.', 'error')
      }
      setSubmitting(false)
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="이름"
        required
        autoComplete="off"
        hint={`1~${MAX_CATEGORY_NAME_LENGTH}자, 같은 유형 안에서 겹치지 않게`}
        value={name}
        error={error}
        onChange={(e) => {
          setName(e.target.value)
          setError(undefined)
        }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">색상</legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_COLOR_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="relative flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name="color"
                value={option.value}
                checked={color === option.value}
                onChange={() => setColor(option.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ backgroundColor: option.value }} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          저장
        </Button>
      </div>
    </form>
  )
}
