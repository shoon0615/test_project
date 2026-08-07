# Step 6: topic-analysis

## 읽어야 할 파일
- `/docs/PRD.md`의 피드백 카테고리
- `/docs/ARCHITECTURE.md`의 주제와 인사이트
- `/src/features/sentiment`와 `/src/types`

## 작업
테스트를 먼저 작성하고 `src/features/topics/analyze.ts`와 버전 관리되는 한국어/영어 규칙을 구현하라. `content`, `delivery`, `editing`, `audio`, `pace`, `captions`, `correction`, `follow-up` 주제를 다중 라벨로 분류하고 `praise`, `complaint`, `question`, `request` 의도를 별도로 반환하라.

단일 키워드 오탐을 줄이기 위해 구문과 근접어 조합을 우선하고, 하나의 댓글이 여러 주제/의도를 가질 수 있게 하라. 개인 공격·혐오·민감정보 가능성을 대표 댓글 필터가 사용할 안전 플래그로 반환하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
각 주제의 양성/음성 fixture, 다중 라벨, 질문과 요청 구분, 안전 플래그를 검증하고 index step 6을 갱신하라.

## 금지사항
- 욕설 또는 부정 감정만으로 개선 주제를 만들지 마라.
- 작성자의 민감 속성을 추론하지 마라.
