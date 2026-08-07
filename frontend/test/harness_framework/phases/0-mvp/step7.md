# Step 7: report-builder

## 읽어야 할 파일
- `/docs/PRD.md`의 자동 리포트, 품질 기준, 용어
- `/docs/ARCHITECTURE.md`의 불변 조건과 인사이트 규칙
- `/src/features/sentiment`, `/src/features/topics`, `/src/types`, `/src/config`

## 작업
테스트를 먼저 작성하고 `src/features/report/build.ts`, `templates.ts`, `rounding.ts`를 구현하라. 전처리·감정·주제 결과를 `AnalysisReport`로 집계하고 수집/유효/제외 카운트 불변 조건을 지켜라. 표시 비율은 largest-remainder 방식으로 합계 100을 보장하라.

유효 표본 10개 미만에서는 순위형 인사이트를 만들지 말고, 각 인사이트는 `max(3, ceil(sampleSize*0.05))`의 서로 다른 근거를 요구하라. 강점/개선점/콘텐츠 아이디어를 최대 3개 생성하고 evidence ID를 검증하라. 좋아요는 감정 비율이 아닌 대표 댓글 순위에 제한된 log 가중치로만 사용하라. 안전 플래그 댓글은 대표 근거에서 제외하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
0/9/10/59/60/300 표본, 반올림, 근거 임계값, 중복 evidence, 부분 경고와 결정론성을 검증하고 index step 7을 갱신하라.

## 금지사항
- 근거 없는 인사이트나 영상 자체를 봤다는 표현을 생성하지 마라.
- 좋아요로 감정 카운트를 가중하지 마라.
