# team-crud-system v1.0.1 대화 요약

> 작성일: 2026-08-14
> 목적: team CRUD 시스템 개발 요청과 진행 규칙을 간단히 보관한다.

---

## 1. 최초 요청

사용자는 `$pdca team CRUD 시스템 구현`을 요청했다.

초기 방향은 Starter 레벨에 맞춰 HTML, CSS, JavaScript, `localStorage` 기반의 정적 Team CRUD 시스템으로 잡았다.

## 2. 진행 중 변경된 작업 규칙

사용자는 다음 규칙을 추가로 요청했다.

- 모든 `*.md` 문서는 한국어 기준으로 작성한다.
- PDCA phase별로 진행 전에 승인을 받는다.
- 승인은 phase 전체가 아니라, phase 안에서 수행할 세부 작업 단위로 받는다.

이후 Plan phase 문서 정리와 Design phase 문서 정리는 각각 사용자 승인 후 진행했다.

## 3. 현재 존재하는 1.0.0 문서

다음 문서는 Starter 버전의 1.0.0 기준 문서로 유지한다.

- `docs/01-plan/features/team-crud-system.plan.md`
- `docs/02-design/features/team-crud-system.design.md`

## 4. 새 요청: 1.0.1 개선 버전

사용자는 기존 1.0.0 문서를 보존한 상태에서 1.0.1 문서를 새로 만들 것을 요청했다.

요구사항의 기능 범위는 기존과 동일하다.

- 팀 생성
- 팀 목록 조회
- 팀 수정
- 팀 삭제
- 검색
- 상태 필터
- 입력 검증

다만 기술 수준과 개발 프로세스를 다음과 같이 올린다.

- Next.js 기반 프론트엔드
- `json-server` 또는 mock API 기반 데이터 저장
- 실제 DB를 대체하는 하드코어 mock DB 흐름
- TDD 포함
- QA 검증 포함

## 5. 현재 결정

1.0.1은 기존 Starter 정적 앱보다 높은 수준의 학습/실습 버전으로 관리한다.

프로젝트 자동 감지는 아직 Starter이지만, 1.0.1 문서에서는 목표 레벨을 `Starter+ / Dynamic 준비 단계`로 정의한다.

## 6. 다음 진행 원칙

- 기존 1.0.0 문서는 수정하지 않는다.
- 1.0.1 문서는 별도 파일명으로 생성한다.
- 구현 전에 Plan, Design, Do, Check, Report 단계별 세부 작업 승인을 받는다.
- 문서는 모두 한국어로 작성한다.
