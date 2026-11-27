# 게시판

회원 없이 글을 쓰고, 읽고, 수정하고, 삭제하는 사용자용(FO) 게시판입니다.

## 목차

- [한눈에 보기](#한눈에-보기)
- [바로 실행](#바로-실행)
- [변경 내용](#변경-내용)
- [학습 로드맵](#학습-로드맵)

## 한눈에 보기

### ⚙️ 기술 스택

- **IDE** · VS Code (Visual Studio Code)
- **Node.js** · 22.23.5 (검증 환경)
- **Framework** · Next.js 16.4.6 (App Router)
- **Language** · TypeScript 5.8.3
- **CSS** · 기본 CSS (`globals.css`)
- **Component** · React 19.3.1, 프로젝트에서 직접 만든 컴포넌트
- **Package Manager** · npm
- **API** · Next.js Route Handler, JSON
- **Storage** · 서버 메모리의 `Map`

서버를 재시작하면 게시글 목록이 비워집니다.

### 폴더 구조

```text
side/board/
├── src/
│   ├── app/                         # Next.js 화면과 URL
│   │   ├── layout.tsx                # 공통 화면 틀
│   │   ├── globals.css               # 공통 스타일
│   │   ├── page.tsx                  # / — 게시글 목록
│   │   ├── posts/
│   │   │   └── [id]/page.tsx           # /posts/{id} — 게시글 상세
│   │   └── api/posts/
│   │       ├── route.ts              # /api/posts — 목록·작성
│   │       └── [id]/route.ts           # /api/posts/{id} — 상세·수정·삭제
│   ├── components/                  # 글쓰기 폼, 대화상자, 수정·삭제 버튼
│   ├── server/                      # 입력 검사와 메모리 저장소
│   │   ├── post-http.ts
│   │   └── posts.ts
│   ├── api.ts                       # 화면에서 API를 호출하는 함수
│   └── post.ts                      # 화면과 서버가 공유하는 게시글 타입
├── docs/notes.md                    # 버전별 작업 기록과 학습 노트
├── server.test.mjs                  # 화면과 API 통합 테스트
├── package.json                     # 의존성과 실행 명령
└── tsconfig.json                    # TypeScript 설정과 @/ 경로 별칭
```

### 버전별 기술 변화

| 버전 | 화면 | 서버 | 저장 |
| --- | --- | --- | --- |
| v1 · 기본 게시판 | HTML·CSS, JavaScript | Node.js HTTP, JavaScript | 메모리 |
| v2 · TypeScript | HTML·CSS, TypeScript | Node.js HTTP, TypeScript | 메모리 |
| v3 · React + Vite | React 19, Vite 8, TypeScript | Node.js HTTP, TypeScript | 메모리 |
| v4 · Next.js (현재) | Next.js 16 App Router, React 19, TypeScript, CSS | Next.js Route Handler | 메모리 |

## 바로 실행

Node.js 22.18 이상(22 계열) 또는 24 이상에서 저장소 루트를 기준으로 실행합니다. v4를 처음 실행할 때는 `npm ci`로 패키지를 설치합니다.

```bash
cd side/board
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000)에서 **글쓰기 → 저장 → 상세 → 수정 → 삭제**를 눌러 보세요. 게시글 제목을 누르면 상세 주소 `/posts/{id}`로 이동합니다. 서버는 `Ctrl+C`로 종료합니다.

- **Docker 개발 컨테이너**에서는 `npm run dev -- --hostname 0.0.0.0`으로 실행합니다. 원격 VS Code에서는 **Ports** 탭에서 3000번을 전달하고 **Open in Browser**를 누릅니다.
- **3000번 포트가 사용 중**이면 `npm run dev -- --port 3001`로 다른 포트를 사용합니다.
- **빌드한 결과 실행**은 `npm run build` 후 `npm start`입니다. Docker에서는 `npm start -- --hostname 0.0.0.0`을 사용합니다.

## 변경 내용

| 날짜       | 버전 | 순번 | 내용                                              |
| ---------- | ---- | ---- | ------------------------------------------------- |
| 2026-11-26 | `v1` | 1    | Node.js로 화면과 게시글 API를 제공                |
| 2026-11-27 | `v2` | 1    | 화면과 서버에 TypeScript 적용 및 게시글 타입 공유 |
| 2026-11-27 | `v2` | 2    | npm으로 의존성 설치와 빌드·실행 명령 관리         |
| 2026-11-27 | `v3` | 1    | 게시판 화면을 React 컴포넌트로 전환하고 Vite로 빌드 |
| 2026-11-27 | `v4` | 1    | Next.js에서 목록·상세 URL과 게시글 API를 연결 |

## 학습 로드맵

| 순서 | 읽을 곳                                               | 해볼 것                                          |
| ---- | ----------------------------------------------------- | ------------------------------------------------ |
| 1    | [v1 · Node.js와 HTTP](docs/notes.md#nodejs와-http)    | 글을 저장하고 브라우저에서 HTTP 요청과 응답 확인 |
| 2    | [v2 · TypeScript](docs/notes.md#typescript)           | 제목에 숫자를 넣었을 때 타입 오류 확인           |
| 3    | [v2 · npm과 설정 파일](docs/notes.md#npm과-설정-파일) | `npm start`가 빌드한 JavaScript의 위치 확인      |
| 4 | [v3 · React와 Vite](docs/notes.md#react와-vite) | 입력 상태를 따라가고 글 저장 뒤 React 화면 갱신 확인 |
| 5 | [v4 · Next.js](docs/notes.md#nextjs) | 상세 URL을 새 탭에서 열고 API 응답과 비교 |

다음 프로젝트 단계는 **SQLite 저장소 → 검색·페이지 나누기 → 회원·권한 → 관리자 화면·API**입니다.
