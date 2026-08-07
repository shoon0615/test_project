# Step 14: integration-tests

## 읽어야 할 파일
- `/CLAUDE.md`
- `/docs/PRD.md`의 출시 수용 기준
- `/docs/ARCHITECTURE.md`의 테스트·배포 체크리스트
- `/src`와 기존 전체 테스트

## 작업
새 기능을 추가하지 말고 MVP 전체 흐름의 빠진 검증과 결함을 보완하라. fake YouTube adapter/Worker/storage를 사용해 URL 제출→영상 확인→댓글 progress→분석→리포트, partial success, comments disabled, quota, 429/5xx retry, timeout, cancel race, stale job, storage failure의 통합 테스트를 작성하라.

환경 설정 검증, production build, bundle 구조, CSP/보안 헤더 배포 문서, `.env.example`, README 실행/Google Cloud 키 제한/분석 한계/테스트 지침을 완성하라. 코드와 테스트를 PRD acceptance checklist에 대조하고 발견한 결함만 수정하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
전체 AC를 깨끗한 상태에서 실행하고 PRD 출시 체크리스트를 수동 대조하라. 모두 통과하면 index step 14를 completed와 최종 산출물 summary로 갱신하라.

## 금지사항
- 실제 YouTube API 또는 실제 API 키를 CI/테스트에서 사용하지 마라.
- 범위를 채널 비교, 로그인, 서버, 외부 LLM으로 확장하지 마라.
- 실패 테스트를 skip하거나 assertion을 약화해 통과시키지 마라.
