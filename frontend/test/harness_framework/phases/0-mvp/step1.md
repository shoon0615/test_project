# Step 1: domain-types

## 읽어야 할 파일
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/src/`의 Step 0 산출물

## 작업
테스트를 먼저 작성하고 `src/types`, `src/config`에 핵심 도메인 계약을 구현하라. `RawComment`, `AnalyzedComment`, `VideoSummary`, `Insight`, `AnalysisReport`, `AppError`, `AppErrorCode`, `AnalysisState`, `ReportWarning`, `ExcludeReason`, Worker request/response 타입을 ARCHITECTURE와 일치시켜라.

분석 버전, 스키마 버전, 300개 제한, 페이지 크기, 최소 표본, 최소 근거 함수, timeout/retry 상수를 중앙화하라. 외부/저장/Worker 경계에서 사용할 런타임 validator를 구현하고 리포트 카운트 및 evidence 참조 불변 조건을 검증하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
유효/손상 리포트 fixture와 최소 근거 계산 테스트를 확인하고 index step 1 상태를 갱신하라.

## 금지사항
- `any` 또는 무검증 type assertion으로 경계 데이터를 신뢰하지 마라.
- 외부 validation 라이브러리를 불필요하게 추가하지 마라.
- API 호출이나 UI를 구현하지 마라.
