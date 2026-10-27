# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 상태

- 단계 10(테스트 보강) 구현 완료(승인 대기). 남은 것: 단계 11(성능·오류 처리·최종 정리). 구현은 `docs/DEVELOPMENT_PLAN.md`의 단계 순서대로 진행한다(단계 8이 둘로 나뉘어 총 11단계).
- 기준 문서: `docs/PRD.md`(무엇을 만들 것인가, v1.0 승인), `docs/DEVELOPMENT_PLAN.md`(어떻게/순서), `docs/ISSUES.md`(발견된 문제 기록), `docs/TESTING.md`(테스트 가이드·요구 추적표·변이 점검).
- 구현 후에는 이 파일을 실제 상태에 맞게 갱신한다.

## 프로젝트 목적

한국어·원화(KRW) 고정의 개인 가계부 웹앱. 지출/수입 기록, 월별 요약, 카테고리 집계·차트, 검색/필터, JSON 백업. 지금은 1인 데이터만 다루지만 **가족 공동 사용·서버 저장으로 확장 가능하게** 설계한다(거래의 `ownerId`, `Member`, `schemaVersion`).

## 기술 스택

React + TypeScript(strict) + Vite, Tailwind CSS(다크 모드는 class 전략), React Router, 상태관리는 React Context + 커스텀 훅(외부 상태 라이브러리 없음), Vitest + React Testing Library, Playwright(E2E, Chromium 전체 + Firefox/WebKit 핵심), 저장은 localStorage(저장소 인터페이스 뒤에 숨김), 차트는 직접 SVG.

## 명령어

```
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드
npm run typecheck        # tsc
npm run lint             # oxlint (Vite 템플릿 기본, ESLint 아님)
npm run test             # Vitest (단일 파일: npx vitest run src/domain/money.test.ts, 이름: -t "패턴")
npm run test:coverage    # 커버리지 + 기준 강제(전체 85%, domain·storage 95/분기 90)
npm run test:e2e         # Playwright 전체 프로젝트(dev 서버 자동 기동, 127.0.0.1:5173) (단일: npx playwright test tests/e2e/x.spec.ts --project=desktop, 디버그: --ui)
npm run test:e2e:chromium  # desktop + mobile(Pixel 7), 전체 시나리오
npm run test:e2e:cross     # firefox + webkit + mobile-safari, @core 태그 시나리오만
npm run test:a11y        # axe + 접근성 동작 테스트
npm run test:all         # typecheck → lint → coverage → build → E2E
```

처음 한 번 `npx playwright install chromium firefox webkit`. 테스트 작성 규칙·요구 추적표·변이 점검 방법은 `docs/TESTING.md`.

## 아키텍처

```
src/app/        라우팅, 프로바이더, 레이아웃
src/components/ 공통 UI
src/features/   transactions | summary | categories | settings (화면 단위 기능)
src/domain/     타입, 순수 함수(금액·날짜·집계·필터)  ← React/저장소에 의존 금지
src/storage/    Repository 인터페이스 + localStorage 구현 + 마이그레이션 + 스키마 검증 + 백업
tests/e2e/      Playwright
```

핵심 흐름: `features(UI)` → Context/훅 → `Repository 인터페이스` → localStorage 구현. 집계·필터·비율 계산은 `domain`의 순수 함수로만 하고 UI에서 직접 계산하지 않는다. 저장소 구현체를 교체해도(SQLite/Supabase) UI와 domain은 바뀌지 않아야 한다.

## 카테고리 관리·백업 (단계 9)

- 카테고리 규칙(이름 1~20자·같은 유형 내 중복 금지, 유형별 '기타' 삭제 불가, 사용 중 삭제는 같은 유형으로 재배정 후에만)은 **저장소 계층**이 강제하고, 화면은 `CategoryRuleError.message`를 필드 오류로 보여 준다. 화면은 `useLedgerData()`의 `createCategory/updateCategory/removeCategory`만 쓴다.
- 색은 9색 팔레트(`CATEGORY_COLOR_OPTIONS`, 이름 포함)에서 선택하고 새 카테고리는 `pickCategoryColor`로 같은 유형에서 안 쓴 색을 먼저 배정한다. 9개를 넘으면 색이 반복된다(알려진 한계). 순서 변경은 MVP 제외.
- 삭제 후 포커스가 사라질 수 있는 화면(행이 사라지는 경우)은 `useFocusHeadingIfLost(isOpen)`로 h1에 복구한다.
- 백업: 내보내기는 `createBackup`+`serializeBackup`+`downloadTextFile`(파일명 `가계부-백업-YYYY-MM-DD.json`), 가져오기는 `parseBackup`으로 **검증 → 확인 대화상자 → 전체 교체**(병합 없음). 검증 실패 시 기존 데이터는 절대 바꾸지 않고 문제 목록(최대 5개)을 `role="alert"`로 보여 준다. 파일은 10MB 상한. 테마는 기기 설정이라 백업·초기화 대상이 아니다.
- jsdom 테스트에서는 `vi.mock('../../app/download')`로 다운로드를 막는다. E2E는 `page.waitForEvent('download')`와 `locator('input[type="file"]').setInputFiles(...)`(입력은 숨김 상태)를 쓴다.
- 새 화면·대화상자는 `a11y.spec.ts`에 케이스를 추가한다(이 단계에서 설정·카테고리 화면과 모든 대화상자를 추가함).

## 테스트 (단계 10)

- 상세는 `docs/TESTING.md`. 핵심만: **커버리지 기준은 `vite.config.ts`가 강제**(전체 85%, `domain`·`storage` 95/분기 90). 새 순수 로직에는 경계값 테스트를 함께 추가한다.
- E2E의 대표 흐름에는 `{ tag: '@core' }`를 붙인다(Firefox·WebKit·iPhone 에뮬레이션에서도 실행). 전체 시나리오는 Chromium(desktop·mobile)만.
- `playwright.config.ts`의 서버 주소는 `127.0.0.1`로 고정(IPv6 `localhost` 문제로 Firefox가 간헐 실패했음). `retries`는 0 — 간헐 실패는 재시도로 가리지 말고 원인을 고친다. 워커 수는 기본값(코어의 절반)을 넘기지 않는다(과부하 시 Firefox/WebKit 시간 초과). 새 런타임 의존성을 추가하면 `vite.config.ts`의 `optimizeDeps.include`에도 넣는다(실행 중 재번들로 페이지가 새로고침되는 것을 막음).
- 알림(토스트)은 성공 6초·오류 10초 뒤 사라진다. E2E에서 알림을 단언할 때는 클릭 직후, 느린 작업(파일 읽기 등)보다 먼저 확인한다.
- 테스트가 통과하는 것과 버그를 잡는 것은 다르다. 핵심 로직을 바꾼 뒤에는 일부러 버그를 넣어 테스트가 실패하는지 확인한다(`docs/TESTING.md`의 변이 점검). 선택지를 직접 고르는 테스트는 "기본값으로 저장" 시나리오를 함께 둔다(버그를 가린 전례: ISS-016).
- 저장소 실패·다른 탭에서 바뀐 데이터는 `Storage.prototype` 가로채기/별도 저장소 인스턴스로 흉내 낸다(`src/app/errorHandling.test.tsx`).
- `migrateToLatest`는 `{ currentVersion, migrations }`를 주입할 수 있다. 스키마 버전을 올릴 때 이 구조로 마이그레이션 체인을 테스트한다.

## 접근성 (단계 8)

- 목표는 WCAG 2.1 AA. `tests/e2e/a11y.spec.ts`는 모든 화면·상태를 라이트/다크 × desktop/mobile로 axe(`wcag2a`,`wcag2aa`,`wcag21a`,`wcag21aa`) 검사해 위반 0건을 요구한다. **새 화면·모달·상태를 추가하면 이 파일에 검사 케이스를 추가한다.** axe가 못 잡는 동작(키보드·포커스·리플로우·대상 크기)은 `a11y-behavior.spec.ts`. 실행: `npx playwright test tests/e2e/a11y.spec.ts tests/e2e/a11y-behavior.spec.ts`.
- 화면(라우트)을 추가하면 `src/app/routeMeta.ts`의 `PAGE_TITLES`에 제목을 등록한다(문서 제목 `"내역 · 가계부"`). 화면 이동 시 `Layout`이 `main h1`로 포커스를 옮기므로 **모든 화면은 `<main>` 안에 h1이 정확히 하나** 있어야 한다. 첫 로드에서는 포커스를 옮기지 않는다(StrictMode 이중 실행에 안전하도록 이전 경로 ref로 비교).
- "본문으로 건너뛰기" 링크와 `main#main-content`(tabIndex -1)는 `Layout`이 담당. 폼을 닫은 뒤 포커스가 body로 떨어지면(예: 삭제) `TransactionEditorProvider`가 h1로 복구한다.
- 폼: 필수 항목은 `required`(+선택 항목은 힌트에 "선택 입력"), 오류와 힌트는 모두 `aria-describedby`로 연결(오류 먼저), 오류 토스트는 `role="alert"`.
- 조작 대상(링크·summary 포함)은 최소 24×24px(권장 `min-h-11`). 가로로 넘칠 수 있는 영역은 `role="region"` + `tabIndex={0}` + 라벨. 최소 지원 폭 320px(가로 스크롤 금지). `prefers-reduced-motion`은 `index.css`에서 전역 처리.
- 아직 점검하지 못한 것: 실제 스크린리더, 200% 확대. 정리는 `docs/ISSUES.md` 하단.

## 차트 (단계 7)

- 차트는 **직접 SVG**로 구현한다(라이브러리 없음). `DonutChart`(카테고리 지출 비중), `TrendChart`(최근 6개월 수입·지출 묶음 막대). 색상은 Tailwind `fill-income`/`fill-expense`/`stroke-line`/`fill-muted` 등 토큰 클래스를 쓰고, 카테고리 색만 데이터의 `color`를 인라인으로 쓴다.
- 계산은 순수 함수: 추이 집계 `domain/trend.ts`(`monthlyTrend`, 선택 월이 마지막 달), 눈금·축약 표기·도넛 호 길이 `domain/chart.ts`(`niceScale`, `formatCompactWon`, `donutSegments`). 도넛 호 길이는 합이 1000‰로 보정된 비율에서 계산한다.
- 차트는 이미지로만 정보를 주면 안 된다: `role="img"` + `aria-label`, 도넛 옆 카테고리 목록, 추이의 "표로 보기"(`<details>` 표). 표의 월 표기는 `2026.10`(화면 제목 "2026년 10월"과 `getByText`가 겹치지 않게).
- E2E는 `svg [data-month][data-series]`, `circle[data-category]`의 속성과 bounding box(막대 높이 비율)로 값을 검증한다. 차트 폭은 `max-w-lg`로 제한(넓은 화면에서 글자·막대가 과대 확대되지 않게).

## 월 이동·검색·필터 (단계 6)

- 선택 월(`useSelectedMonth`)과 내역 화면의 필터 상태는 **메모리에만** 있다(새로고침하면 이번 달·필터 없음). 내역 목록은 선택 월 기준이며 필터는 월을 이동해도 유지된다. URL 쿼리로 옮기는 것은 향후 과제.
- 필터/검색 로직은 `domain/filter.ts`(순수 함수). 필터끼리 AND, 검색은 공백으로 나눈 단어가 모두 (메모·태그·카테고리명)에 부분 일치(대소문자 무시, NFC 정규화, 앞의 `#` 무시). 태그 필터는 대소문자 무시 완전 일치. 유형을 바꾸면 맞지 않는 카테고리 선택은 해제한다.
- 월 이동은 `components/MonthNavigator`(범위 1900~2999년, `safeAddMonths`). 홈과 내역이 같은 선택 월을 공유한다.
- 등록 폼 날짜 기본값은 `defaultEntryDate`(이번 달 보는 중이면 오늘, 아니면 보는 달 1일). 다른 달로 저장하면 토스트에 기록된 달을 알려 준다.
- 모바일 필터는 "필터" 버튼으로 접힘(`aria-expanded`), 데스크톱은 항상 펼침. 같은 label(`카테고리`/`결제수단`/`태그`)이 등록 폼에도 있으므로 E2E는 `filterBar(page)`(`region` "내역 필터")나 dialog로 범위를 좁힌다. 모바일에서 필터 입력 전에는 `openFilterPanel(page)`.
- 목록이 월 기준이라 "오늘"에 의존하는 모든 테스트(jsdom·E2E)는 날짜를 고정해야 한다. 많은 데이터가 필요하면 E2E에서 `seedTransactions(page, [...])`(localStorage 직접 주입 후 reload)를 쓴다.
- `setFixedTime`은 시간을 흘려보내지 않으므로 모든 `createdAt`이 같아진다. 같은 날짜 내역의 순서(최근 생성순)에 의존하는 단언은 쓰지 않는다.

## 요약·집계 (단계 5)

- 집계는 `domain/summary.ts`(`summarizeMonth`, `aggregateExpensesByCategory`, `transactionsInMonth`)의 순수 함수만 쓴다. 월 경계는 `monthOf(date)` 문자열 비교로만 판정한다.
- 비율은 **‰(천분율) 정수**로 다룬다. `domain/percent.ts`의 `allocatePermille`(최대잔여법, BigInt, 동률은 금액 큰 쪽→입력 순서 앞쪽)이 합계를 항상 1000으로 맞추고, 표시는 `formatPermille`(33.4%). 비율을 `Math.round`로 직접 계산하지 않는다.
- 선택 월은 `SelectedMonthProvider`/`useSelectedMonth()`(기본: 로컬 기준 이번 달). 월 이동 UI는 6단계에서 추가. 홈은 선택 월 기준으로 요약·집계·최근 5건을 보여 준다.
- "오늘"에 의존하는 E2E는 `tests/e2e/helpers.ts`의 `fixToday(page)`(Playwright clock, goto 전에 호출)로 2026-10-27에 고정한다. 단위 테스트는 `vi.useFakeTimers({ toFake: ['Date'] })`.
- E2E 헬퍼 import는 `./helpers.ts`처럼 확장자를 붙인다(tsconfig nodenext).
- 토스트는 최신 1개만 표시한다.

## 거래 UI 흐름 (단계 4)

- Provider 중첩 순서: Theme → Toast → `LedgerProvider`(저장소 init) → `LedgerDataProvider`(메모리 스냅샷 + 변경 후 재조회) → `TransactionEditorProvider`(등록/수정 폼과 삭제 확인 모달 한 곳에서 관리) → Router. 화면은 `useLedgerData()`로 읽고 `useTransactionEditor().openCreate/openEdit`으로 폼을 연다.
- 폼 변환·검증은 `features/transactions/formModel.ts`(순수 함수): 폼 값은 전부 문자열 → `toTransactionInput` → `TransactionInput`. 금액 입력은 입력 중에는 그대로 두고 blur 때 쉼표 정리.
- 수입/지출은 `formatSignedWon`으로 `+`/`-` 부호를 병행 표기한다(색상만 의존 금지).
- "내역 추가" 진입점: 데스크톱은 페이지 헤더 버튼, 모바일은 FAB(`aria-label="내역 추가"`). 두 개가 동시에 보이면 안 된다(E2E의 `getByRole('button', {name:'내역 추가'})`가 strict mode로 깨진다).
- `Button`은 `inline-flex`를 기본으로 가지므로 `hidden`/`md:inline-flex`를 같은 요소에 붙이지 말고 감싸는 `div`에서 숨긴다.
- E2E 헬퍼는 `tests/e2e/transactions.spec.ts`의 `addTransaction`/`fillForm`을 참고. 날짜는 항상 명시(오늘 날짜에 의존하지 않는다).

## 데이터·저장소 (단계 3)

- 타입은 `domain/types.ts`. `DateString`/`MonthString`은 브랜드 타입이라 `date.ts`의 `asDateString`/`toDateString` 등으로만 만든다. `TransactionInput.date`는 검증 전이라 일반 문자열.
- 저장 문서 전체(`LedgerData`)를 localStorage 키 `ledger.data` 하나에 저장한다(테마는 별도 키 `ledger.theme`, 기기 설정이라 백업 대상 아님). 백업 파일 = `LedgerData` + `exportedAt`.
- 저장소 API는 전부 `Promise`. UI는 `useLedger()`(LedgerProvider)로만 접근한다. 저장소 교체 지점은 `src/storage/index.ts` 한 줄.
- 데이터 검증은 `storage/schema.ts`(참조 무결성 포함), 스키마 변경 시 `CURRENT_SCHEMA_VERSION`을 올리고 `migrations.ts`에 이전 버전 변환을 추가한다.
- 저장소 오류는 `storage/errors.ts`의 클래스(`StorageCorruptedError` 등)로 구분한다. 손상된 데이터는 **절대 덮어쓰지 않는다**.
- 카테고리 규칙(중복 이름, 보호된 '기타', 사용 중 삭제 시 재배정)은 저장소 계층에서 강제한다. 거래 입력 검증은 `domain/validation.ts`(폼과 저장소가 공유).
- 날짜 단위 테스트는 로컬 생성자(`new Date(y, m, d)`)로 만들어 TZ와 무관해야 한다. 확인: `TZ=America/Los_Angeles npx vitest run`.

## UI 기반 (단계 2)

- 색상은 `src/index.css`의 의미 토큰(`bg-surface`, `text-muted`, `border-line`, `bg-primary`, `text-income`, `text-expense`, `bg-danger` 등)만 쓴다. 라이트/다크는 `:root` / `.dark` 변수로 전환되므로 `dark:` 변형이나 하드코딩 색을 쓰지 않는다. 수입/지출은 색만으로 구분하지 말고 `+`/`−` 또는 라벨을 병행한다.
- 컨텍스트는 `themeContext.ts` / `toastContext.ts`(훅·타입), Provider는 별도 `*.tsx`로 분리한다(Fast Refresh 린트 규칙).
- 모달은 네이티브 `<dialog>`(`components/Modal.tsx`)를 쓴다. jsdom은 `showModal`을 지원하지 않아 `src/test/setup.ts`에 대체 구현이 있다.
- `NavLink`는 자체 `aria-current`가 우선하므로, 하위 경로까지 활성 표시해야 하는 내비게이션은 `Link` + 직접 계산한 `aria-current`를 쓴다.
- `/dev/components`는 개발 서버 전용 쇼케이스(프로덕션 빌드에서 라우트 제외). Playwright 스크린샷은 `test-results/screenshots/`에 저장된다.
- 라우트: `/`, `/transactions`, `/categories`(설정 하위), `/settings`. 내역 등록/수정 폼은 모달로 4단계에서 구현.

## 필수 규칙

- 모든 기능 구현 전에 관련 **타입과 인터페이스를 먼저 정의**한다.
- UI 로직과 데이터 저장 로직을 분리한다. 컴포넌트가 `localStorage`를 직접 호출하지 않는다.
- 하드코딩된 금액·카테고리·날짜는 최소화한다(기본값은 `domain/defaults.ts`).
- **금액**: 정수 원 단위만 사용. 1 이상의 정수, 소수·음수·0 불가. 합계·비율은 정수 연산, 비율은 합이 100%가 되도록 보정. 부호는 `type`(expense/income)으로 표현.
- **날짜**: 거래 날짜는 시간대 없는 로컬 `YYYY-MM-DD` 문자열, 월 조회는 `YYYY-MM`. `new Date('YYYY-MM-DD')`(UTC 파싱)로 월 경계를 판정하지 않는다. 말일/1일/윤년/연말·연초 테스트 필수.
- 검색·필터는 선택한 월 범위 안에서, 필터끼리는 AND. 유형별 '기타' 카테고리는 삭제 불가, 사용 중 카테고리 삭제는 재배정 후에만 허용.
- JSON 가져오기는 스키마 검증 후 확인을 받고 덮어쓰며, 검증 실패 시 기존 데이터를 변경하지 않는다.

## 코딩·컴포넌트·상태관리·테스트 규칙

- 함수 컴포넌트 + 훅, 컴포넌트는 표시와 이벤트 연결에 집중하고 로직은 훅/domain으로. `any` 금지, strict 유지.
- 상태는 가능한 한 로컬 state, 공유가 필요한 것(선택 월, 거래/카테고리 데이터, 테마)만 Context. 새 상태관리 라이브러리 추가 금지(필요하면 먼저 제안).
- 단위 테스트는 소스 옆 `*.test.ts(x)`, 경계값(금액 한계, 월 경계) 중심. 주요 사용자 흐름은 모두 Playwright E2E로 검증한다. 테스트마다 localStorage를 초기화해 격리하고, 날짜 의존 테스트는 시간을 고정한다.
- 접근성: 폼 라벨·오류 메시지 연결, 키보드 조작, 라이트/다크 색 대비, 차트는 수치 텍스트 병행.

## 개발 진행 규칙

- **사용자가 "승인"/"진행"/"OK"라고 하기 전에는 다음 단계 구현을 시작하지 않는다.** 한 번에 한 단계만 구현한다.
- 단계 흐름: 목표·범위 요약 → 관련 파일 확인 → 구현 계획 → 구현 → typecheck/lint/단위 테스트 → Playwright 검증 → `단계 완료 보고`(완료한 작업, 생성/수정 파일, 실행한 검증, 테스트 결과, 발견/해결/남은 문제, 다음 단계, 확인 요청) → 승인 → 커밋.
- 코드 수정 후 단위 테스트와 Playwright를 실행한다. 실패하면 원인을 분석해 앱 또는 테스트 중 올바른 쪽을 고치고 재실행한다. 테스트를 삭제·skip해서 통과시키지 않는다.
- 중요한 문제는 `docs/ISSUES.md`에 원인·영향·해결·검증 방법과 함께 기록한다. Critical/High가 남아 있으면 MVP 완료를 선언하지 않는다.
- 새 구조·명령·반복되는 실수가 생기면 이 파일을 갱신한다.

## Git 커밋 규칙

- 단계 승인 후 커밋. 메시지는 `type: 요약` 형식(`feat`, `fix`, `test`, `docs`, `refactor`, `chore`).
- 로컬 저장소 작성자는 `harry3406 <harry3406@gmail.com>`로 설정되어 있다.

## 금지사항

- 민감한 정보, API 키, 개인 금융 데이터를 소스·문서·테스트 픽스처에 넣지 않는다(테스트 데이터는 가짜 값).
- 사용자 승인 없이 PRD 범위 밖 기능(예산, 반복 거래, 이체, CSV, 로그인, 서버)을 추가하지 않는다.
- 금액에 부동소수점 연산, 날짜에 UTC 파싱 기반 월 계산을 쓰지 않는다.
- 외부 추적·분석 도구를 넣지 않는다.

## 환경 메모

- Windows 11, Node v24, npm 11. 프로젝트 경로에 한글(`가계부`)이 포함되어 있어 도구 호환성 문제가 생기면 `docs/ISSUES.md`에 기록한다.
- Playwright: `playwright.config.ts`가 포트 5173으로 dev 서버를 자동 기동(기존 서버 재사용). 브라우저는 Chromium만 설치(`npx playwright install chromium`).
- `Raw data.xlsx`는 사용자의 개인 금융 원본 데이터다. `.gitignore`로 제외되어 있으니 커밋·문서 인용 금지. 이 파일 활용(가져오기)은 PRD 범위 밖이므로 사용자 지시 없이 구현하지 않는다.
