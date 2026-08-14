# team-crud-system v1.0.1 - 설계 문서

> 버전: 1.0.1 | 작성일: 2026-08-14 | 상태: 초안
> 목표 레벨: Starter+ / Dynamic 준비 단계
> 기준 계획 문서: `docs/01-plan/features/team-crud-system-v1.0.1.plan.md`

---

## 1. 설계 목표

v1.0.1은 기존 Team CRUD 요구사항을 유지하면서 Next.js, TypeScript, mock API, TDD, QA를 포함하는 구조로 설계한다.

핵심 목표는 단순 화면 구현이 아니라 다음 네 가지를 분리하는 것이다.

- 화면 컴포넌트
- 도메인 타입과 검증 로직
- API client
- 테스트와 QA 기준

## 2. 기술 스택 결정

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js App Router | 페이지, 레이아웃, 클라이언트 컴포넌트 구조를 명확히 나눌 수 있다. |
| 언어 | TypeScript | 팀 데이터 모델과 API 응답 타입을 명확히 관리할 수 있다. |
| mock DB | `json-server` | 실제 REST API와 비슷한 CRUD 흐름을 연습하기 쉽다. |
| 테스트 러너 | Vitest | Vite 기반 테스트 실행이 빠르고 React Testing Library와 함께 쓰기 좋다. |
| UI 테스트 | React Testing Library | 사용자가 보는 화면과 행동 중심으로 테스트할 수 있다. |
| QA/E2E | Playwright | 브라우저 기준 CRUD 시나리오를 검증할 수 있다. |
| 스타일링 | CSS Modules 또는 전역 CSS | 별도 UI 라이브러리 없이 구조를 이해하기 쉽다. |

## 3. 전체 구조

```text
브라우저
  |
  v
Next.js 화면 컴포넌트
  |
  v
팀 상태 관리 훅
  |
  v
API client
  |
  v
json-server mock DB
```

이 구조에서는 화면이 직접 `fetch`를 호출하지 않는다. 화면은 훅 또는 액션 함수를 호출하고, 실제 HTTP 요청은 API client가 담당한다.

## 4. 폴더 구조

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  features/
    teams/
      api/
        teams-api.ts
      components/
        team-form.tsx
        team-list.tsx
        team-filters.tsx
        team-summary.tsx
      hooks/
        use-teams.ts
      model/
        team.ts
        team-validation.ts
        team-filters.ts
      __tests__/
        team-validation.test.ts
        team-filters.test.ts
        teams-api.test.ts
        team-form.test.tsx
        team-list.test.tsx
mock/
  db.json
tests/
  e2e/
    team-crud.spec.ts
docs/
  01-plan/features/team-crud-system-v1.0.1.plan.md
  02-design/features/team-crud-system-v1.0.1.design.md
```

## 5. 페이지 설계

| 페이지 | 경로 | 역할 |
|--------|------|------|
| 팀 관리 | `/` | 팀 CRUD 전체 기능을 제공하는 단일 화면 |

### 5.1 화면 배치

```text
+------------------------------------------------+
| 헤더: Team Manager v1.0.1                       |
+------------------------------------------------+
| 요약: 전체 / 활성 / 보류 / 보관 팀 수            |
+------------------------------------------------+
| 검색어 입력 | 상태 필터 | 새로고침 버튼          |
+----------------------+-------------------------+
| 팀 입력/수정 폼      | 팀 목록                 |
|                      | 수정 / 삭제 액션        |
+----------------------+-------------------------+
| 오류 메시지 또는 빈 상태 메시지                  |
+------------------------------------------------+
```

### 5.2 화면 상태

| 상태 | 표시 방식 |
|------|-----------|
| 초기 로딩 | 목록 영역에 로딩 메시지 표시 |
| 목록 있음 | 팀 카드 또는 테이블 표시 |
| 목록 없음 | 빈 상태 메시지 표시 |
| 검색 결과 없음 | 검색 조건에 맞는 팀이 없다는 메시지 표시 |
| API 실패 | 오류 메시지와 다시 시도 버튼 표시 |
| 수정 중 | 폼 제목과 버튼 문구를 수정 모드로 변경 |

## 6. 데이터 모델

```ts
export type TeamStatus = "active" | "paused" | "archived";

export interface Team {
  id: string;
  name: string;
  owner: string;
  members: number;
  status: TeamStatus;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamInput {
  name: string;
  owner: string;
  members: number;
  status: TeamStatus;
  description: string;
}
```

### 6.1 상태 값

| 값 | 한국어 표시 | 설명 |
|----|-------------|------|
| `active` | 활성 | 현재 운영 중인 팀 |
| `paused` | 보류 | 준비 중이거나 일시 중단된 팀 |
| `archived` | 보관 | 더 이상 운영하지 않지만 기록으로 남긴 팀 |

## 7. mock DB 설계

### 7.1 파일 위치

```text
mock/db.json
```

### 7.2 예시 데이터

```json
{
  "teams": [
    {
      "id": "team-1",
      "name": "플랫폼 팀",
      "owner": "김민준",
      "members": 6,
      "status": "active",
      "description": "공통 플랫폼과 개발자 경험을 담당한다.",
      "createdAt": "2026-08-14T00:00:00.000Z",
      "updatedAt": "2026-08-14T00:00:00.000Z"
    }
  ]
}
```

## 8. API 설계

기본 URL은 환경 변수로 관리한다.

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

| 기능 | Method | Endpoint | 요청 | 응답 |
|------|--------|----------|------|------|
| 팀 목록 조회 | GET | `/teams` | 없음 | `Team[]` |
| 팀 상세 조회 | GET | `/teams/:id` | 없음 | `Team` |
| 팀 생성 | POST | `/teams` | `TeamInput` 기반 데이터 | `Team` |
| 팀 수정 | PATCH | `/teams/:id` | 변경 필드 | `Team` |
| 팀 삭제 | DELETE | `/teams/:id` | 없음 | 빈 응답 |

### 8.1 API client 함수

| 함수 | 역할 |
|------|------|
| `getTeams()` | 팀 목록을 가져온다. |
| `createTeam(input)` | 새 팀을 생성한다. |
| `updateTeam(id, input)` | 기존 팀을 수정한다. |
| `deleteTeam(id)` | 팀을 삭제한다. |

### 8.2 오류 처리

- HTTP 응답이 `ok`가 아니면 사용자에게 보여줄 수 있는 오류 메시지로 변환한다.
- 네트워크 실패는 “서버에 연결할 수 없습니다.”로 처리한다.
- 생성/수정 실패 시 폼 입력값은 유지한다.

## 9. 컴포넌트 설계

| 컴포넌트 | 책임 |
|----------|------|
| `TeamSummary` | 전체, 활성, 보류, 보관 팀 수 표시 |
| `TeamFilters` | 검색어와 상태 필터 입력 |
| `TeamForm` | 팀 생성과 수정 입력 처리 |
| `TeamList` | 팀 목록 렌더링 |
| `TeamListItem` | 단일 팀 표시와 수정/삭제 버튼 |
| `EmptyState` | 목록 없음 또는 검색 결과 없음 표시 |
| `ErrorMessage` | API 실패 또는 검증 실패 메시지 표시 |

컴포넌트는 가능한 한 props로 데이터를 받고, API 호출은 `useTeams()` 훅에서 관리한다.

## 10. 상태 관리 설계

`useTeams()` 훅은 다음 상태를 관리한다.

| 상태 | 설명 |
|------|------|
| `teams` | API에서 가져온 전체 팀 목록 |
| `isLoading` | 초기 조회 또는 새로고침 중 여부 |
| `errorMessage` | API 실패 메시지 |
| `editingTeamId` | 현재 수정 중인 팀 ID |
| `searchQuery` | 검색어 |
| `statusFilter` | 상태 필터 |

### 10.1 주요 액션

| 액션 | 설명 |
|------|------|
| `loadTeams()` | 목록을 다시 조회한다. |
| `submitTeam(input)` | 등록 또는 수정을 처리한다. |
| `startEdit(team)` | 수정 모드로 전환한다. |
| `cancelEdit()` | 수정 모드를 취소한다. |
| `removeTeam(id)` | 삭제 후 목록을 갱신한다. |

## 11. 입력 검증 설계

검증은 `team-validation.ts`에 순수 함수로 분리한다.

| 필드 | 규칙 |
|------|------|
| `name` | 앞뒤 공백 제거 후 1자 이상 |
| `owner` | 앞뒤 공백 제거 후 1자 이상 |
| `members` | 1 이상 999 이하 정수 |
| `status` | `active`, `paused`, `archived` 중 하나 |
| `description` | 선택값, 최대 300자 |

검증 함수는 오류 객체를 반환한다.

```ts
export interface TeamValidationErrors {
  name?: string;
  owner?: string;
  members?: string;
  status?: string;
  description?: string;
}
```

## 12. 검색과 필터 설계

검색과 필터는 `team-filters.ts`에 순수 함수로 분리한다.

```ts
export function filterTeams(
  teams: Team[],
  searchQuery: string,
  statusFilter: TeamStatus | "all"
): Team[];
```

검색 대상은 다음 필드다.

- `name`
- `owner`
- `description`

검색어 비교는 대소문자를 구분하지 않는다.

## 13. TDD 설계

### 13.1 테스트 우선순위

| 순서 | 테스트 파일 | 검증 대상 |
|------|-------------|-----------|
| 1 | `team-validation.test.ts` | 입력 검증 규칙 |
| 2 | `team-filters.test.ts` | 검색과 상태 필터 |
| 3 | `teams-api.test.ts` | API client 요청/응답/오류 처리 |
| 4 | `team-form.test.tsx` | 폼 입력, 검증 메시지, 제출 |
| 5 | `team-list.test.tsx` | 목록 표시, 수정/삭제 버튼 |
| 6 | `team-crud.spec.ts` | 브라우저 기준 전체 CRUD 흐름 |

### 13.2 TDD 진행 방식

1. 실패하는 테스트를 먼저 작성한다.
2. 테스트를 통과하는 최소 코드를 작성한다.
3. 중복과 불명확한 이름을 정리한다.
4. 다음 요구사항으로 넘어간다.

## 14. QA 설계

QA는 자동 테스트와 별개로 사용자가 실제로 수행할 행동을 기준으로 확인한다.

| ID | 시나리오 | 기대 결과 |
|----|----------|-----------|
| QA-01 | 빈 폼 제출 | 필수 입력 안내가 표시된다. |
| QA-02 | 정상 팀 등록 | 팀이 목록에 추가되고 요약 카운트가 증가한다. |
| QA-03 | 팀 수정 | 수정된 값이 목록에 반영된다. |
| QA-04 | 팀 삭제 | 확인 후 팀이 목록에서 제거된다. |
| QA-05 | 검색어 입력 | 검색어와 일치하는 팀만 표시된다. |
| QA-06 | 상태 필터 선택 | 선택한 상태의 팀만 표시된다. |
| QA-07 | mock API 중단 | 오류 메시지와 재시도 동작이 제공된다. |
| QA-08 | 모바일 화면 확인 | 폼과 목록이 겹치지 않고 세로 배치된다. |

## 15. 실행 명령 설계

```json
{
  "scripts": {
    "dev": "next dev",
    "mock": "json-server --watch mock/db.json --port 4000",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "qa": "npm run test && npm run test:e2e"
  }
}
```

개발 시에는 Next.js와 mock 서버를 각각 실행한다.

```text
npm run dev
npm run mock
```

## 16. 환경 변수

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

환경 변수 기본값이 없으면 개발 편의를 위해 API client에서 `http://localhost:4000`을 fallback으로 사용한다.

## 17. 구현 순서

1. Next.js, TypeScript, 테스트 도구 설정
2. `mock/db.json` 작성
3. `Team`, `TeamInput`, `TeamStatus` 타입 작성
4. 검증 함수 테스트와 구현
5. 검색/필터 함수 테스트와 구현
6. API client 테스트와 구현
7. `useTeams()` 훅 구현
8. UI 컴포넌트 테스트와 구현
9. 페이지 통합
10. Playwright QA 시나리오 작성
11. 전체 테스트와 QA 실행

## 18. 완료 기준

- [ ] v1.0.1 전용 Next.js 구조가 생성된다.
- [ ] mock DB와 API client가 연결된다.
- [ ] CRUD 기능이 API 기반으로 동작한다.
- [ ] 입력 검증, 검색, 상태 필터가 동작한다.
- [ ] 단위 테스트와 컴포넌트 테스트가 작성된다.
- [ ] QA/E2E 시나리오가 작성된다.
- [ ] `npm run qa` 또는 동등한 검증 명령이 통과한다.
- [ ] 기존 v1.0.0 문서는 수정하지 않는다.

## 19. 다음 단계

Do phase에서 실제 구현 파일을 생성한다.

Do phase 작업 전에는 다음 세부 작업에 대한 승인을 받는다.

- Next.js 프로젝트 기본 파일 생성
- mock DB와 실행 스크립트 생성
- 타입, 검증 함수, 필터 함수 생성
- 테스트 파일 생성
- API client와 UI 컴포넌트 구현
- QA/E2E 파일 생성

---

## 버전 기록

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-08-14 | v1.0.1 설계 초안 작성 | Codex |
