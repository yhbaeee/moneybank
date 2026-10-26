# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 상태

- 단계 2(디자인 시스템·레이아웃) 구현 완료(승인 대기). 구현은 `docs/DEVELOPMENT_PLAN.md`의 11단계 순서대로 진행한다.
- 기준 문서: `docs/PRD.md`(무엇을 만들 것인가, v1.0 승인), `docs/DEVELOPMENT_PLAN.md`(어떻게/순서), `docs/ISSUES.md`(발견된 문제 기록, 필요 시 생성).
- 아래 "명령어"와 "폴더 구조"는 1단계에서 확정될 계획이다. **단계 구현 후 실제 상태에 맞게 이 파일을 갱신한다.**

## 프로젝트 목적

한국어·원화(KRW) 고정의 개인 가계부 웹앱. 지출/수입 기록, 월별 요약, 카테고리 집계·차트, 검색/필터, JSON 백업. 지금은 1인 데이터만 다루지만 **가족 공동 사용·서버 저장으로 확장 가능하게** 설계한다(거래의 `ownerId`, `Member`, `schemaVersion`).

## 기술 스택

React + TypeScript(strict) + Vite, Tailwind CSS(다크 모드는 class 전략), React Router, 상태관리는 React Context + 커스텀 훅(외부 상태 라이브러리 없음), Vitest + React Testing Library, Playwright(E2E), 저장은 localStorage(저장소 인터페이스 뒤에 숨김). 차트 방식(직접 SVG vs 라이브러리)은 7단계에서 결정.

## 명령어 (단계 1에서 검증 완료)

```
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run typecheck    # tsc
npm run lint         # oxlint (Vite 템플릿 기본, ESLint 아님)
npm run test         # Vitest (단일 파일: npx vitest run src/domain/money.test.ts, 이름: -t "패턴")
npm run test:e2e     # Playwright, desktop+mobile(Pixel 7) 프로젝트, dev 서버 자동 기동 (단일 파일: npx playwright test tests/e2e/x.spec.ts, 디버그: --ui)
```

## 아키텍처 (계획 — 단계 3~에서 생성)

```
src/app/        라우팅, 프로바이더, 레이아웃
src/components/ 공통 UI
src/features/   transactions | summary | categories | settings (화면 단위 기능)
src/domain/     타입, 순수 함수(금액·날짜·집계·필터)  ← React/저장소에 의존 금지
src/storage/    Repository 인터페이스 + localStorage 구현 + 마이그레이션 + 백업 검증
tests/e2e/      Playwright
```

핵심 흐름: `features(UI)` → Context/훅 → `Repository 인터페이스` → localStorage 구현. 집계·필터·비율 계산은 `domain`의 순수 함수로만 하고 UI에서 직접 계산하지 않는다. 저장소 구현체를 교체해도(SQLite/Supabase) UI와 domain은 바뀌지 않아야 한다.

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
