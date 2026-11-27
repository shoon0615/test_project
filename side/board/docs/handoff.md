# 게시판 프로젝트 대화 기록과 인수인계

## 다음 채팅에서 먼저 볼 내용

- 작업 폴더는 `side/board/`, 현재 버전은 **v4 · Next.js**다.
- 사용자는 **SQLite를 생략**하기로 했다. 롤백하면서 기존 README와 학습 노트에 SQLite가 다음 단계로 다시 표시됐지만, 대화에서 나중에 정한 방침은 생략이다.
- 마지막으로 만든 **검색 API TDD와 Playwright 저장 실패 Mock 예제는 사용자가 원한 방향과 달라 롤백했다.** 실제로 원하는 다음 구현의 범위는 아직 정하지 않았다. 같은 예제를 자동으로 다시 적용하지 말고 다음 요청을 기준으로 진행한다.

## 목표와 작업 방식

회원 없는 사용자용(FO) 게시판을 시작점으로 삼아 기능을 단계별로 늘린다. 최종 목표는 회원과 권한을 갖춘 사용자용·관리자용(BO) 화면 및 API다. 사용자는 개발을 약 3년 쉬었으므로, 처음 배우는 사람도 읽을 수 있는 설명을 가장 중요하게 본다.

- **문서는 적게 유지한다.** [README](../README.md)는 현재 기술 스택, 폴더 트리, 실행법, 버전별 변경표와 학습 로드맵을 담는다. [학습 노트](notes.md)는 날짜별 요약·이유·확인 방법과 기술 학습을 담는다. [question.md](question.md)는 사용자가 작성한 형식 예시다.
- **기술 설명은 용어 정의 → 한눈에 보는 흐름 → 자주 쓰는 문법과 사용처 → 짧은 실습** 순서를 선호한다. 현재 코드에서 확인할 수 있는 예시를 우선하고, 다른 프로젝트에서도 자주 만나는 문법은 짧게 덧붙인다.
- **기술 스택은 항목형 목록**으로 적는다. 예시는 IDE, Node.js, Framework, Language, CSS, Component다. 설치한 기술만 적고, 기술을 왜 골랐는지도 남긴다.
- **새 Git 커밋 메시지는 한글**로 작성한다. 이미 푸시된 과거 영어 커밋 메시지는 그대로 두기로 했다.

## 버전별 대화와 작업

| 버전 | 커밋 | 진행 내용 |
| --- | --- | --- |
| v1 · 기본 게시판 | `6d3c5827` | HTML·CSS·JavaScript와 Node.js 내장 HTTP 서버로 글 목록·상세·작성·수정·삭제를 구현했다. 저장은 메모리 `Map`이다. Docker 바깥에서도 접속할 수 있도록 수신 주소 설정을 안내했다. |
| v2 · TypeScript | `db6a2cc3` | 화면과 서버를 TypeScript로 옮겼다. 제목·본문을 입력하는 `PostInput`과 ID·작성일이 포함된 `Post`를 공유한다. 외부 JSON은 서버 실행 중에 검사한다. |
| v3 · React + Vite | `ad93a3c5` | 기존 API를 두고 화면을 React로 전환했다. Vite 개발 서버와 빌드를 추가하고, React 팀이 새 프로젝트에서 CRA 사용을 권장하지 않는다는 도입 근거를 기록했다. 소스의 `@/` 경로 별칭은 `src/`를 가리킨다. |
| v4 · Next.js | `20093c23` | App Router로 옮겼다. 목록은 `/`, 상세는 `/posts/{id}`이며, 기존 `/api/posts`와 `/api/posts/{id}`는 Route Handler가 처리한다. 목록·상세는 서버에서 읽고, 폼과 버튼은 React 클라이언트 컴포넌트가 처리한다. |

학습 노트의 React 부분은 특히 **컴포넌트는 화면을 구성하는 단위**, **JSX 작성 → 빌드 도구가 JavaScript로 변환 → 브라우저 실행 → React가 화면에 반영**이라는 구분을 중요하게 다뤘다. Hook은 `useState`, `useEffect`, `useRef`의 실제 쓰임에 더해 `useContext`, `useReducer`, `useMemo`, `useCallback`, 커스텀 Hook을 간단히 정리했다.

## 현재 실행과 검증

현재 스택은 Next.js 16.4.6, React 19.3.1, TypeScript 5.8.3, 기본 CSS, npm이다. 검증 환경은 Node.js 22.23.5였다. 서버마다 메모리 저장소가 생기므로 재시작하면 글이 사라진다.

```bash
cd side/board
npm ci
npm run dev
```

기본 주소는 `http://localhost:3000`이다. Docker에서 접속할 때는 `npm run dev -- --hostname 0.0.0.0`을 사용한다. 원격 VS Code라면 Ports 탭에서 포트를 전달한다.

- `npm run typecheck`는 Next.js 경로 타입을 생성하고 TypeScript를 검사한다.
- `npm test`는 프로젝트를 빌드하고, 실제 로컬 Next.js 서버에서 [API 통합 테스트](../server.test.mjs)를 실행한다.
- v4 적용 당시 개발·빌드 모드 모두 브라우저로 작성, 상세 주소 직접 열기, 수정·삭제, 삭제된 주소의 404를 확인했다.
- 마지막 롤백 뒤에는 빌드와 기존 게시글 API 테스트가 통과했다. 인수인계 파일을 만들기 전 `side/board/`에는 Git 변경이 없었다. 브랜치는 `feature/side-fo-ui`이고 원격 추적 브랜치와 같았다. 다른 폴더의 로컬 변경이 있어 게시판 작업과 구분한다.

## 마지막에 논의한 선택지

| 주제 | 대화에서 정리한 내용 |
| --- | --- |
| JSON Server | `db.json`에 쓰기 결과를 남길 수 있는 개발용 REST API다. 현재 게시판이 이 저장 방식에 연결되고 같은 파일을 유지하면 재시작 후에도 글을 읽을 수 있다. 도입 여부는 미정이다. |
| Mock | 원하는 응답과 상황을 재현하는 방법이다. 예를 들어 Playwright의 `page.route()`로 저장 요청에만 `500`을 응답하도록 만들 수 있다. |
| TDD | 기대 동작을 테스트로 먼저 적고 실패 확인 → 구현 → 코드 정리 순서로 진행하는 방식이다. 메모리 저장소와 실제 API만으로도 할 수 있다. |
| RHF와 TanStack Query | RHF는 폼의 값·검증·제출 상태를 다루고, TanStack Query는 브라우저에서 서버 데이터를 조회하고 캐시·갱신하는 데 쓰인다. 둘 다 도입하지 않았다. |

**롤백한 예제** · `GET /api/posts?q=react`에 제목 검색을 구현하고, Playwright로 `POST /api/posts`의 `500` 응답을 만들어 오류 표시와 입력 유지 여부를 테스트했다. 구현 전 검색 테스트가 의도대로 실패했고, 구현 뒤 검색과 브라우저 테스트가 통과했다. 이후 사용자 요청으로 검색 코드, 테스트, Playwright 의존성·설정과 관련 문서를 예제 작성 전의 v4 상태로 되돌렸다. 현재 실행 가능한 검색 또는 Mock 예제로 취급하지 않는다.

## 사용자가 제공한 참고 자료

- [HEROPY · 한눈에 보는 타입스크립트](https://www.heropy.dev/p/WhqSC8)
- [HEROPY · React 프로젝트 시작하기 w. Vite](https://www.heropy.dev/p/6iFzkB), [React 핵심 패턴](https://www.heropy.dev/p/OidQSe), [React 핵심 패턴 with TS](https://www.heropy.dev/p/QduRma), [React Hooks 핵심 정리](https://www.heropy.dev/p/revOrg)
- [pr_psts Wiki](https://github.com/shoon0615/pr_psts/wiki), [chapter.md](https://github.com/shoon0615/pr_psts/blob/main/frontend/mock/docs/20260517/chapter.md)
