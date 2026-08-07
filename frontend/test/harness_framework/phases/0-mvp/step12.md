# Step 12: report-ui

## 읽어야 할 파일
- `/docs/UI_GUIDE.md`
- `/docs/PRD.md`의 자동 리포트와 용어
- `/src/types`, `/src/features/report`, `/src/components/analysis`

## 작업
컴포넌트 테스트를 먼저 작성하고 리포트 UI를 구현하라. 한 줄 총평, 수집/유효/제외/정렬/버전 기준, 텍스트 대체가 있는 100% 누적 감정 막대, 강점, 개선점과 권장 행동, 주요 주제, 콘텐츠 아이디어, 대표 댓글을 표시하라.

모든 인사이트에 mention count와 evidence를 연결하라. 부분 성공/표본 부족/지원 언어 부족을 숨기지 말고 빈 섹션을 허위 placeholder로 채우지 마라. 대표 댓글 작성자 정보는 표시하지 않고 안전한 텍스트 노드로 렌더링하라. 다른 영상 분석과 인쇄 버튼을 연결하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
정상/partial/표본 부족, 100% 합계, evidence, 긴 댓글, 빈 optional section과 안전 렌더를 테스트하고 index step 12를 갱신하라.

## 금지사항
- 차트 색만으로 감정을 구분하지 마라.
- 근거가 없는 점수, 원형 게이지나 AI 배지를 추가하지 마라.
