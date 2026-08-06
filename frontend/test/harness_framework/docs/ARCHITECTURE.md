# 아키텍처

## 시스템 경계
Comment Lens는 React 정적 SPA다. 자체 서버와 데이터베이스는 없으며 YouTube Data API 호출, 댓글 분석, 리포트 생성과 보존을 모두 브라우저에서 수행한다.

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
  topics: FeedbackTopic[]
  excludedReason?: 'duplicate' | 'spam' | 'too-short'
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
  video: VideoSummary
  analyzedAt: string
  sampleSize: number
  sentimentCounts: Record<Sentiment, number>
  strengths: Insight[]
  improvements: Insight[]
  contentIdeas: Insight[]
  comments: AnalyzedComment[]
}
```

## 외부 API
- `videos.list`: 제목, 채널명, 썸네일과 기본 통계 조회
- `commentThreads.list`: 공개 상위 댓글 페이지네이션 수집
- API 어댑터 밖의 컴포넌트는 Google 응답 타입에 의존하지 않는다.
- 요청은 `AbortController`로 취소할 수 있어야 하며 재분석 시 이전 요청을 중단한다.
- API 키는 `VITE_YOUTUBE_API_KEY` 빌드 변수로 주입한다. 이는 비밀 저장 방식이 아니므로 referrer/API/할당량 제한을 배포 전 필수로 설정한다.

## 분석 파이프라인
1. HTML 엔티티 제거, 공백 정리, URL/반복 문자 정규화
2. 정규화 텍스트 해시로 중복 제거, 링크 도배 등 단순 스팸 필터
3. 한국어/영어 감정 사전과 부정어/강조어 규칙으로 기본 점수 계산
4. 키워드와 구문 규칙으로 피드백 주제 다중 분류
5. 좋아요 수를 제한적으로 가중하되, 한 댓글이 결과를 지배하지 않도록 로그 가중치 적용
6. 언급량, 평균 감정 점수와 대표성을 기준으로 인사이트 순위화
7. 결정론적 문장 템플릿으로 총평, 강점, 개선점과 콘텐츠 아이디어 생성

MVP는 번들 크기와 초기 로딩 시간을 줄이기 위해 사전/규칙 기반 분석으로 시작한다. 모델 기반 분석을 추가할 경우 동일 인터페이스의 Web Worker 어댑터로 교체하고 최초 다운로드 크기와 진행률을 표시한다.

## 상태 관리
- 분석 화면 상태는 `useReducer`의 명시적 상태 머신으로 관리한다.
- 상태: `idle → validating → fetching → analyzing → success | error`.
- 서버 상태 라이브러리는 사용하지 않는다. API 호출은 한 번의 사용자 작업에 종속되고 캐시가 필요하지 않다.
- 분석 결과만 저장하며 API 키와 진행 중 상태는 저장하지 않는다.

## 오류 처리
- `INVALID_URL`: 지원 형식과 예시 제공
- `VIDEO_NOT_FOUND`: 삭제/비공개 가능성 안내
- `COMMENTS_DISABLED`: 댓글이 비활성화된 영상임을 안내
- `QUOTA_EXCEEDED`: 운영자 할당량 소진 안내와 재시도 대신 명확한 상태 제공
- `NETWORK_ERROR`: 연결 확인과 재시도 제공
- `NO_COMMENTS`: 분석 불가 이유를 설명하고 다른 영상 입력 제공

## 보안과 개인정보
- 댓글 데이터는 YouTube에서 브라우저로 직접 전달되고 앱 서버로 전송하지 않는다.
- 댓글 작성자 이름, 프로필 이미지와 채널 ID는 분석/저장하지 않는다.
- 댓글 원문을 HTML로 삽입하지 않고 React 텍스트 노드로 렌더링한다.
- API 키를 코드에 하드코딩하지 않는다. 배포 환경 변수와 Google Cloud 제한을 사용한다.

## 테스트 전략
- URL 파서, 정규화, 감정 점수, 주제 분류와 리포트 집계를 단위 테스트한다.
- YouTube API는 고정 fixture로 계약 테스트하고 실제 API를 CI에서 호출하지 않는다.
- 핵심 흐름과 모든 오류 상태를 컴포넌트 테스트한다.
- URL 입력부터 리포트 표시까지 한 개의 브라우저 E2E 시나리오를 유지한다.
