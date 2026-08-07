# Step 3: youtube-api

## 읽어야 할 파일
- `/docs/ARCHITECTURE.md`의 외부 API, 페이지네이션, 요청·오류 정책
- `/docs/PRD.md`의 오류 표
- `/src/types`, `/src/config`, `/src/features/youtube/url.ts`

## 작업
테스트를 먼저 작성하고 `src/features/youtube/api.ts`, `errors.ts`, `schemas.ts`에 fetch 주입 가능한 YouTube adapter를 구현하라. 영상은 `videos.list`, 댓글은 `commentThreads.list`를 사용하고 필요한 fields만 요청하라. 댓글 요청은 `maxResults=100`, `textFormat=plainText`, 명시적 `order`로 최대 3페이지/300개를 수집하라.

API 키는 환경 설정에서 읽어 `x-goog-api-key` 헤더로 전달하고 URL이나 오류에 포함하지 마라. timeout, 사용자 AbortSignal, 반복 page token 탐지, ID 중복 제거, 수집 progress callback을 제공하라. 429/5xx만 Retry-After 또는 jitter backoff로 최대 2회 재시도하고 공식 reason을 AppError로 매핑하라. 테스트는 fake fetch/fake timer만 사용하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
0/1/100/101/300개, malformed response, commentsDisabled, quota, forbidden, not found, 429, 5xx, timeout, cancel, 반복 token을 검증하고 index step 3을 갱신하라.

## 금지사항
- 실제 YouTube API를 테스트에서 호출하지 마라.
- 400/401/403/404를 자동 재시도하지 마라.
- API 키를 localStorage, query string, console에 기록하지 마라.
