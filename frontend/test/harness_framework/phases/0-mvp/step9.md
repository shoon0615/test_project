# Step 9: report-storage

## 읽어야 할 파일
- `/docs/PRD.md`의 결과 보존 요구사항
- `/docs/ARCHITECTURE.md`의 저장 설계와 마이그레이션
- `/src/types`, `/src/config`의 validator와 version

## 작업
테스트를 먼저 작성하고 `src/storage/reports.ts`, `settings.ts`를 구현하라. `comment-lens:reports:v1`에 최근 5개 리포트를 최신순으로 저장하고 대표 댓글 이외의 원문은 영구 저장하지 마라. 읽을 때 JSON, schema와 불변 조건을 검증하고 손상 항목만 격리하라.

QuotaExceededError이면 오래된 항목 제거 후 한 번 재시도하고, 접근 차단/private mode/재실패는 비차단 StorageResult 오류로 반환하라. 개별/전체 삭제와 storage event 기반 목록 갱신 adapter를 제공하라. 설정에는 정렬 선호만 저장하고 API 키는 절대 저장하지 마라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
정상 roundtrip, 5개 제한, invalid JSON, 혼합 손상, 구버전, quota, access exception, 다중 탭 event를 검증하고 index step 9를 갱신하라.

## 금지사항
- 저장 실패를 throw하여 분석 성공을 실패로 바꾸지 마라.
- API 키나 작성자 식별정보를 저장하지 마라.
