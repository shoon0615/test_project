# Step 4: comment-preprocessing

## 읽어야 할 파일
- `/docs/PRD.md`의 브라우저 분석과 에지 케이스
- `/docs/ARCHITECTURE.md`의 전처리 상세
- `/src/types`, `/src/config`

## 작업
테스트를 먼저 작성하고 `src/features/sentiment/preprocess.ts`와 관련 fixture를 구현하라. 원문 표시 텍스트와 분석용 normalized text를 분리하고 Unicode NFKC, entity decode, 제어/zero-width 제거, 공백과 반복 문자 제한을 결정론적으로 수행하라. URL, 이메일, mention, timestamp는 placeholder 처리하라.

한국어/영어/혼합/미지원/불명 언어의 가벼운 판별, 정규화 hash 중복 제거, 링크 도배/반복 스팸, 짧은 텍스트, 분석 가능 문자 없음 제외 사유를 구현하라. 이모지만 있는 댓글은 지원 이모지가 있을 때 보존하라. 작성자 식별자는 받거나 생성하지 마라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
한/영/혼합, HTML entity, emoji, zero-width, URL-only, timestamp-only, duplicate, spam fixture를 검증하고 index step 4를 갱신하라.

## 금지사항
- 원문을 정규화 결과로 덮어쓰지 마라.
- hash를 사용자 식별이나 영구 추적에 사용하지 마라.
