# Step 10: analysis-orchestrator

## 읽어야 할 파일
- `/docs/PRD.md`의 상태별 화면과 부분 성공 기준
- `/docs/ARCHITECTURE.md`의 상세 시퀀스, 상태 관리, 오류 처리
- `/src/features/youtube`, `/src/workers`, `/src/storage`, `/src/types`

## 작업
테스트를 먼저 작성하고 `src/features/analysis/reducer.ts`, `orchestrator.ts`, React hook adapter를 구현하라. 명시된 상태 전이만 허용하고 submit마다 jobId와 abort controller를 생성하라. 영상 조회→댓글 수집→Worker 분석→리포트 검증→저장을 연결하라.

중복 submit을 병합하고 다른 입력은 이전 API/Worker를 취소하라. stale result와 terminal 뒤 progress를 무시하라. 후속 페이지 transient 실패 시 수집 30개 이상인 후보만 Worker로 보내고, 유효 표본 10개 이상일 때 partial-success로 확정하라. 저장 실패는 success와 비차단 warning을 함께 반환하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
정상/empty/error/partial/cancel, 연속 submit, URL 변경, late response, 저장 실패와 illegal transition을 검증하고 index step 10을 갱신하라.

## 금지사항
- 외부 응답 구조를 reducer/UI에 노출하지 마라.
- 모든 403이나 네트워크 실패를 같은 메시지로 뭉개지 마라.
