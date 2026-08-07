# Step 8: analysis-worker

## 읽어야 할 파일
- `/docs/ARCHITECTURE.md`의 Worker 프로토콜
- `/src/features/sentiment`, `/src/features/topics`, `/src/features/report`
- `/src/types`, `/src/config`

## 작업
테스트를 먼저 작성하고 `src/workers/analysis.worker.ts`와 `client.ts`를 구현하라. `ANALYZE`, `CANCEL` 요청과 `PROGRESS`, `RESULT`, `ERROR`, `CANCELLED` 응답을 런타임 검증하며 모든 메시지에 jobId를 포함하라. 전처리→감정→주제→리포트 후보 파이프라인을 Worker에서 실행하라.

메인 스레드 client는 progress callback, AbortSignal, stale job 폐기, Worker crash 시 1회 재생성을 제공하라. 테스트는 fake Worker 단위 테스트와 실제 Worker 로직을 직접 호출하는 통합 테스트로 구성하라. 필요한 댓글 필드만 전달하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
progress, cancel/result race, stale message, malformed message, crash/retry/repeated crash를 검증하고 index step 8을 갱신하라.

## 금지사항
- CPU 분석을 UI 컴포넌트나 메인 스레드 반복문으로 옮기지 마라.
- Worker를 무한 재생성하지 마라.
