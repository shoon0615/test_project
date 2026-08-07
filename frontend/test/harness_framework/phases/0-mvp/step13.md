# Step 13: accessibility-print

## 읽어야 할 파일
- `/docs/UI_GUIDE.md` 전체
- `/docs/PRD.md`의 접근성·호환성 요구사항
- `/src/components`, `/src/app`의 현재 UI

## 작업
테스트 가능한 부분을 먼저 작성하고 전체 UI를 360px 모바일부터 max-w-6xl 데스크톱까지 다듬어라. 시스템 폰트, 명시된 색상/간격/타입 스케일을 적용하고 200% zoom, keyboard focus, high contrast, reduced-motion을 지원하라.

인쇄 stylesheet에서 header/input/actions/progress를 숨기고 분석 기준과 partial warning을 유지하며 카드에 `break-inside: avoid`를 적용하라. semantic landmark와 heading 순서, form label, accessible names, chart text alternative를 감사하라.

## Acceptance Criteria
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```

## 검증 절차
접근성 테스트, DOM heading/landmark, reduced motion class, print stylesheet 존재를 검증하고 index step 13을 갱신하라.

## 금지사항
- glass morphism, gradient text/orb, 보라색 AI 팔레트, glow를 추가하지 마라.
- outline을 동등한 focus-visible 대안 없이 제거하지 마라.
