import type {
  Category,
  CategoryInput,
  CategoryPatch,
  LedgerData,
  MonthString,
  PaymentMethod,
  Transaction,
  TransactionInput,
} from '../domain/types'

/**
 * 저장소 인터페이스. 모든 메서드를 비동기로 두어 localStorage 외의 저장소(SQLite, Supabase 등)로
 * 교체해도 호출부가 바뀌지 않게 한다. UI는 구현체가 아니라 이 인터페이스에만 의존한다.
 */

export interface TransactionQuery {
  /** 지정하면 해당 월의 거래만 반환한다. */
  month?: MonthString
}

export interface TransactionRepository {
  /** 날짜 내림차순, 같은 날짜는 최근 생성 순으로 반환한다. */
  list(query?: TransactionQuery): Promise<Transaction[]>
  get(id: string): Promise<Transaction | undefined>
  /** @throws ValidationError 입력값이 올바르지 않을 때 */
  create(input: TransactionInput): Promise<Transaction>
  /** @throws NotFoundError, ValidationError */
  update(id: string, input: TransactionInput): Promise<Transaction>
  /** @throws NotFoundError */
  remove(id: string): Promise<void>
}

export interface CategoryRepository {
  list(): Promise<Category[]>
  /** @throws CategoryRuleError 이름이 비었거나 같은 유형에 중복일 때 */
  create(input: CategoryInput): Promise<Category>
  /** @throws NotFoundError, CategoryRuleError */
  update(id: string, patch: CategoryPatch): Promise<Category>
  /**
   * 보호된 카테고리는 삭제할 수 없다. 사용 중인 카테고리는 같은 유형의 reassignToId로
   * 거래를 옮겨야만 삭제할 수 있다.
   * @throws NotFoundError, CategoryRuleError
   */
  remove(id: string, reassignToId?: string): Promise<void>
}

export interface PaymentMethodRepository {
  list(): Promise<PaymentMethod[]>
}

export interface LedgerRepository {
  readonly transactions: TransactionRepository
  readonly categories: CategoryRepository
  readonly paymentMethods: PaymentMethodRepository

  /** 최초 실행이면 기본 데이터를 저장하고, 이미 있으면 검증만 한다. 반복 호출해도 안전하다. */
  init(): Promise<void>
  /** 저장된 데이터 전체(백업 내보내기용). */
  exportAll(): Promise<LedgerData>
  /** 검증 후 전체를 교체한다. 검증에 실패하면 기존 데이터를 변경하지 않는다. */
  importAll(data: LedgerData): Promise<void>
  /** 모든 데이터를 지우고 기본 데이터로 되돌린다. */
  reset(): Promise<void>
}
