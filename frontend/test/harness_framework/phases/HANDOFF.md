# Comment Lens 작업 인수인계

> 최종 갱신: 2026-08-07  
> 작업 브랜치: `feat-0-mvp`  
> 프로젝트 경로: `/home/vscode/test_project/frontend/test/harness_framework`

## 1. 제품 목표

YouTube 영상 URL 하나를 입력하면 공개 최상위 댓글을 수집해 브라우저 안에서 감성·주제 분석을 수행하고, 크리에이터가 잘하고 있는 점과 개선할 점을 근거 댓글과 함께 보여주는 로그인·별도 앱 서버 없는 SPA를 만든다.

핵심 제약은 다음과 같다.

- 로그인과 사용자 계정은 구현하지 않는다.
- 별도 애플리케이션 서버나 데이터베이스를 두지 않는다.
- YouTube Data API는 브라우저에서 호출한다.
- API 키는 `VITE_YOUTUBE_API_KEY` 빌드 환경변수로 주입하며 저장소에 커밋하지 않는다.
- 댓글 분석은 결정론적인 로컬 규칙 기반이며 Web Worker에서 실행한다.
- 리포트는 검증 후 `localStorage`에 제한적으로 저장한다.
- 현재 사용 도구는 Claude가 아니라 Codex이며, 하네스 실행기도 `codex exec`를 호출한다.

상세 요구사항과 결정 근거는 아래 문서를 우선 확인한다.

- [`docs/PRD.md`](../docs/PRD.md)
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- [`docs/ADR.md`](../docs/ADR.md)
- [`docs/UI_GUIDE.md`](../docs/UI_GUIDE.md)

## 2. 이번 대화에서 확정한 결정

1. PRD, Architecture, ADR을 에러·에지 케이스·복구 정책까지 포함하도록 확장했다.
2. MVP를 Step 0~14로 나누고 각 Step에 독립 Acceptance Criteria를 작성했다.
3. 기존 하네스가 Claude CLI를 호출하던 부분을 Codex CLI 기반으로 변경했다.
4. 사용자가 실제 UX를 먼저 확인하기 위해 **Step 11까지만 구현**하고 중단하기로 했다.
5. **Step 12~14는 사용자 확인과 피드백 전까지 진행하지 않는다.**
6. 이를 위해 하네스에 `--through-step N` 체크포인트 실행 옵션을 추가했다.
7. API 키가 없어도 초기 화면은 렌더링된다. 현재 구현은 유효한 URL로 분석을 제출했을 때 `VITE_YOUTUBE_API_KEY` 설정 오류를 화면에 표시한다. 초기 화면에서 즉시 경고하지 않는 점은 추후 UX 개선 후보이다.
8. Remote Container에서는 브라우저의 `localhost`가 컨테이너와 다를 수 있으므로 VS Code의 **PORTS** 탭에서 포트를 전달해야 한다.

## 3. 현재 Step 상태

권위 있는 상태 파일은 [`0-mvp/index.json`](./0-mvp/index.json)이다.

| Step | 이름 | 상태 | 주요 산출물 |
|---:|---|---|---|
| 0 | project-setup | 완료 | Vite, React, strict TypeScript, Tailwind, Vitest/RTL, ESLint |
| 1 | domain-types | 완료 | 도메인 타입, 중앙 설정, 런타임 validator, 불변조건 |
| 2 | youtube-url | 완료 | 지원 URL 파서 및 변형/거부 테스트 |
| 3 | youtube-api | 완료 | API adapter, schema 검증, 오류 매핑, timeout/retry/pagination |
| 4 | comment-preprocessing | 완료 | 정규화, 언어 판별, placeholder, 중복 제거, 제외 사유 |
| 5 | sentiment-analysis | 완료 | 한·영 사전 기반 결정론적 감성 분석과 confidence/evidence |
| 6 | topic-analysis | 완료 | 한·영 주제·의도·안전 플래그 분석 |
| 7 | report-builder | 완료 | 강점/개선점/근거/경고 리포트 조립 및 반올림 |
| 8 | analysis-worker | 완료 | Worker pipeline, progress/cancel/stale/crash retry |
| 9 | report-storage | 완료 | 최근 리포트/정렬 설정 저장, 손상 격리, quota 복구 |
| 10 | analysis-orchestrator | 완료 | 상태 머신, jobId 오케스트레이터, React hook |
| 11 | analysis-ui | 완료 | URL 입력, 영상 요약, 최근 리포트, 진행/취소/오류 상태 UI |
| 12 | report-ui | **대기** | 상세 리포트 화면 |
| 13 | accessibility-print | **대기** | 접근성, 반응형, 인쇄/PDF |
| 14 | integration-tests | **대기** | 전체 흐름 통합/E2E 테스트 |

Phase 전체는 아직 완료된 것이 아니므로 `completed_at`이 없으며, Step 12~14는 `pending` 상태가 맞다.

## 4. 현재 사용자 경험 범위

현재 브라우저에서 확인 가능한 기능은 다음과 같다.

- YouTube URL 입력 및 URL 형식 검증
- API 키 미설정 오류 안내
- 영상 요약 표시
- 댓글 수집 및 분석 단계별 진행 상태
- 실행 중 취소
- 재시도 가능한 오류의 복구 버튼과 진단 ID
- 댓글 없음, 유효 표본 부족, 취소, 부분 성공 상태
- 최근 로컬 리포트 목록과 선택

아직 구현되지 않은 핵심 화면은 Step 12의 상세 리포트 UI다. 감성 분포, 주요 주제, 강점, 개선점, 대표 근거 댓글을 완성된 시각적 리포트로 보는 경험은 Step 12 이후 확인 가능하다.

## 5. 검증 완료 내역

Step 11 완료 후 다음 명령이 모두 성공했다.

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

마지막 전체 테스트 결과:

- Test files: `16 passed`
- Tests: `191 passed`
- TypeScript, ESLint, Vite production build 통과

실제 Chrome/agent-browser 검증 결과:

- `http://127.0.0.1:5173/`에서 HTTP `200 OK`
- 페이지 제목 `Comment Lens`
- 초기 화면에 의미 있는 콘텐츠 렌더링
- Vite error overlay 없음
- 브라우저 콘솔 오류 없음
- URL 입력창과 `분석하기` 버튼 렌더링
- 유효 URL 제출 시 API 키 미설정 안내 렌더링

최종 확인 뒤 개발 서버는 종료했다. 현재 5173/5174 서버가 실행 중이라고 가정하지 말고 다음 세션에서 새로 시작한다.

## 6. 로컬 실행 방법

Node 요구 버전은 `>=20.19.0`이다.

```bash
cd /home/vscode/test_project/frontend/test/harness_framework
npm install
cp .env.example .env.local
```

`.env.local`에서 아래 값을 설정한다.

```dotenv
VITE_YOUTUBE_API_KEY=YOUR_RESTRICTED_YOUTUBE_DATA_API_KEY
```

키는 YouTube Data API로 제한하고, 배포 환경에서는 정확한 HTTP referrer 제한과 일일 quota/사용량 알림을 설정한다. `.env.local`의 실제 키를 출력하거나 커밋하지 않는다.

개발 서버는 포트를 명시적으로 고정하는 명령을 권장한다.

```bash
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

접속 주소는 일반적으로 `http://localhost:5173/`이다. Remote Container에서 연결 거부가 발생하면 VS Code의 **PORTS** 탭에서 5173을 Forward하고, 생성된 Forwarded Address로 접속한다. 항상 터미널의 `Local:` 출력과 실제 포워딩 주소를 확인한다.

## 7. 다음 세션 재개 절차

사용자 UX 피드백을 먼저 받은 뒤 범위를 확정한다. 피드백 수정이 Step 11 이하에 해당하면 해당 코드를 먼저 수정하고 전체 검증을 다시 수행한다.

Step 12만 진행하려면:

```bash
python3 scripts/execute.py 0-mvp --through-step 12
```

Step 13까지 진행하려면:

```bash
python3 scripts/execute.py 0-mvp --through-step 13
```

사용자가 최종 MVP 완성을 승인한 뒤 Step 12~14 전체를 진행하려면:

```bash
python3 scripts/execute.py 0-mvp
```

하네스는 `feat-0-mvp` 브랜치에서 첫 `pending` Step부터 재개한다. Step 11까지는 다시 실행하지 않는다. 실행 전에는 반드시 아래를 확인한다.

```bash
git status --short
git branch --show-current
python3 -c "import json; print(json.load(open('phases/0-mvp/index.json'))['steps'])"
```

## 8. 다음 작업 시 주의사항

- Step 12~14를 사용자 승인 없이 선행하지 않는다.
- 기존 테스트와 타입 계약을 우회하거나 약화하지 않는다.
- `any`, 무검증 assertion, 외부 응답 직접 신뢰를 피한다.
- API 키, 전체 댓글 원문, 민감 데이터가 로그·Git·localStorage에 과도하게 남지 않도록 한다.
- Worker와 orchestrator의 `jobId` 기반 stale message 차단 및 취소 의미를 보존한다.
- 리포트의 evidence 참조와 count 불변조건을 보존한다.
- Step 12 UI는 [`docs/UI_GUIDE.md`](../docs/UI_GUIDE.md)와 [`0-mvp/step12.md`](./0-mvp/step12.md)를 함께 따른다.
- 여러 React 컴포넌트를 변경한 뒤에는 타입/린트/테스트/빌드뿐 아니라 실제 브라우저 렌더링과 콘솔 오류를 확인한다.

## 9. Git 상태와 주요 커밋

문서 작성 직전 작업 트리는 clean 상태였고 현재 브랜치는 `feat-0-mvp`였다. 최근 주요 커밋:

- `27dc820` — Step 11 analysis UI
- `8eca80f` — Step 10 orchestrator
- `fa8e536` — Step 9 report storage
- `593b17e` — Step 8 analysis worker
- `38379fc` — Step 7 report builder
- `e935041` — Step 6 topic analysis
- `001923c` — Step 5 sentiment analysis
- `6949593` — Step 4 preprocessing
- `6f93f9b` — Step 3 YouTube API

최신 커밋과 실제 작업 트리를 항상 권위 있는 상태로 취급하고, 이 문서와 차이가 있으면 `git status`, Git log, `phases/0-mvp/index.json`을 우선한다.
