# 테스트 가이드 (TESTING)

## 한눈에 보기

| 종류 | 도구 | 위치 | 실행 |
| --- | --- | --- | --- |
| 단위·컴포넌트·화면 흐름 | Vitest + React Testing Library (jsdom) | `src/**/*.test.ts(x)` | `npm test` |
| 커버리지(기준 강제) | `@vitest/coverage-v8` | — | `npm run test:coverage` |
| E2E (전체) | Playwright, Chromium(desktop·mobile) | `tests/e2e/*.spec.ts` | `npm run test:e2e:chromium` |
| E2E (교차 브라우저, `@core`만) | Firefox, WebKit(Safari 엔진), iPhone 14 에뮬레이션 | 같은 파일 중 `@core` 태그 | `npm run test:e2e:cross` |
| 접근성 | axe(WCAG 2.0/2.1 A·AA) + 동작 테스트 | `a11y.spec.ts`, `a11y-behavior.spec.ts` | `npm run test:a11y` |
| 전부 | typecheck → lint → 커버리지 → build → E2E | — | `npm run test:all` |

처음 한 번: `npx playwright install chromium firefox webkit`

단일 실행 예: `npx vitest run src/domain/money.test.ts -t "한도"`, `npx playwright test tests/e2e/months.spec.ts --project=desktop -g "연도 경계"`

## 커버리지 기준 (`vite.config.ts`에서 강제)

| 범위 | 기준 |
| --- | --- |
| 전체 | 문장·분기·함수·줄 85% 이상 |
| `src/domain/**`, `src/storage/**` | 문장·함수·줄 95%, 분기 90% 이상 |

기준 미달이면 `npm run test:coverage`가 실패한다. 수치를 채우려고 의미 없는 테스트를 만들지 않는다 — 남아 있는 미커버 분기는 대부분 "오류가 `Error`가 아닐 때의 대체 문구" 같은 방어 코드다.

## 요구 추적표

### 처음 요청한 12개 필수 E2E 시나리오

| # | 시나리오 | E2E | 단위·컴포넌트 |
| --- | --- | --- | --- |
| 1 | 첫 진입 시 기본 화면 | `smoke`, `storage`(최초 시드·재시드 없음), `layout`, `user-journeys` | `App.test`, `LedgerProvider.test` |
| 2 | 지출 추가 | `transactions`(지출 추가, 금액만 입력해 저장), `user-journeys` | `transactionsFlow.test`, `formModel.test` |
| 3 | 수입 추가 | `transactions`(수입 추가, 유형만 바꿔 저장), `user-journeys` | `transactionsFlow.test` |
| 4 | 입력값 검증 | `transactions`(금액 5종·빈 날짜·오류 수정 후 저장) | `formModel.test`, `money.test`, `validation.test`, `errorHandling.test`(저장소가 거부하는 경우) |
| 5 | 수정 | `transactions`, `summary`(수정 후 갱신), `user-journeys` | `transactionsFlow.test` |
| 6 | 삭제 | `transactions`(취소/확인/마지막 내역), `summary`, `user-journeys` | `transactionsFlow.test` |
| 7 | 월별 요약 갱신 | `summary`, `months`(홈 요약이 월 따라감), `user-journeys` | `summary.test`(domain·화면) |
| 8 | 카테고리별 집계 | `summary`(집계·3등분 비율·수입 제외), `charts`(도넛), `categories`(수정·삭제 반영) | `summary.test`, `percent.test` |
| 9 | 검색·필터 | `filters` | `filter.test`, `TransactionFilterBar.test` |
| 10 | 월 이동 | `months`(연도 경계·빈 달·월 공유) | `MonthNavigator.test`, `date.test`, `trend.test` |
| 11 | 새로고침 후 유지 | `transactions`, `storage`, `summary`, `backup`, `user-journeys` | `transactionsFlow.test` |
| 12 | 모바일 화면 | 모든 E2E를 `mobile` 프로젝트(Pixel 7)로도 실행, `a11y-behavior`(320~1024px 리플로우), `summary`·`charts`·`categories`·`backup`(가로 스크롤 없음) | — |

### PRD 성공 기준

| 기준 | 검증 |
| --- | --- |
| 등록·수정·삭제와 새로고침 후 유지 | 위 2~6, 11 |
| 월 요약·카테고리 집계가 입력과 일치 | `summary.spec`, `summary.test`, `percent.test`(합계 항상 1000‰) |
| 검색·필터·월 이동 | `filters.spec`, `months.spec` |
| 카테고리 관리, JSON 내보내기→가져오기 왕복 동일 | `categories.spec`, `backup.spec`(저장 데이터가 바이트 단위로 동일), `backup.test`, `categoriesFlow.test` |
| 다크 모드가 모든 화면에서 정상 | `layout.spec`(전환·유지), `a11y.spec`(모든 화면·대화상자를 다크에서 axe 검사) |
| Critical/High 이슈 0건 | `docs/ISSUES.md` |
| 타입·린트·단위·E2E 전부 통과 | `npm run test:all` |
| 모바일·데스크톱 레이아웃 | `a11y-behavior.spec`(320/360/390/768/1024px) |
| 거래 1건 등록까지 1분 이내(사용성) | 시간은 측정하지 않는다. 대신 **금액만 입력하면 저장된다**(`transactions.spec`)는 것으로 입력 단계가 최소임을 확인. 실제 소요 시간은 사용자 확인 필요 |
| 데이터 보호(손상·저장 실패) | `storage.spec`, `user-journeys`(손상→복구), `errorHandling.test`, `localStorageRepository.test` |

## 단계 11에서 추가된 검증

| 영역 | 테스트 |
| --- | --- |
| 저장소 읽기 캐시·불변성·원문/사용량 | `repositoryCache.test.ts`(파싱 횟수, 다른 탭 변경 감지, 쓰기 실패 시 캐시 폐기, 12,000건 동작) |
| 긴 목록 점진 렌더링 | `pagedList.test.tsx`(250건: 100→200→250, 포커스 이동, 필터·월 변경 시 초기화), `resilience.spec.ts` |
| 용량 요약·배너·사용량 표시 | `storageUsage.test.ts`(80%/95% 경계), `storageStatus.test.tsx`, `resilience.spec.ts`(실제로 가득 찬 저장소에서 오류·입력 보존·재시도) |
| 손상 데이터 복구 | `LedgerProvider.test.tsx`, `backupFile.test.ts`, `resilience.spec.ts`(원본 저장·백업 복구·잘못된 파일·새로 시작), `user-journeys.spec.ts` |
| 저장소 사용 불가(세션 모드) | `LedgerProvider.test.tsx`, `errorHandling.test.tsx`, `memoryStorage.test.ts`, `resilience.spec.ts` |
| 오류 경계 | `ErrorBoundary.test.tsx` |
| 다중 탭 | `multiTab.test.tsx`, `resilience.spec.ts`(두 탭 동시 사용, 삭제 반영) |
| 번들·프로덕션 빌드 | `npm run check:bundle`, `npm run test:e2e:preview` |

엔진별 한도: Safari(WebKit)는 한글 데이터에서 localStorage 한도가 절반이라(ISS-018) 용량 시나리오는 `quotaCharsFor(browserName)`·`monthsForUsage()`로 데이터 양을 엔진에 맞춰 정한다.

## 작성 규칙

- **날짜**: "오늘"에 의존하지 않는다. E2E는 `fixToday(page)`(goto **전에**), jsdom은 `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)`. 단위 테스트의 날짜는 `new Date(y, m, d)`(로컬 생성자)로 만들어 TZ와 무관해야 한다. 확인: `TZ=America/Los_Angeles npx vitest run`.
- **데이터 준비**: 많은 데이터가 필요하면 E2E에서 `seedTransactions(page, [...])`(localStorage 직접 주입 후 reload). 화면 동작 자체를 검증할 때는 UI로 입력한다.
- **대기**: `waitForTimeout`/임의 `sleep` 금지(0건 유지). 항상 상태를 기다리는 `expect(...).toBeVisible()` 등 자동 재시도 단언을 쓴다. 측정(evaluate)은 화면이 그려진 것을 확인한 **뒤에** 한다.
- **순서 의존 금지**: `fixToday`는 시간을 흘려보내지 않아 모든 `createdAt`이 같다. 같은 날짜 내역의 순서에 기대는 단언을 쓰지 않는다. 테스트끼리 데이터를 공유하지 않는다(브라우저 컨텍스트가 매번 새로 만들어짐, jsdom은 `setup.ts`가 localStorage를 비움).
- **저장소 실패 흉내**: `vi.spyOn(Storage.prototype, 'setItem'/'getItem')`으로 실제 localStorage 오류를 만든다(`errorHandling.test.tsx` 참고). 다른 탭에서 바뀐 데이터는 `createLocalStorageRepository()`로 직접 변경해 흉내 낸다.
- **E2E 헬퍼**: `tests/e2e/helpers.ts`(`fixToday`, `openHome`, `openList`, `fillForm`, `addTransaction`, `seedTransactions`, `openFilterPanel`, `filterBar`). import는 `./helpers.ts`처럼 확장자를 붙인다.
- **태그**: 교차 브라우저에서도 돌릴 핵심 흐름에는 `test('...', { tag: '@core' }, ...)`를 붙인다. 새 기능의 대표 시나리오 한두 개는 `@core`로 지정한다.
- **무거운 테스트의 시간 제한**: 큰 데이터를 렌더링하거나 여러 단계를 잇는 테스트는 전체 병렬·커버리지 계측·느린 엔진(WebKit)에서 기본 제한(Vitest 5초, Playwright 30초)이 빠듯하다. 단독 실행에서는 통과하고 부하에서만 실패하면 `describe(..., { timeout })`/`test.setTimeout`/`test.slow()`로 해당 테스트의 제한만 늘린다(`pagedList.test.tsx`, `user-journeys.spec.ts` 참고). 재시도로 가리지 않는다.
- **정당한 건너뜀만**: 뷰포트 전용 테스트는 `test.skip(isMobile, '이유')`로 명시한다. 실패하는 테스트를 건너뛰어 통과시키지 않는다.
- **`any`**: 앱 코드에서는 금지. 스키마 검증 테스트처럼 일부러 데이터를 망가뜨리는 경우에만 테스트 코드에서 허용한다.

## 효과 검증(변이 점검)

테스트가 통과하는 것만으로는 "버그를 잡는다"를 보장하지 못하므로, 핵심 로직에 **일부러 버그를 넣고 테스트가 실패하는지** 확인했다(적용 → 실행 → 실패 확인 → 되돌리기). 단계 10 시점 결과: 단위 20건 + 화면 12건 = **32건 전부 검출**.

| 구분 | 변이 예 | 검출 |
| --- | --- | --- |
| 비율 | 남는 몫 분배 개수 오류, 동률 처리 제거 | 단위 |
| 날짜 | 400년 윤년 규칙, 월 이동 off-by-one, 11월을 31일로 취급, 등록 폼 기본 날짜 | 단위 |
| 금액 | 한도 경계(`<=`→`<`), 0원 허용 | 단위 |
| 집계 | 월 경계 포함 오류, 카테고리 집계에 수입 포함, 잔액 부호 | 단위 |
| 필터 | 유형 조건 반전, 여러 단어 AND→OR | 단위 |
| 저장소 | 보호된 카테고리 삭제 허용, 다른 유형으로 재배정, 태그 정규화 생략, 정렬 반전 | 단위 |
| 스키마·백업 | 유형 일치 검사 제거, 가져오기 검증 생략 | 단위 |
| 화면 | 최근 내역 개수, 부호 표기 반전, 월 필터 누락, 삭제 후 미갱신, 다음 달 2칸 이동, 초기화 무동작, 재배정 미전달, 확인 단계 생략, 문서 제목 미갱신, 홈 요약 월 고정, 차트 막대 위치·값 오류, 유형 변경 시 카테고리 미초기화 | E2E |

**처음에는 2+2건이 살아남아** 테스트를 보강했다.
- 11월 일수 / 비율 동률 → 월별 일수 전수 검사, 구분 가능한 동률 케이스(`[5, 11]`)로 교체(기존 동률 케이스는 변이를 구분하지 못하는 약한 테스트였다).
- 차트 막대 위치 / 유형 변경 시 카테고리 초기화 → 막대 바닥 기준선 정렬 검증, "카테고리를 직접 고르지 않고 저장" 시나리오 추가(직접 고르는 기존 테스트가 버그를 가리고 있었다).

새 핵심 로직을 추가할 때는 같은 방식으로 변이 몇 건을 시험해 보는 것을 권장한다.

## 안정성(flaky) 점검 방법

- `retries: 0` 유지(재시도로 불안정을 가리지 않는다).
- 전체 E2E를 반복 실행하고 워커 수를 바꿔(기본 8, 2, 1) 병렬·순서 의존이 없는지 확인한다.
- 간헐 실패가 나오면 원인을 분석해 테스트나 앱을 고친다(예: 측정 전 대기 누락, `localhost`의 IPv6/IPv4 불일치).

**단계 10 결과**: 수정 전에는 기본 워커로 반복할 때 0~6건씩 간헐 실패(ISS-017). 원인을 고친 뒤 기본 워커 전체 E2E 연속 7회, 워커 2개 1회, 워커 1개 1회가 모두 418건 통과(8건은 뷰포트 전용 건너뜀). 단위 테스트 422건은 시간대 3종(`America/Los_Angeles`, `Pacific/Kiritimati`, `UTC`)에서 모두 통과.

**주의**: 워커 수를 코어 수 이상으로 올리지 않는다. 코어 수만큼(기본의 2배) 올리고 Firefox/WebKit 위주로 돌리면 CPU가 고갈되어 `page.goto`까지 시간 초과가 난다(앱·테스트 결함이 아닌 과부하). 일시적으로 사라지는 UI(알림 등)를 단언할 때는 클릭 직후 바로 확인하고, 느린 작업(파일 읽기 등) **앞**에 둔다. 개발 서버 의존성은 `optimizeDeps.include`로 미리 번들되어 있어야 한다(새 런타임 의존성을 추가하면 이 목록에도 넣는다).

## 교차 브라우저

- `firefox`, `webkit`(데스크톱 Safari 엔진), `mobile-safari`(iPhone 14)는 `@core` 태그 테스트만 실행한다(전체 실행은 시간이 3배 이상 걸리므로 핵심 흐름만).
- 개발 서버는 `127.0.0.1`로 고정한다. `localhost`가 IPv6(`::1`)로만 열리는 환경에서 Firefox가 `NS_ERROR_CONNECTION_REFUSED`로 간헐 실패했다(`ISS-015`).
- Edge는 Chromium 기반이라 별도 프로젝트를 두지 않았다.
