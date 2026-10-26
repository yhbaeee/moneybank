/** 저장소 계층이 던지는 오류의 공통 부모. UI는 instanceof로 구분한다. */
export class LedgerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

/** 브라우저 저장소에 접근할 수 없다(차단, 프라이빗 모드 등). */
export class StorageUnavailableError extends LedgerError {}

/** 저장 용량을 초과했다. */
export class StorageQuotaError extends LedgerError {}

/** 저장된 데이터를 읽을 수 없다. 원본은 덮어쓰지 않고 보존한다. */
export class StorageCorruptedError extends LedgerError {}

/** 스키마 검증에 실패한 데이터(저장 문서 또는 가져온 백업). */
export class InvalidDataError extends LedgerError {
  readonly details: string[]

  constructor(message: string, details: string[] = [], options?: ErrorOptions) {
    super(message, options)
    this.details = details
  }
}

export class NotFoundError extends LedgerError {}

/** 입력값 검증 실패. fields에 필드별 메시지가 담긴다. */
export class ValidationError extends LedgerError {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>) {
    super('입력값이 올바르지 않습니다.')
    this.fields = fields
  }
}

export type CategoryRuleCode =
  | 'invalid-name'
  | 'duplicate-name'
  | 'protected'
  | 'in-use'
  | 'invalid-reassign'

/** 카테고리 규칙 위반(이름 중복, 보호된 카테고리 삭제, 사용 중 삭제 등). */
export class CategoryRuleError extends LedgerError {
  readonly code: CategoryRuleCode

  constructor(code: CategoryRuleCode, message: string) {
    super(message)
    this.code = code
  }
}
