# Step 11: analysis-ui

## 읽어야 할 파일
- `/docs/UI_GUIDE.md`
- `/docs/PRD.md`의 상태별 화면과 오류 표
- `/src/features/analysis`, `/src/features/youtube/url.ts`, `/src/storage`

## 작업
컴포넌트 테스트를 먼저 작성하고 URL 입력, 영상 요약, 최근 리포트, 5단계 진행 상태, 취소, empty/error/cancelled/partial warning UI를 구현하라. 실제 label, Enter 제출, aria-live, 키보드 focus와 2,048자 제한을 지원하라.

붙여넣기만으로 요청하지 말고 명시적 submit만 허용하라. 오류 code별 안전한 메시지와 retryable일 때만 재시도 버튼을 제공하라. API 키 미설정은 시작 전에 운영 설정 오류로 표시하되 앱 렌더와 저장 리포트 열기는 가능해야 한다. 썸네일 실패 시 placeholder를 사용하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
키보드 제출, invalid URL, 모든 상태, 취소, retry 여부, aria-live, API 키 누락을 테스트하고 index step 11을 갱신하라.

## 금지사항
- 오류를 toast로만 표시하거나 가짜 진행 백분율을 만들지 마라.
- 댓글/제목에 dangerouslySetInnerHTML을 사용하지 마라.
- 리포트 상세 UI를 이 step에서 구현하지 마라.
