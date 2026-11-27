# 진행 기록과 학습 노트

## 목차

- [버전별 작업 기록](#버전별-작업-기록)
- [학습 기록](#학습-기록)
  - [Node.js와 HTTP](#nodejs와-http)
  - [TypeScript](#typescript)
  - [npm과 설정 파일](#npm과-설정-파일)
  - [React와 Vite](#react와-vite)
    - [컴포넌트와 JSX](#컴포넌트와-jsx)
    - [Hook과 상태](#hook과-상태)
    - [자주 쓰는 용어와 패턴](#자주-쓰는-용어와-패턴)
  - [Next.js](#nextjs)
  - [json-server](#json-server)
- [다음 계획](#다음-계획)

---

## 버전별 작업 기록

### 2026-11-27 · 버전 5 · json-server 연결

**요약** · 게시글 저장소를 메모리에서 json-server의 `db.json`으로 바꿨습니다. Next.js의 목록·상세와 기존 게시글 API가 같은 저장소를 사용합니다.

**이유** · 개발용 REST API에 HTTP로 연결하고, 서버를 재시작한 뒤에도 작성한 글을 읽을 수 있습니다.

**확인 방법** · `npm test`는 임시 JSON 파일로 CRUD를 실행하고, json-server를 다시 시작한 뒤 API와 상세 화면에서 수정한 글을 확인합니다.

### 2026-11-27 · 버전 4 · Next.js 적용

**요약** · 목록은 `/`, 글 상세는 `/posts/{id}`에서 열리도록 Next.js App Router로 옮겼다. 기존 `/api/posts`와 `/api/posts/{id}`는 Route Handler가 처리한다.

**자세히** · 화면을 만드는 페이지와 JSON을 응답하는 API가 메모리 저장소를 공유한다. 입력 폼과 버튼은 React 클라이언트 컴포넌트에서 처리하며, 글은 서버 프로세스를 종료하면 사라진다.

**확인** · 타입 검사와 API 통합 테스트가 통과했다. 브라우저에서도 개발·빌드 모드 각각에서 글 작성, 상세 주소 직접 열기, 수정·삭제, 삭제된 주소의 404를 확인했다.

### 2026-11-27 · 버전 3 · React + Vite 적용

**요약** · 글 목록과 상세, 작성·수정 폼을 React 화면으로 옮겼다. 글을 조회하고 저장하는 기존 Node.js API는 그대로 사용한다.

**자세히** · 입력값과 게시글 목록을 React 상태로 관리한다. 개발 중에는 Vite가 화면을 제공하고 `/api` 요청을 Node.js로 전달한다. `npm start`로 실행하면 Vite로 빌드한 화면과 API를 Node.js가 한 포트에서 제공한다.

**확인** · `npm run typecheck`와 `npm test`가 통과했다. 브라우저에서도 빌드 모드와 개발 모드 각각에서 작성 → 상세 → 수정 → 새로고침 → 삭제를 확인했다.

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

위 문법과 기능은 [v3의 server.ts](https://github.com/shoon0615/test_project/blob/ad93a3c5/side/board/src/server.ts)의 `createServer()`와 `readPost()` 주변에서 볼 수 있습니다.

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

**실습** · v2나 v3에서 `npm run build`를 실행하면 `src/server.ts`가 `dist/server.js`로 변환됩니다. v4에서는 `npm run build`가 만든 Next.js 빌드 결과를 `.next/`에서 확인할 수 있습니다.

### React와 Vite

**정의** · React는 화면을 작은 단위인 컴포넌트로 만드는 라이브러리입니다. Vite는 개발 중 화면을 브라우저에 제공하고, 배포하거나 실행할 JavaScript·CSS를 빌드하는 도구입니다. [React 빠른 시작](https://react.dev/learn) · [Vite 가이드](https://vite.dev/guide/)

**한눈에 보는 실행 흐름**

> 폼 입력 → `useState` 갱신 → 저장 버튼 → `fetch()` → Vite가 Node.js API로 전달 → JSON 응답 → React 화면 갱신

위 흐름은 개발 모드입니다. `npm start`에서는 Node.js가 화면과 API를 함께 제공하므로 브라우저 요청이 바로 Node.js에 도착합니다.

#### 컴포넌트와 JSX

**컴포넌트(Component)**는 화면을 구성하는 단위입니다. 글쓰기 폼 하나도 컴포넌트이고, 그 폼과 목록을 담는 게시판 전체도 컴포넌트입니다. 이 프로젝트에서는 컴포넌트를 함수로 만들고, `<PostForm />`처럼 대문자로 시작하는 이름으로 배치합니다.

**JSX**는 React 화면을 작성할 때 자주 쓰는, HTML과 닮은 JavaScript 확장 문법입니다. 이 게시판에서는 TypeScript와 JSX를 함께 쓰므로 `.tsx` 파일에 작성합니다.

> 개발자가 JSX 작성 → Vite가 JavaScript로 변환 → 브라우저가 실행 → React가 화면에 반영

```tsx
function PostTitle({ title }: { title: string }) {
  return <h2>{title}</h2>
}

function PostDetail() {
  return <PostTitle title="첫 게시글" />
}
```

`PostTitle`은 제목을 보여주는 컴포넌트입니다. `<PostTitle title="첫 게시글" />`에서 건넨 `title`을 받아, JSX의 `{title}` 자리에 표시합니다. [HEROPY · React 핵심 패턴](https://www.heropy.dev/p/OidQSe) · [React 핵심 패턴 with TS](https://www.heropy.dev/p/QduRma) · [React · JSX 작성하기](https://react.dev/learn/writing-markup-with-jsx)

#### Hook과 상태

**Hook(훅)**은 컴포넌트가 React 기능을 쓰기 위해 호출하는 함수입니다. 예를 들어 `useState`를 쓰면 React가 입력값을 기억하고, 값이 바뀌었을 때 화면을 다시 계산합니다.

| 게시판에서 사용하는 Hook | 언제 쓰나요? |
| --- | --- |
| `useState` | 화면에 보여 줄 값을 기억할 때. 폼의 제목과 본문을 저장합니다. |
| `useEffect` | 화면에 표시된 조건에 맞춰 API나 브라우저 기능과 연결할 때. 목록 화면이 처음 나타나거나 다시 불러올 때 요청을 보냅니다. |
| `useRef` | 실제 HTML 요소를 직접 다루거나 화면에 표시할 필요 없는 값을 보관할 때. `Dialog`에서 실제 `<dialog>`를 찾고 `showModal()`을 호출합니다. |

`const [title, setTitle] = useState('')`에서 `title`은 현재 값이고, `setTitle()`은 다음 화면에 반영할 값을 정합니다. `useEffect`의 `[listVersion]`은 처음 화면이 나타난 뒤와 그 값이 바뀐 뒤에 목록을 불러오라는 뜻입니다. 이전 요청은 효과가 다시 실행되기 전이나 화면에서 사라질 때 취소합니다. 저장 버튼처럼 사용자 동작과 바로 연결되는 요청은 `onSubmit` 같은 이벤트 함수에 둡니다. [React · Effect가 필요 없는 경우](https://react.dev/learn/you-might-not-need-an-effect)

| 다른 React 코드에서 자주 만나는 Hook | 언제 쓰나요? |
| --- | --- |
| `useContext` | 테마나 언어처럼 여러 하위 컴포넌트가 사용하는 값을 읽을 때. |
| `useReducer` | 여러 동작에 따른 상태 변경 규칙을 함수 하나에 모을 때. |
| `useMemo` / `useCallback` | 최적화가 필요할 때. 각각 계산 결과와 함수 자체를 의존성이 바뀔 때까지 재사용합니다. |
| 커스텀 Hook | 여러 컴포넌트에서 같은 로직을 사용할 때. 예를 들어 연결 상태를 읽는 로직을 `useOnlineStatus`로 묶습니다. |

일반적인 Hook은 컴포넌트나 커스텀 Hook의 함수 본문에서 호출합니다. React가 매번 같은 순서로 호출을 추적할 수 있도록 조건문이나 반복문 밖에 둡니다. [React · 내장 Hook](https://react.dev/reference/react/hooks) · [Hook 규칙](https://react.dev/reference/rules/rules-of-hooks) · [HEROPY · React Hooks 핵심 정리](https://www.heropy.dev/p/revOrg)

#### 자주 쓰는 용어와 패턴

| 용어 | 코드에서 읽는 법 |
| --- | --- |
| `props` | 부모가 자식에게 건네는 값. `<PostTitle title="첫 게시글" />`에서 `title`이 prop입니다. `onSave`처럼 실행할 함수도 건넬 수 있습니다. |
| 렌더링 | React가 컴포넌트를 호출해 무엇을 표시할지 계산하는 과정입니다. 그다음 필요한 변경을 실제 화면에 반영합니다. |
| 제어 입력 | `value={title}`로 상태를 입력창에 보여주고, `onChange`로 입력값을 다시 상태에 담습니다. |
| 조건부 표시 | `listError && <button>다시 불러오기</button>`은 오류가 있을 때 버튼을 표시합니다. |
| 목록과 `key` | `map()`으로 글마다 화면 요소를 만들고, `key={post.id}`로 목록 안에서 각 글을 구분합니다. |
| `children`과 Fragment | `<Dialog>내용</Dialog>`의 내용은 `children`으로 전달됩니다. `<>...</>`는 여러 요소를 추가 HTML 태그 없이 묶습니다. |

**학습 순서** · 컴포넌트와 JSX → `props` → 입력 이벤트와 `useState` → API 연결과 `useEffect`. [React 빠른 시작](https://react.dev/learn) · [HEROPY · Vite로 React 시작하기](https://www.heropy.dev/p/6iFzkB)

**질문 · `@/App`은 어떤 파일인가요?** `@/`는 이 프로젝트의 `src/`를 가리키는 경로 별칭입니다. v3의 TypeScript는 `tsconfig.json`의 `paths`에서 경로를 찾고, Vite는 [v3의 vite.config.ts](https://github.com/shoon0615/test_project/blob/ad93a3c5/side/board/vite.config.ts)의 별칭으로 `@/App`을 `src/App.tsx`에 연결합니다. Node.js 서버의 `@/post`는 타입 전용 가져오기이므로 실행할 JavaScript에는 남지 않습니다.

**왜 CRA 대신 Vite인가요?** React 팀은 2025년 2월 새 프로젝트에서 Create React App(CRA) 사용을 권장하지 않는다고 발표했습니다. CRA는 예전 프로젝트를 읽을 때 참고하고, 이번에는 React 팀이 전환 대상으로 안내한 빌드 도구 중 Vite를 사용합니다. [React 팀의 CRA 공식 안내](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)

**실습** · 글을 하나 저장하고 개발자 도구의 **Network** 탭에서 `POST /api/posts`를 확인합니다. 그다음 [PostForm.tsx](../src/components/PostForm.tsx)에서 입력을 담는 `useState`와 저장에 성공했을 때 부모에게 알리는 `onSave`를 찾아보세요.

### Next.js

**정의** · Next.js는 React로 웹 앱을 만들 때 화면 주소, 서버에서 화면을 만드는 방법, HTTP API 등을 함께 제공하는 프레임워크입니다. App Router에서는 `app/` 안의 폴더와 파일 이름으로 주소를 정합니다. [Next.js · Pages와 Layouts](https://nextjs.org/docs/app/getting-started/layouts-and-pages)

**한눈에 보는 실행 흐름**

> 주소 열기 → `page.tsx` → 서버에서 글 읽기 → 브라우저에 화면 표시
>
> 저장 버튼 → `fetch()` → `route.ts` → 입력 검사·저장 → JSON 응답 → 상세 주소로 이동

| 파일 | 이 게시판에서 하는 일 |
| --- | --- |
| [layout.tsx](../src/app/layout.tsx) | 모든 페이지에 공통으로 적용할 HTML 틀과 CSS를 설정합니다. |
| [page.tsx](../src/app/page.tsx) | `/`에서 글 목록을 보여줍니다. |
| [posts/[id]/page.tsx](../src/app/posts/%5Bid%5D/page.tsx) | `/posts/{id}`의 ID를 `params`에서 꺼내 상세 글을 보여줍니다. |
| [api/posts/route.ts](../src/app/api/posts/route.ts) | `GET`으로 목록을 반환하고, `POST`로 글을 작성합니다. |
| [PostForm.tsx](../src/components/PostForm.tsx) | `'use client'`로 표시한 폼입니다. 입력 상태와 저장 이벤트를 처리합니다. |

**서버와 클라이언트 컴포넌트** · 목록과 상세 페이지는 서버에서 글을 읽습니다. 입력 상태나 버튼 클릭은 클라이언트 컴포넌트가 브라우저에서 처리합니다. 상세 페이지처럼 없는 글을 만났을 때는 `notFound()`로 404 화면을 표시합니다. [Next.js · 서버와 클라이언트 컴포넌트](https://nextjs.org/docs/app/getting-started/server-and-client-components)

**실습** · 글을 쓰고 새 탭에서 상세 주소를 열어 보세요. 같은 ID로 `/api/posts/{id}`도 열면, 화면에 보인 제목·본문이 JSON으로 응답되는 것을 확인할 수 있습니다. [Next.js · Route Handler](https://nextjs.org/docs/app/api-reference/file-conventions/route)

---

### json-server

**정의** · JSON 파일을 읽고 써서 개발용 REST API를 제공하는 서버입니다. `db.json`에 `posts` 배열을 두면 `/posts`에서 목록을 조회하거나 새 글을 저장할 수 있습니다. [JSON Server 0.17.4 공식 문서](https://github.com/typicode/json-server/tree/v0.17.4)

> 화면 조회 → Next.js 페이지 → json-server의 `/posts` → 저장된 글
>
> 글 저장 → Next.js의 `POST /api/posts` → 입력 검사·ID와 작성일 생성 → json-server의 `POST /posts` → `db.json`

| 코드 | 게시판에서 하는 일 |
| --- | --- |
| `await fetch(...)` | Next.js에서 json-server로 보낸 HTTP 요청의 응답을 기다립니다. |
| `cache: 'no-store'` | 조회할 때 캐시를 사용하지 않아 저장 직후 최신 글을 읽습니다. |
| `PATCH /posts/{id}` | 제목과 본문만 바꾸고 기존 ID와 작성일은 유지합니다. 브라우저는 기존대로 Next.js에 `PUT /api/posts/{id}`를 보냅니다. |

**실습** · 두 서버를 실행해 글을 저장한 뒤 `db.json`에서 글을 찾아보세요. 두 서버를 종료했다가 다시 켜고 같은 상세 주소를 열면 같은 글을 확인할 수 있습니다.

---

## 다음 계획

게시글 검색과 페이지 나누기를 진행합니다.
