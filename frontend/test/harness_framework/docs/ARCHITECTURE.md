# 아키텍처

## 시스템 경계
Comment Lens는 React 정적 SPA다. 자체 서버와 데이터베이스는 없으며 YouTube Data API 호출, 댓글 분석, 리포트 생성과 보존을 모두 브라우저에서 수행한다.

## 컨텍스트와 신뢰 경계
```text
[사용자]
   │ URL
   ▼
[정적 SPA / 신뢰하는 앱 코드]
   ├── HTTPS ──> [Google YouTube Data API / 외부 신뢰 경계]
   ├── postMessage ──> [Analysis Web Worker / 별도 실행 컨텍스트]
   └── read/write ──> [브라우저 localStorage / 손상 가능 입력으로 취급]
```
- 정적 호스트는 HTML/JS/CSS만 제공하며 사용자 댓글을 수신하지 않는다.
- YouTube 응답, URL, localStorage와 Worker 메시지는 모두 런타임 스키마 검증 전까지 신뢰하지 않는다.
- API 키는 브라우저 번들에서 추출 가능한 공개 식별자로 간주한다. 사용자 OAuth나 쓰기 권한은 사용하지 않는다.

## 기술 스택
- Vite + React + TypeScript strict mode
- Tailwind CSS
- Vitest + React Testing Library
- Recharts(감정 분포 시각화)
- Web Worker(분석 중 UI 멈춤 방지)
- 브라우저 `localStorage`(최근 리포트 5개)

## 디렉토리 구조
```text
src/
├── app/                    # 앱 진입점과 전역 스타일
├── components/
│   ├── analysis/           # 입력, 진행 상태, 오류 상태
│   ├── report/             # 요약, 인사이트, 차트, 대표 댓글
│   └── ui/                 # 버튼, 카드 등 최소 공통 UI
├── features/
│   ├── youtube/            # URL 파싱과 YouTube API 어댑터
│   ├── sentiment/          # 감정 점수 계산
│   ├── topics/             # 주제/피드백 분류
│   └── report/             # 집계와 문장 템플릿
├── workers/                # 분석 Web Worker
├── storage/                # localStorage 저장소
├── config/                 # 임계값, 분석 버전, 환경 설정 검증
├── observability/          # 개인정보 없는 로컬 진단 이벤트
├── types/                  # 도메인 타입
└── test/                   # 픽스처와 테스트 유틸리티
```

## 데이터 흐름
```text
YouTube URL
  → URL 검증/영상 ID 추출
  → YouTube Data API에서 영상 정보와 공개 댓글 수집
  → 정규화/중복·스팸 필터
  → Web Worker에서 감정 및 주제 분석
  → 근거 댓글과 통계를 포함한 Report 생성
  → 화면 렌더링 + localStorage 보존
```

### 상세 시퀀스
```text
UI              Orchestrator       YouTube API       Worker          Storage
│ submit(jobId)      │                   │               │                │
│───────────────────>│ validate          │               │                │
│                    │ videos.list       │               │                │
│                    │──────────────────>│               │                │
│                    │<──────────────────│ normalize     │                │
│ video summary      │                   │               │                │
│<───────────────────│ commentThreads ×1~3               │                │
│                    │──────────────────>│               │                │
│ progress(count)    │<──────────────────│               │                │
│<───────────────────│ analyze(jobId, comments)─────────>│                │
│                    │<──────── progress/result(jobId) ──│                │
│ report             │ validate invariants               │                │
│<───────────────────│───────────────────────────────────────────────────>│
```
- 모든 메시지/응답은 `jobId`를 포함하며 현재 job과 다르면 폐기한다.
- 저장 실패는 성공 상태를 오류 상태로 되돌리지 않는다.
- 영상 메타데이터 성공 후 댓글 수집 실패 시 오류 화면에서 확인한 영상 정보를 유지한다.

## 핵심 도메인 타입
```ts
type Sentiment = 'positive' | 'neutral' | 'negative'

interface AnalyzedComment {
  id: string
  text: string
  likeCount: number
  publishedAt: string
  sentiment: Sentiment
  sentimentScore: number
  language: 'ko' | 'en' | 'unknown' | 'unsupported'
  topics: FeedbackTopic[]
  excludedReason?:
    | 'duplicate'
    | 'spam'
    | 'too-short'
    | 'unsupported-language'
    | 'no-analyzable-text'
  normalizedHash: string
}

interface Insight {
  title: string
  description: string
  mentionCount: number
  evidenceCommentIds: string[]
  action?: string
}

interface AnalysisReport {
  schemaVersion: 1
  analysisVersion: string
  reportId: string
  jobId: string
  video: VideoSummary
  analyzedAt: string
  sourceOrder: 'relevance' | 'time'
  collectionStatus: 'complete' | 'partial'
  warnings: ReportWarning[]
  collectedCount: number
  sampleSize: number
  excludedCounts: Record<ExcludeReason, number>
  sentimentCounts: Record<Sentiment, number>
  strengths: Insight[]
  improvements: Insight[]
  contentIdeas: Insight[]
  comments: AnalyzedComment[]
}
```

### 불변 조건
- `sampleSize + sum(excludedCounts) === collectedCount`.
- `sum(sentimentCounts) === sampleSize`.
- 모든 `evidenceCommentIds`는 같은 리포트의 포함된 댓글을 참조하고 중복되지 않는다.
- `collectionStatus=partial`이면 `warnings`에 중단 페이지와 정규화된 실패 원인이 존재한다.
- 표본이 10개 미만이면 `strengths`, `improvements`, `contentIdeas`는 비어 있어야 한다.
- 저장/로드/Worker 경계에서 런타임 validator로 불변 조건을 검사한다.

## 외부 API
- `videos.list`: 제목, 채널명, 썸네일과 기본 통계 조회
- `commentThreads.list`: 공개 상위 댓글 페이지네이션 수집
- API 어댑터 밖의 컴포넌트는 Google 응답 타입에 의존하지 않는다.
- 요청은 `AbortController`로 취소할 수 있어야 하며 재분석 시 이전 요청을 중단한다.
- `videos.list`: `part=snippet,statistics,status`, `id={videoId}`, 필요한 `fields`만 요청한다.
- `commentThreads.list`: `part=snippet`, `videoId`, `maxResults=100`, `order`, `textFormat=plainText`, 필요한 `fields`만 요청한다. 답글을 요청하지 않는다.
- 분석 한 건의 정상 quota 비용은 영상 조회 1 unit + 댓글 페이지당 1 unit으로 최대 4 unit이다. 실패/무효 요청도 quota를 소비할 수 있으므로 클라이언트 검증을 먼저 한다.
- API 키는 `VITE_YOUTUBE_API_KEY` 빌드 변수로 주입하고 `x-goog-api-key` 요청 헤더로 전달한다. URL/오류 로그에 키를 남기지 않는다.
- 키는 YouTube Data API만 허용하고 프로덕션/프리뷰/로컬 개발 키를 분리한다. 각 키에 정확한 HTTP referrer, 일일 quota와 사용량 알림을 설정한다.
- 이 구조는 키를 비밀로 만들지 못한다. 공개 배포 위험을 수용하지 못하거나 악용 방지가 제품 요구사항이면 API 프록시가 필요하므로 `서버 없음` 범위를 재결정해야 한다.

### 페이지네이션
```ts
for (let page = 1; page <= 3 && comments.length < 300; page++) {
  assertCurrentJob(jobId)
  const response = await fetchCommentPage({ pageToken, signal })
  appendUniqueByCommentId(response.items)
  emitProgress({ page, collectedCount: comments.length })
  if (!response.nextPageToken) break
  pageToken = response.nextPageToken
}
```
- API의 댓글 ID 중복은 ID로 제거하고 텍스트 중복은 분석 단계에서 별도로 제거한다.
- 빈 `items`에 `nextPageToken`이 반복되거나 같은 토큰이 재등장하면 무한 루프 방지를 위해 `PAGINATION_INVALID`로 중단한다.
- 부분 성공 후보는 첫 페이지 성공, 수집 30개 이상, 오류가 transient일 때만 만든다. 분석 후 유효 표본이 10개 미만이면 부분 리포트가 아니라 표본 부족 실패로 처리한다. 인증/키/잘못된 요청 오류는 부분 결과로 감추지 않는다.

### 요청 정책
- 페이지별 timeout 10초는 별도 `AbortController`와 사용자 취소 signal을 결합한다.
- 429와 5xx만 최대 2회 재시도한다. `Retry-After`가 유효하면 존중하고, 없으면 500ms/1,500ms full jitter backoff를 사용한다.
- 400, 키 관련 403, `commentsDisabled`, `quotaExceeded`, 404는 자동 재시도하지 않는다.
- 브라우저 `navigator.onLine`은 힌트로만 사용하고 실제 fetch 실패를 최종 근거로 삼는다.

## 분석 파이프라인
1. HTML 엔티티 제거, 공백 정리, URL/반복 문자 정규화
2. 정규화 텍스트 해시로 중복 제거, 링크 도배 등 단순 스팸 필터
3. 한국어/영어 감정 사전과 부정어/강조어 규칙으로 기본 점수 계산
4. 키워드와 구문 규칙으로 피드백 주제 다중 분류
5. 좋아요 수를 제한적으로 가중하되, 한 댓글이 결과를 지배하지 않도록 로그 가중치 적용
6. 언급량, 평균 감정 점수와 대표성을 기준으로 인사이트 순위화
7. 결정론적 문장 템플릿으로 총평, 강점, 개선점과 콘텐츠 아이디어 생성

MVP는 번들 크기와 초기 로딩 시간을 줄이기 위해 사전/규칙 기반 분석으로 시작한다. 모델 기반 분석을 추가할 경우 동일 인터페이스의 Web Worker 어댑터로 교체하고 최초 다운로드 크기와 진행률을 표시한다.

### 전처리 상세
- 원문 `displayText`와 분석용 `normalizedText`를 분리한다.
- Unicode NFKC, HTML entity decode, 제어/zero-width 문자 제거, 공백 병합을 순서대로 적용한다.
- URL, 이메일, `@mention`, 타임스탬프는 placeholder로 바꿔 분석 영향은 줄이되 원문은 변형하지 않는다.
- 반복 문자/이모지는 의미를 완전히 지우지 않도록 상한만 적용한다.
- 정규화 텍스트의 비암호학적 hash는 리포트 내부 중복 판정용이며 사용자 식별에 사용하지 않는다.

### 감정 분류
- 토큰/구문 극성 합계에 부정어 범위, 정도 부사, 접속사 전환(`하지만`, `but`)과 이모지 규칙을 적용한다.
- 양·음 점수가 모두 낮거나 차이가 임계값 미만이면 중립이다.
- 분류기는 `{label, score, confidence, ruleHits}`를 반환하되 UI에는 디버그 rule hit를 노출하지 않는다.
- 신뢰도는 확률로 표현하지 않고 규칙 일치의 상대적 지표로만 사용한다.

### 주제와 인사이트
- 주제는 다중 라벨이며 키워드 단독보다 구문/근접어 조합을 우선한다.
- 칭찬/불만/질문/요청 의도와 주제를 분리한다. 예: `음질이 좋아요`는 `audio + praise`다.
- 인사이트 후보는 `max(3, ceil(유효 표본 × 0.05))`개의 서로 다른 댓글을 충족해야 한다.
- 대표 댓글은 topic match, confidence, 제한된 `log1p(likeCount)`와 텍스트 정보량을 조합해 선정하고 같은 정규화 문구를 반복 노출하지 않는다.
- 출력 템플릿은 `topic × intent × language` 키로 관리하고 영상에서 관찰하지 않은 사실을 단정하지 않는다.

### Worker 프로토콜
```ts
type WorkerRequest =
  | { type: 'ANALYZE'; jobId: string; comments: RawComment[]; configVersion: string }
  | { type: 'CANCEL'; jobId: string }

type WorkerResponse =
  | { type: 'PROGRESS'; jobId: string; stage: AnalysisStage; processed: number; total: number }
  | { type: 'RESULT'; jobId: string; payload: AnalysisPayload }
  | { type: 'ERROR'; jobId: string; code: 'WORKER_INIT_FAILED' | 'ANALYSIS_FAILED' }
  | { type: 'CANCELLED'; jobId: string }
```
- 구조화 복사 비용을 제한하기 위해 필요한 필드만 Worker에 전달한다.
- Worker crash 시 새 Worker로 한 번만 재시도한다. 같은 payload가 재실패하면 무한 재생성하지 않는다.

## 상태 관리
- 분석 화면 상태는 `useReducer`의 명시적 상태 머신으로 관리한다.
- 상태: `idle → validating → fetching-video → fetching-comments → analyzing → building-report → success | partial-success | empty | error | cancelled`.
- reducer는 허용된 전이만 수용한다. 예전 job의 action, terminal 상태 뒤의 progress와 중복 submit은 무시한다.
- 서버 상태 라이브러리는 사용하지 않는다. API 호출은 한 번의 사용자 작업에 종속되고 캐시가 필요하지 않다.
- 분석 결과만 저장하며 API 키와 진행 중 상태는 저장하지 않는다.

## 오류 처리
- `INVALID_URL`: 지원 형식과 예시 제공
- `VIDEO_NOT_FOUND`: 삭제/비공개 가능성 안내
- `COMMENTS_DISABLED`: 댓글이 비활성화된 영상임을 안내
- `QUOTA_EXCEEDED`: 운영자 할당량 소진 안내와 재시도 대신 명확한 상태 제공
- `NETWORK_ERROR`: 연결 확인과 재시도 제공
- `NO_COMMENTS`: 분석 불가 이유를 설명하고 다른 영상 입력 제공

### 정규화된 오류 모델
```ts
interface AppError {
  code: AppErrorCode
  kind: 'validation' | 'configuration' | 'permission' | 'quota' | 'network' | 'upstream' | 'analysis' | 'storage'
  retryable: boolean
  stage: AppStage
  httpStatus?: number
  upstreamReason?: string
  diagnosticId: string
  safeContext?: { page?: number; collectedCount?: number }
  cause?: unknown // 메모리 전용, UI/저장/외부 로그 금지
}
```

### API 오류 매핑
| HTTP / upstream reason | AppErrorCode | retry | 처리 |
|---|---|---:|---|
| 400 `invalidParameter`, `invalidPageToken` | `INVALID_API_REQUEST` | 아니오 | 개발 오류/새 분석 안내 |
| 400 `processingFailure` | `UPSTREAM_PROCESSING_FAILURE` | 조건부 | 첫 페이지면 실패, 후속 페이지면 부분 성공 가능 |
| 401 | `API_KEY_INVALID` | 아니오 | 운영 설정 오류 |
| 403 `commentsDisabled` | `COMMENTS_DISABLED` | 아니오 | 다른 영상 입력 |
| 403 `quotaExceeded` | `QUOTA_EXCEEDED` | 아니오 | 자동 재시도 금지 |
| 403 `forbidden` | `API_FORBIDDEN` | 아니오 | 키/referrer/API 설정 또는 접근 불가로 중립 안내 |
| 404 `videoNotFound` 또는 videos 빈 items | `VIDEO_NOT_FOUND` | 아니오 | 비공개/삭제로 단정하지 않음 |
| 429 | `RATE_LIMITED` | 예 | Retry-After/backoff |
| 500/502/503/504 | `YOUTUBE_UNAVAILABLE` | 예 | 제한 재시도 |
| fetch `AbortError` + 사용자 취소 | `CANCELLED` | 아니오 | 오류 UI/telemetry 제외 |
| timeout | `REQUEST_TIMEOUT` | 예 | 단계와 페이지 보존 |
| offline/CORS/DNS/TypeError | `NETWORK_ERROR` | 예 | 브라우저가 원인을 구분하지 못할 수 있음을 반영 |

- 사용자 메시지는 upstream 원문을 그대로 노출하지 않고 code별 안전한 카피를 사용한다.
- 진단 ID는 `crypto.randomUUID()`로 로컬 생성하며 사용자 데이터가 아니다.
- 예상하지 못한 오류는 `UNKNOWN_ERROR`로 Error Boundary/최상위 orchestrator에서 포착한다.

## 보안과 개인정보
- 댓글 데이터는 YouTube에서 브라우저로 직접 전달되고 앱 서버로 전송하지 않는다.
- 댓글 작성자 이름, 프로필 이미지와 채널 ID는 분석/저장하지 않는다.
- 댓글 원문을 HTML로 삽입하지 않고 React 텍스트 노드로 렌더링한다.
- API 키를 코드에 하드코딩하지 않는다. 배포 환경 변수와 Google Cloud 제한을 사용한다.
- `dangerouslySetInnerHTML`을 금지하고 YouTube에 `textFormat=plainText`를 요청한다.
- Content Security Policy는 최소 `default-src 'self'; script-src 'self'; connect-src 'self' https://www.googleapis.com; img-src 'self' https://i.ytimg.com data:`를 출발점으로 배포 환경에 맞게 검증한다.
- source map 공개 여부를 검토하되 source map을 숨기는 것을 키 보호 수단으로 간주하지 않는다.
- 의존성은 lockfile로 고정하고 정기적으로 취약점과 라이선스를 점검한다.
- 오류/진단 데이터에는 API 키, 전체 URL query, 댓글, 영상 제목을 포함하지 않는다.

## 저장 설계와 마이그레이션
- key: `comment-lens:reports:v1`; 별도 key `comment-lens:settings:v1`에는 정렬 선호만 저장한다.
- JSON parse 후 스키마/불변 조건을 검증하고 실패 항목만 제거한다.
- 쓰기는 새 배열을 메모리에서 완성한 뒤 한 번의 `setItem`으로 수행한다.
- 5개 초과 또는 용량 초과 시 오래된 리포트부터 제거하고 한 번 재시도한다.
- schema migration이 없으면 구버전 항목을 조용히 삭제하지 않고 `저장된 리포트를 열 수 없음`과 삭제 선택지를 제공한다.
- 여러 탭의 `storage` 이벤트를 수신해 최근 목록을 갱신하되 진행 중 분석에는 영향을 주지 않는다.

## 관측성과 개인정보 없는 진단
- 자체 서버가 없으므로 운영 telemetry는 MVP에서 수집하지 않는다.
- 개발 모드에서만 상태 전이, 오류 code, 소요 시간, 수집/유효 개수를 console debug로 출력하며 댓글/URL/API 키는 제외한다.
- 사용자에게 복사 가능한 진단 정보는 앱 버전, 분석 버전, 오류 code, stage, diagnostic ID만 포함한다.
- 성능 기준은 자동화된 fixture benchmark와 브라우저 Performance API의 로컬 측정으로 검증한다.

## 테스트 전략
- URL 파서, 정규화, 감정 점수, 주제 분류와 리포트 집계를 단위 테스트한다.
- YouTube API는 고정 fixture로 계약 테스트하고 실제 API를 CI에서 호출하지 않는다.
- 핵심 흐름과 모든 오류 상태를 컴포넌트 테스트한다.
- URL 입력부터 리포트 표시까지 한 개의 브라우저 E2E 시나리오를 유지한다.

### 테스트 매트릭스
- URL property/fuzz 테스트: 허용 host/path, Unicode/공백, 중첩 URL, 악성 scheme, 매우 긴 입력.
- API adapter: 0/1/100/101/299/300개, 마지막 페이지 없음, 중복 ID, 반복 token, malformed JSON, schema drift.
- 오류: 모든 매핑 표 항목, Retry-After, timeout과 사용자 취소 race, 1페이지 이후 부분 실패.
- 분석: 한/영, 혼합 언어, 이모지, 부정어, 반전 접속사, 욕설 감탄, 중복, 스팸, 타임스탬프만 있는 댓글.
- 집계 property 테스트: 카운트 불변 조건, 100% 반올림, evidence 참조 무결성, 최소 표본/언급 임계값.
- 저장: invalid JSON, 구버전, quota 초과, storage access exception, 다중 탭 갱신.
- UI: 모든 상태, aria-live, focus, keyboard, 360px/200% zoom, reduced motion, print CSS.
- race: 빠른 연속 submit, 분석 중 URL 변경, Worker 결과와 취소 동시 도착, unmount 후 응답.

## 빌드·배포 체크리스트
- 환경 변수 미설정 시 빌드 또는 시작 시 명확히 실패하고 빈 키로 API를 호출하지 않는다.
- 프로덕션 key의 API 제한, referrer, quota alert와 키 교체 절차를 확인한다.
- HTTPS, 보안 헤더(CSP, Referrer-Policy, X-Content-Type-Options)와 SPA fallback을 확인한다.
- preview 도메인이 프로덕션 키에 무제한으로 허용되지 않도록 별도 키를 사용한다.
- fixture 테스트, typecheck, lint, unit/component/E2E, bundle budget, 접근성 검사를 배포 gate로 둔다.
- 롤백은 이전 정적 asset 배포로 수행하며 저장 schema의 하위 호환 여부를 확인한다.

## 공식 근거 문서
- [YouTube `commentThreads.list`](https://developers.google.com/youtube/v3/docs/commentThreads/list): 요청당 1 quota unit, 페이지당 최대 100개, 정렬·plain text·페이지 토큰과 `commentsDisabled` 등 오류 정의
- [YouTube `videos.list`](https://developers.google.com/youtube/v3/docs/videos/list): 요청당 1 quota unit, 영상 ID 조회와 `videoNotFound` 정의
- [YouTube Data API 오류](https://developers.google.com/youtube/v3/docs/errors): 공통 HTTP 상태와 `reason` 정의
- [YouTube API quota](https://developers.google.com/youtube/v3/getting-started#quota): 무효 요청도 최소 quota를 소비한다는 운영 제약
- [Google Cloud API key 관리](https://docs.cloud.google.com/docs/authentication/api-keys): HTTP referrer와 API 제한 설정
- [Google Cloud API key 보안 권고](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices): 키를 query string 대신 헤더로 전달하고 노출·회전·모니터링 위험 관리
- [YouTube API 개발자 정책](https://developers.google.com/youtube/terms/developer-policies): 공개 출시 전 준수해야 할 정책 기준
