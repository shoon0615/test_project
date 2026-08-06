# 프로젝트: Comment Lens

## 기술 스택
- Vite + React + TypeScript strict mode
- Tailwind CSS
- Vitest + React Testing Library
- 정적 SPA, Web Worker 기반 브라우저 분석

## 아키텍처 규칙
- CRITICAL: 자체 백엔드, 데이터베이스, 로그인 기능을 추가하지 않는다.
- CRITICAL: 댓글 원문과 분석 결과를 외부 AI/분석 서비스로 전송하지 않는다.
- CRITICAL: YouTube API 키를 소스에 하드코딩하지 않는다. `VITE_YOUTUBE_API_KEY`로 주입하고 공개 키라는 전제하에 referrer/API/할당량 제한을 문서화한다.
- CRITICAL: 모든 인사이트는 언급량 또는 대표 댓글을 근거로 가져야 한다. 근거가 부족하면 임의로 문장을 생성하지 않는다.
- CRITICAL: PRD의 최소 표본, 부분 성공, 오류 재시도 정책을 UI 편의를 이유로 우회하지 않는다.
- Google API 응답은 `features/youtube`에서 도메인 타입으로 변환하고 UI가 외부 응답 구조에 직접 의존하지 않게 한다.
- CPU 집약적 댓글 분석은 Web Worker에서 실행한다.
- 모든 비동기 API/Worker 작업에 `jobId`를 사용하고 취소되거나 오래된 작업의 결과를 폐기한다.
- 외부 API 응답, Worker 메시지와 localStorage 데이터는 런타임 검증 후 사용한다.
- 댓글 작성자의 이름, 프로필 이미지, 채널 ID를 저장하거나 민감 속성을 추론하지 않는다.
- 컴포넌트는 표현에 집중하고 URL 파싱, 분석, 집계와 저장 로직은 각각 독립된 순수 모듈로 둔다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 테스트를 먼저 작성하고 테스트가 통과하는 구현을 작성한다(TDD).
- 실제 YouTube API를 테스트에서 호출하지 않고 고정 fixture와 mock adapter를 사용한다.
- URL 오류, 댓글 비활성화, 댓글 없음, 할당량 초과, 네트워크 오류 상태를 정상 흐름과 함께 테스트한다.
- 429/5xx 제한 재시도, 중간 페이지 부분 성공, 취소 race와 손상된 localStorage를 반드시 테스트한다.
- 커밋 메시지는 conventional commits 형식을 따른다(`feat:`, `fix:`, `docs:`, `refactor:`).

## 접근성 및 UI 규칙
- 키보드만으로 URL 입력, 분석 시작, 오류 복구와 리포트 탐색이 가능해야 한다.
- 색상만으로 감정을 구분하지 않고 라벨과 수치를 병기한다.
- 실제로 알 수 없는 분석 진행률을 가짜 백분율로 표현하지 않는다.
- 사용자 댓글은 HTML로 삽입하지 않고 텍스트로 렌더링한다.

## 명령어
```bash
npm run dev
npm run build
npm run lint
npm run test
```
