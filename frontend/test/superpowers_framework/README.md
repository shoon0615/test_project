# 작은 게시판 CRUD 데모

Next.js와 `json-server`로 동작하는 로컬 게시판 CRUD 예제입니다. 게시글 목록, 상세 보기, 작성, 수정, 삭제를 지원합니다.

## Prerequisites

- Node.js >=22.22.2
- npm
- Chromium용 Playwright 브라우저 (E2E 테스트를 처음 실행할 때 설치)

## Setup and local development

```bash
npm install
npm run dev:all
```

두 서버가 실행되면 다음 주소를 엽니다.

- 앱: http://localhost:3000
- Mock REST API: http://localhost:4000/posts

`npm run dev:all`은 Next.js 개발 서버와 `json-server`를 함께 실행합니다. API 주소를 바꾸려면 `NEXT_PUBLIC_API_URL` 환경 변수를 설정할 수 있습니다.

## Verification commands

```bash
npm run test:run
npm run lint
npm run build
npm run test:e2e
```

`test:e2e`는 Playwright가 mock API(4000)와 Next.js 앱(3000)을 시작한 뒤 Chromium에서 게시글 생성, 상세 확인, 수정, 삭제 흐름을 실행합니다. 브라우저가 설치되어 있지 않다면 다음을 한 번 실행하세요.

```bash
npx playwright install chromium
```

## Demo data and persistence

Mock 데이터는 `db.json`의 `posts` 컬렉션에 저장됩니다. 개발 또는 E2E 실행 중 생성·수정·삭제한 데이터는 `json-server`가 실행되는 동안 이 파일에 반영될 수 있습니다. 초기 샘플 데이터로 되돌리려면 `db.json`을 버전 관리된 내용으로 복원한 뒤 mock 서버를 다시 시작하세요.

이 프로젝트의 데이터 저장소는 로컬 데모용 mock API입니다. 인증, 동시성 제어, 백업, 영구 데이터베이스 같은 운영 환경의 persistence guarantees는 제공하지 않습니다.
