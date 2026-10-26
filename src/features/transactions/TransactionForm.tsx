import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLedgerData } from '../../app/ledgerDataContext'
import { useSelectedMonth } from '../../app/selectedMonthContext'
import { Button } from '../../components/Button'
import { Input, Select } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { asDateString, defaultEntryDate, formatKoreanMonth, monthOf, todayString } from '../../domain/date'
import { formatAmountDigits, parseAmountInput } from '../../domain/money'
import type { Transaction, TransactionType } from '../../domain/types'
import { ValidationError } from '../../storage/errors'
import {
  createEmptyFormValues,
  firstCategoryId,
  formValuesFromTransaction,
  toTransactionInput,
  type TransactionFormErrors,
  type TransactionFormValues,
} from './formModel'

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: '지출' },
  { value: 'income', label: '수입' },
]

const FORM_FIELDS: (keyof TransactionFormValues)[] = [
  'type',
  'amount',
  'date',
  'categoryId',
  'paymentMethodId',
  'memo',
  'tags',
]

interface TransactionFormProps {
  open: boolean
  /** 지정하면 수정 모드 */
  transaction?: Transaction
  onClose: () => void
  /** 수정 모드에서 삭제 버튼을 눌렀을 때. 확인 절차는 호출자가 담당한다. */
  onRequestDelete: () => void
}

export function TransactionForm({ open, transaction, onClose, onRequestDelete }: TransactionFormProps) {
  return (
    <Modal open={open} title={transaction ? '내역 수정' : '내역 추가'} onClose={onClose}>
      <TransactionFormBody transaction={transaction} onClose={onClose} onRequestDelete={onRequestDelete} />
    </Modal>
  )
}

type BodyProps = Omit<TransactionFormProps, 'open'>

/** Modal이 열릴 때마다 새로 마운트되므로 입력 상태는 열 때마다 초기화된다. */
function TransactionFormBody({ transaction, onClose, onRequestDelete }: BodyProps) {
  const { categories, paymentMethods, createTransaction, updateTransaction } = useLedgerData()
  const { showToast } = useToast()
  const { month } = useSelectedMonth()

  const [values, setValues] = useState<TransactionFormValues>(() =>
    transaction
      ? formValuesFromTransaction(transaction)
      : createEmptyFormValues(categories, paymentMethods, defaultEntryDate(month, todayString())),
  )
  const [errors, setErrors] = useState<TransactionFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // 오류가 생기면 첫 번째 잘못된 입력으로 포커스를 옮긴다.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  function setField<K extends keyof TransactionFormValues>(field: K, value: TransactionFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function changeType(type: TransactionType) {
    setValues((prev) => ({ ...prev, type, categoryId: firstCategoryId(categories, type) }))
    setErrors((prev) => ({ ...prev, type: undefined, categoryId: undefined }))
  }

  /** 입력이 끝나면(포커스를 잃으면) 쉼표를 붙여 읽기 쉽게 정리한다. 입력 중에는 건드리지 않는다. */
  function formatAmountOnBlur() {
    const parsed = parseAmountInput(values.amount)
    if (parsed.ok) setValues((prev) => ({ ...prev, amount: formatAmountDigits(parsed.value) }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const result = toTransactionInput(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setSubmitting(true)
    try {
      if (transaction) await updateTransaction(transaction.id, result.input)
      else await createTransaction(result.input)
      // 보고 있는 달이 아닌 날짜로 저장하면 목록에서 바로 보이지 않으므로 어느 달에 기록됐는지 알려 준다.
      const savedMonth = monthOf(asDateString(result.input.date))
      showToast(
        savedMonth === month ? '저장했습니다' : `저장했습니다 (${formatKoreanMonth(savedMonth)}에 기록됨)`,
        'success',
      )
      onClose()
    } catch (error) {
      if (error instanceof ValidationError) {
        const fieldErrors: TransactionFormErrors = {}
        for (const field of FORM_FIELDS) {
          if (error.fields[field]) fieldErrors[field] = error.fields[field]
        }
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
        else showToast(error.message, 'error')
      } else {
        showToast(error instanceof Error ? error.message : '저장하지 못했습니다.', 'error')
      }
      setSubmitting(false)
    }
  }

  const categoryOptions = categories.filter((category) => category.type === values.type)

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">유형</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={values.type === option.value}
                onChange={() => changeType(option.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        label="금액"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        hint="원 단위 정수"
        value={values.amount}
        error={errors.amount}
        onChange={(e) => setField('amount', e.target.value)}
        onBlur={formatAmountOnBlur}
      />
      <Input
        label="날짜"
        type="date"
        value={values.date}
        error={errors.date}
        onChange={(e) => setField('date', e.target.value)}
      />
      <Select
        label="카테고리"
        value={values.categoryId}
        error={errors.categoryId}
        onChange={(e) => setField('categoryId', e.target.value)}
      >
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        label="결제수단"
        value={values.paymentMethodId}
        error={errors.paymentMethodId}
        onChange={(e) => setField('paymentMethodId', e.target.value)}
      >
        {paymentMethods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.name}
          </option>
        ))}
      </Select>
      <Input
        label="메모"
        hint="선택 입력"
        autoComplete="off"
        value={values.memo}
        error={errors.memo}
        onChange={(e) => setField('memo', e.target.value)}
      />
      <Input
        label="태그"
        hint="선택 입력 · 쉼표나 공백으로 구분"
        autoComplete="off"
        value={values.tags}
        error={errors.tags}
        onChange={(e) => setField('tags', e.target.value)}
      />

      <div className="flex items-center justify-between gap-2">
        {transaction ? (
          <Button variant="danger" onClick={onRequestDelete} disabled={submitting}>
            삭제
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={submitting}>
            저장
          </Button>
        </div>
      </div>
    </form>
  )
}
