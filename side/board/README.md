# 게시판

회원 없이 글을 쓰고, 읽고, 수정하고, 삭제하는 사용자용(FO) 게시판입니다.

## 목차

- [한눈에 보기](#한눈에-보기)
- [바로 실행](#바로-실행)
- [변경 내용](#변경-내용)
- [학습 로드맵](#학습-로드맵)

## 한눈에 보기

| 구분 | v1 · 기본 게시판 | v2 · TypeScript | v3 · React + Vite (현재) |
| --- | --- | --- | --- |
| 화면 | HTML·CSS, JavaScript | HTML·CSS, TypeScript | React 19, Vite 8, TypeScript, CSS |
| 서버 | Node.js 내장 HTTP, JavaScript | Node.js 내장 HTTP, TypeScript | Node.js 내장 HTTP, TypeScript |
| 데이터 | 서버 메모리의 `Map` | 서버 메모리의 `Map` | 서버 메모리의 `Map` |
| 실행 | `node server.mjs` | `npm start` | `npm start` |

글은 서버가 켜져 있는 동안 남습니다. 서버를 재시작하면 목록이 비워집니다.

## 바로 실행

Node.js 22.18 이상(22 계열) 또는 24 이상에서 저장소 루트를 기준으로 실행합니다. v3를 처음 실행할 때는 `npm ci`로 패키지를 설치합니다.

```bash
cd side/board
npm ci
npm start
```

[localhost:3000](http://localhost:3000)에서 **글쓰기 → 저장 → 수정 → 삭제**를 눌러 보세요. 서버는 `Ctrl+C`로 종료합니다.

- **Docker 개발 컨테이너**에서는 `HOST=0.0.0.0 npm start`로 실행합니다. 원격 VS Code에서는 **Ports** 탭에서 3000번 포트를 전달하고 **Open in Browser**를 누릅니다.
- **3000번 포트가 사용 중**이면 기존 게시판 서버를 종료하거나, 로컬에서는 `PORT=3001 npm start`로 실행합니다.

### 개발 중에 화면을 수정한다면

`side/board`에서 터미널 두 개를 열어 실행합니다. 화면 주소는 [localhost:3000](http://localhost:3000)입니다.

| 터미널 | 명령 | 역할 |
| --- | --- | --- |
| 1 | `PORT=3001 npm run dev:api` | Node.js 게시글 API 실행 |
| 2 | `npm run dev` | Vite로 React 화면 실행 및 편집 결과 반영 |

Docker에서 Vite 화면을 열 때는 두 번째 명령을 `npm run dev -- --host 0.0.0.0`으로 실행합니다. `npm start`와 개발 모드는 기본적으로 같은 화면 포트를 사용하므로 먼저 실행 중인 쪽을 종료합니다.

## 변경 내용

| 날짜       | 버전 | 순번 | 내용                                              |
| ---------- | ---- | ---- | ------------------------------------------------- |
| 2026-11-26 | `v1` | 1    | Node.js로 화면과 게시글 API를 제공                |
| 2026-11-27 | `v2` | 1    | 화면과 서버에 TypeScript 적용 및 게시글 타입 공유 |
| 2026-11-27 | `v2` | 2    | npm으로 의존성 설치와 빌드·실행 명령 관리         |
| 2026-11-27 | `v3` | 1    | 게시판 화면을 React 컴포넌트로 전환하고 Vite로 빌드 |

## 학습 로드맵

| 순서 | 읽을 곳                                               | 해볼 것                                          |
| ---- | ----------------------------------------------------- | ------------------------------------------------ |
| 1    | [v1 · Node.js와 HTTP](docs/notes.md#nodejs와-http)    | 글을 저장하고 브라우저에서 HTTP 요청과 응답 확인 |
| 2    | [v2 · TypeScript](docs/notes.md#typescript)           | 제목에 숫자를 넣었을 때 타입 오류 확인           |
| 3    | [v2 · npm과 설정 파일](docs/notes.md#npm과-설정-파일) | `npm start`가 빌드한 JavaScript의 위치 확인      |
| 4 | [v3 · React와 Vite](docs/notes.md#react와-vite) | 입력 상태를 따라가고 글 저장 뒤 React 화면 갱신 확인 |

다음 프로젝트 단계는 **Next.js → SQLite 저장소 → 검색·페이지 나누기 → 회원·권한 → 관리자 화면·API**입니다.
