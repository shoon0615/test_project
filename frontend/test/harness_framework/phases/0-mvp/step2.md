# Step 2: youtube-url

## 읽어야 할 파일
- `/docs/PRD.md`의 URL 요구사항
- `/docs/ARCHITECTURE.md`
- `/src/types`, `/src/config`

## 작업
테스트를 먼저 작성하고 `src/features/youtube/url.ts`에 순수 URL parser를 구현하라. 인터페이스는 `parseYouTubeUrl(input: string): Result<ParsedYouTubeUrl, UrlParseError>` 형태로 명시적인 성공/실패를 반환하라.

일반, 단축, Shorts, mobile, music, live URL과 불필요한 query를 지원하라. playlist에 `v`가 있으면 영상 하나만 반환하라. 빈 값, 2,048자 초과, 채널/검색/playlist-only/studio URL, 임의 host, credential/port 혼입, 중첩 URL, 악성 scheme과 11자가 아닌 ID를 거부하라. 입력 문자열을 HTML로 다루지 마라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
테이블 테스트와 fuzz/property 성격의 변형 테스트를 실행하고 index step 2를 갱신하라.

## 금지사항
- 정규식 하나로 전체 URL을 느슨하게 허용하지 마라. URL API로 host/path를 검증해야 한다.
- URL 제출만으로 API 요청을 발생시키지 마라.
