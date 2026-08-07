# Step 5: sentiment-analysis

## 읽어야 할 파일
- `/docs/PRD.md`의 분석 품질 요구사항
- `/docs/ARCHITECTURE.md`의 감정 분류
- `/src/features/sentiment/preprocess.ts`, `/src/types`, `/src/config`

## 작업
고정 평가 fixture와 단위 테스트를 먼저 작성하고 `src/features/sentiment/analyze.ts`, 한국어/영어 lexicon과 규칙을 구현하라. 공개 함수는 정규화 댓글에서 `{ label, score, confidence, ruleHits }`를 결정론적으로 반환해야 한다.

긍정/부정 어휘, 부정어 scope, 정도 부사, 반전 접속사, 이모지, 혼합 감정을 처리하라. 점수 차이가 임계값 미만이면 중립으로 분류하라. 욕설만으로 부정을 확정하지 말고 반어법은 한계로 남겨라. fixture에 명확한 긍정/중립/부정과 오판하기 쉬운 사례를 포함하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
고정 fixture의 평가 리포트와 모든 단위 테스트를 실행하고 index step 5를 갱신하라.

## 금지사항
- confidence를 통계적 확률이라고 표시하지 마라.
- 원격 모델/API를 추가하지 마라.
- 평가 fixture를 통과시키기 위해 개별 문장 전체를 하드코딩하지 마라.
