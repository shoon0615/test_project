# team-crud-system v1.0.1 - Gap Analysis

> 작성일: 2026-08-14
> Phase: Check / Analyze
> 설계 문서: `docs/02-design/features/team-crud-system-v1.0.1.design.md`
> 구현 기록: `docs/02-design/features/team-crud-system-v1.0.1.do.md`

---

## 1. Match Rate

**Match Rate: 86.7%**

계산 기준:

```text
구현 완료 항목 26개 / 설계 항목 30개 * 100 = 86.7%
```

## 2. 요약

v1.0.1 설계의 핵심 목표인 Next.js, TypeScript, mock API, TDD 기반 CRUD 구조는 대부분 구현되었다.

단위 테스트와 컴포넌트 테스트는 통과했고, TypeScript 타입 검사도 통과했다. 다만 Playwright E2E는 현재 실행 환경에서 Chromium 설치가 지원되지 않아 실제 브라우저 QA 완료로 볼 수 없다. 또한 설계에서 독립 컴포넌트로 정의한 `TeamListItem`, `EmptyState`, `ErrorMessage`가 별도 파일로 분리되지 않고 `TeamList`, `TeamManager` 내부에 포함되어 있다.

따라서 구현 자체는 사용 가능한 수준이지만, 설계 일치율 기준으로는 Iterate phase에서 보완하는 것이 적절하다.

## 3. 검증 결과

| 검증 항목 | 결과 | 비고 |
|-----------|------|------|
| `npm test -- --run` | 통과 | 5 files / 13 tests |
| `npx tsc --noEmit` | 통과 | TypeScript 오류 없음 |
| `npm run test:e2e` | 미완료 | Playwright Chromium이 현재 환경의 `debian11-x64`를 지원하지 않음 |
| mock 서버 기동 | 부분 확인 | Playwright webServer 단계에서는 `json-server`와 Next dev 서버 기동 성공 |

## 4. 설계 항목별 비교

| ID | 설계 항목 | 구현 상태 | 근거 | 판정 |
|----|-----------|-----------|------|------|
| D-01 | Next.js App Router 사용 | 구현 | `src/app/layout.tsx`, `src/app/page.tsx` | Match |
| D-02 | TypeScript 사용 | 구현 | `tsconfig.json`, `.ts`, `.tsx` 파일 | Match |
| D-03 | `json-server` mock DB | 구현 | `mock/db.json`, `npm run mock` | Match |
| D-04 | Vitest 테스트 러너 | 구현 | `vitest.config.ts`, `npm test -- --run` 통과 | Match |
| D-05 | React Testing Library | 구현 | `team-form.test.tsx`, `team-list.test.tsx` | Match |
| D-06 | Playwright QA/E2E | 파일 생성, 실행 미완료 | `tests/e2e/team-crud.spec.ts`, 브라우저 설치 실패 | Missing in Environment |
| D-07 | 전역 CSS 또는 CSS Modules | 구현 | `src/app/globals.css` | Match |
| D-08 | 화면이 직접 `fetch`를 호출하지 않음 | 구현 | `TeamManager` -> `useTeams()` -> `teams-api.ts` | Match |
| D-09 | API client 분리 | 구현 | `src/features/teams/api/teams-api.ts` | Match |
| D-10 | `useTeams()` 훅 상태 관리 | 구현 | `src/features/teams/hooks/use-teams.ts` | Match |
| D-11 | `Team`, `TeamInput`, `TeamStatus` 타입 | 구현 | `src/features/teams/model/team.ts` | Match |
| D-12 | 상태 값 `active`, `paused`, `archived` | 구현 | `TEAM_STATUSES`, `TEAM_STATUS_LABELS` | Match |
| D-13 | `mock/db.json` 예시 데이터 | 구현 | `mock/db.json` | Match |
| D-14 | GET `/teams` | 구현 | `getTeams()` | Match |
| D-15 | GET `/teams/:id` | 미구현 | 상세 조회 함수 없음 | Missing in Code |
| D-16 | POST `/teams` | 구현 | `createTeam()` | Match |
| D-17 | PATCH `/teams/:id` | 구현 | `updateTeam()` | Match |
| D-18 | DELETE `/teams/:id` | 구현 | `deleteTeam()` | Match |
| D-19 | HTTP 오류 처리 | 구현 | `TeamsApiError`, `response.ok` 검사 | Match |
| D-20 | 네트워크 실패 메시지 | 구현 | `catch`에서 “서버에 연결할 수 없습니다.” 처리 | Match |
| D-21 | `TeamSummary` 컴포넌트 | 구현 | `team-summary.tsx` | Match |
| D-22 | `TeamFilters` 컴포넌트 | 구현 | `team-filters.tsx` | Match |
| D-23 | `TeamForm` 컴포넌트 | 구현 | `team-form.tsx` | Match |
| D-24 | `TeamList` 컴포넌트 | 구현 | `team-list.tsx` | Match |
| D-25 | `TeamListItem` 컴포넌트 | 목록 내부에 포함 | 별도 파일/컴포넌트 없음 | Changed |
| D-26 | `EmptyState` 컴포넌트 | 목록 내부에 포함 | 별도 파일/컴포넌트 없음 | Changed |
| D-27 | `ErrorMessage` 컴포넌트 | 페이지 내부에 포함 | 별도 파일/컴포넌트 없음 | Changed |
| D-28 | 입력 검증 순수 함수 | 구현 | `team-validation.ts` | Match |
| D-29 | 검색/필터 순수 함수 | 구현 | `team-filters.ts` | Match |
| D-30 | 실행 스크립트 `dev`, `mock`, `test`, `test:e2e`, `qa` | 구현 | `package.json` | Match |

## 5. 구현 완료 항목

- Next.js App Router 기본 구조 생성
- TypeScript 설정 생성
- `json-server` 기반 `mock/db.json` 생성
- 팀 도메인 타입 정의
- 입력 검증 함수 구현
- 검색/상태 필터 함수 구현
- API client CRUD 함수 구현
- `useTeams()` 훅 구현
- 요약, 필터, 폼, 목록 UI 구현
- 전역 CSS 기반 반응형 UI 구현
- 단위 테스트와 컴포넌트 테스트 작성
- Playwright E2E 시나리오 파일 작성
- Do phase 구현 기록 문서 작성

## 6. Missing Items

### 6.1 코드 누락

- `getTeam(id)` 상세 조회 API client 함수가 없다.
  - 설계 문서에는 GET `/teams/:id`가 포함되어 있다.
  - 현재 화면에는 상세 페이지가 없으므로 기능상 치명적이지는 않지만, 설계 일치율 기준으로는 누락이다.

### 6.2 실행 환경 누락

- Playwright Chromium 실행이 완료되지 않았다.
  - 실패 원인: 현재 환경에서 `npx playwright install chromium` 실행 시 `debian11-x64` Chromium 미지원 오류 발생.
  - E2E 파일은 존재하지만 실제 브라우저 QA 통과로 볼 수 없다.

## 7. Changed Items

- `TeamListItem`은 별도 컴포넌트가 아니라 `TeamList` 내부 JSX로 구현되었다.
- `EmptyState`는 별도 컴포넌트가 아니라 `TeamList` 내부 조건부 렌더링으로 구현되었다.
- `ErrorMessage`는 별도 컴포넌트가 아니라 `TeamManager` 내부 배너 JSX로 구현되었다.

이 변경은 동작상 문제는 작지만, 설계의 컴포넌트 책임 분리 기준과는 차이가 있다.

## 8. Missing in Design

구현에는 있지만 설계 문서에 명확히 적히지 않은 항목은 다음과 같다.

- `.gitignore`에 `node_modules`, `.next`, `test-results`, `tsconfig.tsbuildinfo` 제외 규칙 추가
- Vitest가 `.bkit-codex`와 E2E 테스트를 잘못 수집하지 않도록 `include`/`exclude` 설정 추가
- `package-lock.json` 생성

이 항목들은 구현 품질을 위해 필요한 보조 설정이며, 설계 문서에 추가해도 좋다.

## 9. 권장 보완 작업

Iterate phase에서 다음 작업을 수행하면 match rate를 90% 이상으로 올릴 수 있다.

1. `getTeam(id)` API client 함수와 테스트를 추가한다.
2. `TeamListItem`, `EmptyState`, `ErrorMessage`를 별도 컴포넌트로 분리한다.
3. Playwright 환경 제약을 문서화하고, 현재 환경에서 실행 가능한 QA 대체 기준을 추가한다.
4. 설계 문서에 `.gitignore`, Vitest include/exclude, lockfile 생성 항목을 보조 설정으로 반영한다.

## 10. 다음 단계

현재 match rate가 90% 미만이므로 다음 단계는 Iterate phase가 적절하다.

```text
$pdca iterate team-crud-system-v1.0.1
```

Iterate phase 전 사용자 승인 요청 항목:

- API client `getTeam(id)` 함수와 테스트 추가
- UI 보조 컴포넌트 3개 분리
- QA 환경 제약과 대체 QA 기준 문서화
- 설계 문서의 보조 설정 항목 보완

---

## 11. 버전 기록

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-08-14 | v1.0.1 gap analysis 작성 | Codex |
