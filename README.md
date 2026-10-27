# 가계부

한국어·원화(KRW) 개인 가계부 웹앱입니다. 수입·지출을 빠르게 기록하고, 월별 요약과 카테고리별 집계·차트로 돈의 흐름을 한눈에 확인합니다. 서버나 계정 없이 **브라우저에만 데이터를 저장**하며, JSON 파일로 백업·복원할 수 있습니다.

## 주요 기능

- **내역 관리**: 지출/수입 등록·수정·삭제 (날짜, 금액, 카테고리, 결제수단, 메모, 태그)
- **월별 요약**: 수입·지출·잔액, 카테고리별 지출 도넛 차트, 최근 6개월 추이 차트(표로 보기 지원)
- **탐색**: 월 이동, 검색(메모·태그·카테고리), 필터(유형·카테고리·결제수단·태그), 긴 목록은 100건씩 "더 보기"
- **카테고리 관리**: 기본 카테고리 제공, 추가·이름/색 수정·삭제(사용 중이면 다른 카테고리로 내역 옮기기)
- **백업·복구**: JSON 내보내기/가져오기, 전체 초기화, 손상된 데이터 복구 화면
- **다크 모드**, 모바일·데스크톱 반응형, 접근성(WCAG 2.1 AA 지향, 키보드 조작)

## 빠른 시작

요구 사항: Node.js 20.19 이상 또는 22.12 이상(개발은 Node 24에서 확인), npm

> 설치·실행·배포·사용법·문제 해결을 단계별로 설명한 **[`docs/MANUAL.md`](docs/MANUAL.md)** 를 먼저 보세요.

```bash
npm install
npx playwright install chromium firefox webkit   # E2E 테스트를 돌릴 때만 필요
npm run dev                                      # http://localhost:5173
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm run preview` | 프로덕션 빌드 / 빌드 결과 미리보기 |
| `npm run typecheck`, `npm run lint` | 타입 검사(strict), 린트(oxlint) |
| `npm test` | 단위·컴포넌트 테스트(Vitest) |
| `npm run test:coverage` | 커버리지 측정 + 기준 강제 |
| `npm run test:e2e` | E2E 전체(Chromium 전체 시나리오 + Firefox/WebKit/iPhone 핵심 흐름) |
| `npm run test:e2e:preview` | 프로덕션 빌드에서 핵심 흐름 E2E |
| `npm run test:a11y` | 접근성 검사(axe + 키보드·리플로우) |
| `npm run check:bundle` | 번들 크기 예산 점검(gzip JS 120KB, CSS 15KB) |
| `npm run test:all` | 위 검증을 모두 순서대로 실행 |

## 기술 스택

React 19 · TypeScript(strict) · Vite · Tailwind CSS v4 · React Router · Vitest + React Testing Library · Playwright · 직접 구현한 SVG 차트. 상태관리는 React Context와 커스텀 훅만 사용합니다(외부 상태 라이브러리 없음).

## 구조

```
src/
  app/          라우팅·레이아웃·Provider(테마, 저장소, 데이터, 선택 월, 내역 편집기), 복구 화면, 오류 경계
  components/   공통 UI(Button, Field, Modal, Toast, MonthNavigator …)
  features/     transactions · summary · categories · settings (화면 단위 기능)
  domain/       타입과 순수 함수(금액·날짜·집계·비율·필터·추이·차트 수학) — React/저장소에 의존하지 않음
  storage/      Repository 인터페이스 + localStorage 구현(캐시) + 스키마 검증·마이그레이션·백업
tests/e2e/      Playwright 시나리오(여정, 요약, 필터, 차트, 카테고리, 백업, 복구, 접근성 …)
docs/           PRD, 개발 계획, 이슈 기록, 테스트 가이드, MVP 체크리스트
```

UI는 저장소 인터페이스(`src/storage/repository.ts`)에만 의존합니다. 저장소를 다른 구현(IndexedDB, SQLite, Supabase 등)으로 바꿀 때는 구현체와 `src/storage/index.ts`만 교체하면 됩니다.

## 데이터와 백업 — 꼭 읽어 주세요

- 데이터는 **이 브라우저의 localStorage에만** 저장되며 어디로도 전송되지 않습니다. 브라우저 데이터(사이트 데이터)를 지우면 사라지므로 **설정 → 백업 파일 내보내기**로 주기적으로 백업하세요.
- **저장 용량 한계**: 브라우저가 주는 공간(약 5MB)이 상한입니다. 내역 1건이 약 260자를 쓰므로 대략 **Chrome·Edge·Firefox는 약 2만 건, Safari(iOS 포함)는 약 1만 건**이 한계입니다(Safari는 한글이 들어간 데이터를 2바이트로 세어 절반 수준). 설정 화면에 사용률이 표시되고 80%를 넘으면 안내 배너가 나옵니다. 그 전에 백업하고 오래된 내역을 정리하세요.
- 저장된 데이터가 손상되면 **복구 화면**이 나옵니다. 손상된 원본 저장 / 백업 파일로 복구 / 새로 시작 중에서 고를 수 있고, 원본은 사용자가 선택하기 전에는 지워지지 않습니다.
- 브라우저가 저장소를 막은 환경(시크릿 모드 등)에서는 **이 창이 열려 있는 동안만 유지되는 임시 저장**으로 동작하며 경고가 계속 표시됩니다. 닫기 전에 백업 파일을 내려받으세요.
- 여러 탭을 열어 두어도 한 탭에서 바꾼 내용이 다른 탭에 자동 반영됩니다.
- 테마(라이트/다크)는 기기 설정이라 백업에 포함되지 않습니다.

## 지원 브라우저

최신 Chrome, Edge, Firefox, Safari(데스크톱·모바일). Chromium은 전체 시나리오, Firefox·WebKit·iPhone 에뮬레이션은 핵심 흐름을 자동 테스트합니다.

## 성능 (월 1,000건 × 12개월 = 12,000건, Chromium 측정)

| 동작 | 시간 |
| --- | --- |
| 첫 로드(홈) | 약 220ms |
| 내역 화면 이동 | 약 290ms |
| 월 이동 | 약 90ms |
| 검색 입력 | 약 30ms |
| 내역 1건 추가(저장까지) | 약 220ms |

저장소 읽기 캐시와 목록 점진 렌더링으로 개선한 값입니다(개선 전 내역 화면 이동 약 1,000ms, 내역 추가 약 570ms).

## 문서

- [`docs/MANUAL.md`](docs/MANUAL.md) **실행·사용 매뉴얼**(설치, 실행/배포, 화면별 사용법, 백업·복구, 문제 해결)
- [`docs/PRD.md`](docs/PRD.md) 제품 요구사항
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) 개발 계획
- [`docs/TESTING.md`](docs/TESTING.md) 테스트 가이드·요구 추적표·변이 점검
- [`docs/ISSUES.md`](docs/ISSUES.md) 발견·해결한 문제 기록
- [`docs/MVP_CHECKLIST.md`](docs/MVP_CHECKLIST.md) MVP 완료 체크리스트
- [`CLAUDE.md`](CLAUDE.md) 개발 규칙(AI 코딩 도구용 안내 포함)

## 범위 밖(향후 확장)

예산, 반복 거래, 계좌 간 이체, CSV 가져오기/내보내기, 로그인·가족 공동 사용·서버 동기화(데이터 모델은 `ownerId`·`Member`·`schemaVersion`으로 대비), 결제수단 커스텀 관리, 전체 기간 검색, PWA. 용량 한계가 문제가 되면 저장소 구현을 IndexedDB 등으로 교체할 수 있습니다.
