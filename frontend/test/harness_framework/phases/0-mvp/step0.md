# Step 0: project-setup

## 읽어야 할 파일
- `/CLAUDE.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`

## 작업
프로젝트 루트에 Vite + React + TypeScript strict mode 애플리케이션을 구성하라. Tailwind CSS, Vitest, React Testing Library, jsdom, ESLint를 설치·설정하고 `src/app`, `src/components`, `src/features`, `src/workers`, `src/storage`, `src/config`, `src/observability`, `src/types`, `src/test` 구조를 준비하라. 최소 App smoke test를 테스트 먼저 작성하라.

`package.json`에 `dev`, `build`, `typecheck`, `lint`, `test`, `test:run` 스크립트를 제공하라. `.env.example`에는 빈 `VITE_YOUTUBE_API_KEY`와 공개 키 제한 주석만 넣고 실제 키는 넣지 마라. 앱은 키 없이도 빌드되어야 한다.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
AC 실행 후 구조와 strict 설정을 확인하고 성공 시 index의 step 0을 completed와 한 줄 summary로 갱신하라. 3회 실패 시 error, 사용자 개입이 필요하면 blocked로 기록하라.

## 금지사항
- Next.js나 서버/API route를 추가하지 마라. 정적 SPA 범위를 유지해야 한다.
- 실제 API 키, 외부 telemetry 또는 분석 기능을 아직 구현하지 마라.
- 기존 하네스 스크립트와 문서를 삭제하지 마라.
