# 진행 기록과 학습 노트

## 목차

- [버전별 작업 기록](#버전별-작업-기록)
- [학습 기록](#학습-기록)
  - [Node.js와 HTTP](#nodejs와-http)
  - [TypeScript](#typescript)
  - [npm과 설정 파일](#npm과-설정-파일)
- [다음 계획](#다음-계획)

---

## 버전별 작업 기록

### 2026-11-27 · 버전 2 · TypeScript 적용

**요약** · 화면과 서버 코드를 TypeScript로 바꿨다. 두 곳에서 [게시글 타입](../src/post.ts)을 공유한다.

**자세히** · 제목·본문과 서버가 붙이는 ID·작성일을 타입으로 표현했다. npm으로 컴파일러를 설치하고 빌드와 실행을 한 명령으로 묶었다.

**질문 · 서버의 입력 검사는 왜 남겨 두나요?** TypeScript는 실행 전에 코드의 타입을 검사한다. 브라우저나 외부 도구에서 실제로 들어온 JSON은 서버가 실행 중에 별도로 검사한다.

**확인** · `npm run typecheck`로 타입을 검사하고, `npm test`로 JavaScript 변환 후 API의 작성부터 삭제까지 확인한다.

### 2026-11-26 · 버전 1 · 첫 FO 게시판

**요약** · 빈 폴더에 글 목록·상세·작성·수정·삭제를 추가했다. Docker 밖의 브라우저에서 접속할 수 있도록 서버의 수신 주소를 실행할 때 선택하게 했다.

**자세히** · 글을 저장하면 브라우저가 제목과 본문을 JSON으로 보낸다. 서버는 입력을 확인하고 ID와 작성일을 붙여 메모리에 저장한다. 화면과 API를 한 서버에서 제공해 명령 하나로 실행할 수 있다. Docker에서는 포트를 연결해도 서버가 컨테이너 내부의 `127.0.0.1`만 듣고 있으면 밖에서 접속할 수 없어 `HOST=0.0.0.0`으로 실행한다.

| API                      | 하는 일          |
| ------------------------ | ---------------- |
| `GET /api/posts`         | 목록 조회        |
| `GET /api/posts/{id}`    | 상세 조회        |
| `POST /api/posts`        | 글 작성          |
| `PUT /api/posts/{id}`    | 제목과 본문 수정 |
| `DELETE /api/posts/{id}` | 글 삭제          |

---

## 학습 기록

### Node.js와 HTTP

**정의** · Node.js는 브라우저 밖에서 JavaScript를 실행하는 환경입니다. 브라우저의 JavaScript는 버튼 클릭에 반응하고, Node.js에서 실행되는 JavaScript는 요청을 받아 화면 파일과 게시글을 보냅니다.

**한눈에 보는 실행 흐름**

> `listen()` (서버 대기) → `fetch()` (브라우저 요청) → 입력 검사·저장 → JSON 응답 → 화면 갱신

```
`listen()` (서버 대기)
↓
`fetch()` (브라우저 요청)
↓
입력 검사·저장
↓
JSON 응답
↓
화면 갱신
```

예를 들어 **글 저장**을 누르면 브라우저가 `POST /api/posts`로 제목과 본문을 보냅니다. 서버는 글을 `Map`에 저장하고 새 글을 돌려줍니다.

| 자주 쓰는 문법과 기능                      | 게시판에서 하는 일                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `import { createServer } from 'node:http'` | Node.js에 내장된 HTTP 서버 기능을 가져옵니다.                                  |
| `async` / `await`                          | 요청 본문 읽기처럼 시간이 걸리는 작업의 결과를 기다린 뒤 다음 줄을 실행합니다. |
| `try` / `catch`                            | 잘못된 JSON을 읽을 때 생기는 오류를 잡아 사용자에게 오류 응답을 보냅니다.      |
| `posts.set()` / `posts.get()`              | 글을 ID로 저장하거나 찾아옵니다.                                               |

위 문법과 기능은 [server.ts](../src/server.ts)의 `createServer()`와 `readPost()` 주변에서 볼 수 있습니다.

**실습** · 개발자 도구의 **Network** 탭을 열고 글을 저장합니다. `POST /api/posts` 요청에는 제목·본문, `201` 응답에는 새 ID·작성일이 있는지 확인하세요. [HEROPY · Node.js와 npm 시작하기](https://www.heropy.dev/p/bVoDlS)

### TypeScript

**정의** · TypeScript는 JavaScript에 타입 문법을 더한 언어입니다. 타입은 값의 종류나 모양을 나타냅니다. 예를 들어 제목에 `string` 타입을 붙이면 숫자를 넣는 실수를 실행 전에 찾을 수 있습니다.

**한눈에 보는 실행 흐름**

`.ts` 작성 → `tsc`로 타입 검사·변환 → `.js`를 브라우저나 Node.js에서 실행

이 프로젝트에서는 `npm run typecheck`로 검사만 하고, `npm run build`로 검사와 변환을 함께 합니다.

**학습 순서** · 값과 함수의 타입 → 여러 경우를 표현하는 타입 → 타입 재사용.

| 자주 쓰는 문법                     | 짧은 예                                                        | 언제 쓰나요?                                                                                                |
| ---------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 기본 타입과 타입 추론              | `const count = 3`, `names: string[]`                           | 초기값으로 타입을 알 수 있으면 추론에 맡기고, 필요한 곳에 배열이나 변수의 타입을 적습니다.                  |
| 함수의 매개변수와 반환 타입        | `function length(text: string): number { return text.length }` | 함수에 어떤 값을 넣고 어떤 결과를 받는지 드러냅니다.                                                        |
| `type`, `interface`, 선택 속성 `?` | `interface User { name: string, email?: string }`              | 객체의 모양에 이름을 붙이고, 생략할 수 있는 필드를 표시합니다. `type`으로도 객체에 이름을 붙일 수 있습니다. |
| 유니언과 타입 좁히기               | `id: string \| number`, `typeof id === 'string'`               | 여러 타입을 허용하고, 조건문 안에서 확인된 타입의 기능을 사용합니다.                                        |
| 제네릭 `<T>`                       | `type Page<T> = { items: T[] }`                                | 같은 구조를 `Page<Post>`, `Page<User>`처럼 여러 데이터에 재사용합니다.                                      |
| 유틸리티 타입                      | `Pick<Post, 'id' \| 'title'>`, `Partial<PostInput>`            | 기존 타입에서 필요한 필드만 고르거나 필드를 모두 선택 속성으로 바꿉니다.                                    |

**실무에서 써보기**

- **화면 상태 표현** · `'loading' \| 'success' \| 'error'`처럼 리터럴 유니언으로 가능한 상태를 정하고, 상태에 따라 로딩·결과·오류 메시지를 표시합니다.
- **외부 데이터 검사** · API에서 받은 값은 `unknown`으로 다루고 `typeof`나 `in`으로 확인합니다. 타입을 붙이는 것만으로는 도착한 JSON의 형태가 검증되지 않습니다.
- **타입 공유** · 여러 파일에서 쓰는 타입은 한곳에 두고 `import type`으로 가져옵니다. 이 게시판에서는 화면과 서버가 [post.ts](../src/post.ts)의 타입을 공유합니다.

**실습** · `post.ts`에 `const example: PostInput = { title: 123, content: '본문' }`을 추가해 `npm run typecheck`를 실행하세요. 제목을 문자열로 바꿔 통과하는지 확인하고 실습 줄을 지웁니다. [HEROPY · 한눈에 보는 타입스크립트](https://www.heropy.dev/p/WhqSC8)

### npm과 설정 파일

**개념** · npm은 프로젝트가 필요한 도구를 설치하고 등록된 명령을 실행합니다. `npm start`는 TypeScript를 JavaScript로 빌드한 뒤 Node.js로 서버를 켭니다.

| v2에서 추가한 파일                        | 역할                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| [package.json](../package.json)           | 필요한 패키지와 `start`, `build`, `test` 명령 정의           |
| [package-lock.json](../package-lock.json) | `npm ci`가 재현할 설치 버전 기록                             |
| [tsconfig.json](../tsconfig.json)         | 검사 규칙과 소스·출력 위치 지정                              |
| [.gitignore](../.gitignore)               | 설치 폴더 `node_modules/`와 빌드 결과 `dist/`를 Git에서 제외 |

**학습 순서** · `npm ci`로 설치 → `npm run build`로 변환 → `dist/server.js`를 Node.js가 실행하는 흐름 확인.

**실습** · `npm run build`를 실행하고 `src/app.ts`와 `dist/app.js`를 비교해 타입 선언이 변환 결과에서 사라지는지 확인하세요.

---

## 다음 계획

**v3 계획** · 기존 Node.js API를 그대로 두고 게시판 화면을 React로 옮깁니다. React는 화면을 구성하고, Vite는 개발 서버를 띄우고 React·TypeScript 코드를 빌드합니다. 이 구성으로 컴포넌트와 입력 상태를 먼저 익힌 뒤 v4에서 Next.js의 화면 주소와 API 구조를 배웁니다. [Vite 가이드](https://vite.dev/guide/)

**왜 CRA 대신 Vite인가요?** React 팀은 2025년 2월 새 프로젝트에서 Create React App(CRA) 사용을 권장하지 않는다고 발표했습니다. CRA는 예전 프로젝트를 읽을 때 참고하고, 이번에는 React 팀이 전환 대상으로 안내한 빌드 도구 중 Vite를 사용합니다. [React 팀의 CRA 공식 안내](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)
