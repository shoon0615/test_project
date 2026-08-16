# Board CRUD Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Next.js board demo whose post data is created, read, updated, and deleted through a local `json-server` REST API.

**Architecture:** App Router pages own loading and navigation while focused client components own forms and destructive interactions. A typed `posts-api` module is the only code that knows the mock server URL and HTTP details, allowing UI and transport behavior to be tested independently.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript 5, Tailwind CSS 4, json-server 1, Vitest, Testing Library, Playwright

## Global Constraints

- Create the application in `frontend/test/superpowers_framework`.
- Store records in the `posts` collection in `db.json`; fields are `id`, `title`, `author`, `content`, and immutable `createdAt`.
- Implement only list, detail, create, update, and delete; do not add search, pagination, authentication, comments, attachments, or authorization.
- Run the Next.js application on port 3000 and json-server on `http://localhost:4000`.
- Preserve user input after failed submissions and disable duplicate submissions.
- Provide responsive layout, visible keyboard focus, labels, field errors, loading states, retryable request errors, an empty state, not-found handling, and delete confirmation.

---

## Planned File Structure

- `frontend/test/superpowers_framework/package.json`: dependencies and dev/test/server scripts.
- `frontend/test/superpowers_framework/db.json`: deterministic sample posts for json-server.
- `frontend/test/superpowers_framework/src/app/*`: layout, global styles, and four App Router screens.
- `frontend/test/superpowers_framework/src/features/posts/model/post.ts`: shared post and input types.
- `frontend/test/superpowers_framework/src/features/posts/api/posts-api.ts`: all REST operations and typed errors.
- `frontend/test/superpowers_framework/src/features/posts/components/*`: reusable list, form, detail, and error UI.
- `frontend/test/superpowers_framework/src/features/posts/__tests__/*`: focused Vitest/Testing Library coverage.
- `frontend/test/superpowers_framework/tests/e2e/post-crud.spec.ts`: browser-level CRUD acceptance flow.
- `frontend/test/superpowers_framework/README.md`: setup, commands, and local URLs.

### Task 1: Project Foundation and Test Harness

**Files:**
- Create: `frontend/test/superpowers_framework/package.json`
- Create: `frontend/test/superpowers_framework/tsconfig.json`
- Create: `frontend/test/superpowers_framework/next.config.ts`
- Create: `frontend/test/superpowers_framework/postcss.config.mjs`
- Create: `frontend/test/superpowers_framework/eslint.config.mjs`
- Create: `frontend/test/superpowers_framework/vitest.config.ts`
- Create: `frontend/test/superpowers_framework/src/test/setup.ts`
- Create: `frontend/test/superpowers_framework/src/app/layout.tsx`
- Create: `frontend/test/superpowers_framework/src/app/globals.css`
- Create: `frontend/test/superpowers_framework/src/app/__tests__/layout.test.tsx`

**Interfaces:**
- Consumes: no application interfaces.
- Produces: `@/*` path alias, jsdom test environment, global jest-dom matchers, and root metadata/layout.

- [ ] **Step 1: Read the bundled Next.js 16 guidance before scaffolding**

Run: `rg -n "App Router|params|dynamic route|notFound" frontend/test/nobase/node_modules/next/dist/docs/01-app frontend/test/nobase/node_modules/next/dist/docs/02-pages | head -80`

Expected: relevant bundled documentation paths and current async route-parameter guidance are visible.

- [ ] **Step 2: Write the failing layout test**

```tsx
import { render, screen } from "@testing-library/react";
import RootLayout, { metadata } from "../layout";

it("exposes Korean board metadata and renders children", () => {
  render(<RootLayout><main>게시판 본문</main></RootLayout>);
  expect(screen.getByText("게시판 본문")).toBeInTheDocument();
  expect(metadata.title).toBe("작은 게시판");
});
```

- [ ] **Step 3: Add the pinned scaffold and run the test to verify it fails**

Create scripts `dev`, `mock`, `dev:all`, `build`, `lint`, `test`, `test:run`, and `test:e2e`; use `concurrently` for `dev:all`. Configure Vitest with jsdom, `@` alias, and `src/test/setup.ts`.

Run: `cd frontend/test/superpowers_framework && npm install && npm run test:run -- src/app/__tests__/layout.test.tsx`

Expected: FAIL because `src/app/layout.tsx` is absent.

- [ ] **Step 4: Implement the minimal root layout and global stylesheet**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "작은 게시판",
  description: "json-server로 동작하는 게시판 CRUD 데모",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
```

Define CSS variables for paper, ink, muted ink, border, accent, danger, and focus; add a centered `.shell`, reusable `.button` variants, form controls, status panels, and mobile stacking at `640px`.

- [ ] **Step 5: Verify and commit the foundation**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/app/__tests__/layout.test.tsx && npm run lint`

Expected: one passing test and zero lint errors.

```bash
git add frontend/test/superpowers_framework
git commit -m "chore: scaffold board CRUD demo"
```

### Task 2: Post Model and REST API

**Files:**
- Create: `frontend/test/superpowers_framework/db.json`
- Create: `frontend/test/superpowers_framework/src/features/posts/model/post.ts`
- Create: `frontend/test/superpowers_framework/src/features/posts/api/posts-api.ts`
- Create: `frontend/test/superpowers_framework/src/features/posts/__tests__/posts-api.test.ts`

**Interfaces:**
- Consumes: `fetch`; base URL from `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:4000`.
- Produces: `Post`, `PostDraft`, `ApiError`, `listPosts(): Promise<Post[]>`, `getPost(id: string): Promise<Post>`, `createPost(draft: PostDraft): Promise<Post>`, `updatePost(id: string, draft: PostDraft): Promise<Post>`, `deletePost(id: string): Promise<void>`.

- [ ] **Step 1: Write failing API tests**

```ts
it("sorts posts newest first", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
    { id: "1", title: "먼저", author: "민수", content: "A", createdAt: "2026-08-16T09:00:00.000Z" },
    { id: "2", title: "나중", author: "지수", content: "B", createdAt: "2026-08-17T09:00:00.000Z" },
  ]))));
  await expect(listPosts()).resolves.toMatchObject([{ id: "2" }, { id: "1" }]);
});

it("keeps createdAt out of PATCH data", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await updatePost("1", { title: "수정", author: "민수", content: "본문" });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ title: "수정", author: "민수", content: "본문" });
});
```

Also assert GET detail, POST with generated ISO `createdAt`, DELETE, 404 mapped to `new ApiError("게시글을 찾을 수 없습니다.", 404)`, and generic non-OK responses.

- [ ] **Step 2: Run tests to verify missing module failure**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/posts-api.test.ts`

Expected: FAIL because `posts-api` and post types do not exist.

- [ ] **Step 3: Implement types, fixtures, and API functions**

```ts
export type Post = { id: string; title: string; author: string; content: string; createdAt: string };
export type PostDraft = Pick<Post, "title" | "author" | "content">;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
```

Use one private `request<T>(path, init?)` function, JSON headers only when a body exists, `encodeURIComponent(id)`, and `await response.json()` except for DELETE. Seed `db.json` with three Korean posts with fixed ISO timestamps.

- [ ] **Step 4: Run focused tests and commit**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/posts-api.test.ts`

Expected: all API tests pass.

```bash
git add frontend/test/superpowers_framework/db.json frontend/test/superpowers_framework/src/features/posts
git commit -m "feat: add typed posts API"
```

### Task 3: Shared Post Form

**Files:**
- Create: `frontend/test/superpowers_framework/src/features/posts/components/post-form.tsx`
- Create: `frontend/test/superpowers_framework/src/features/posts/__tests__/post-form.test.tsx`

**Interfaces:**
- Consumes: `PostDraft`; optional `initialValue?: PostDraft`; `onSubmit(draft: PostDraft): Promise<void>`.
- Produces: `PostForm({ mode: "create" | "edit", initialValue?: PostDraft, cancelHref: string, onSubmit: (draft: PostDraft) => Promise<void> })` with trimmed values, inline validation, stable user input, and submit state.

- [ ] **Step 1: Write failing validation and submission tests**

```tsx
it("shows all required errors without submitting whitespace", async () => {
  const onSubmit = vi.fn();
  render(<PostForm mode="create" onSubmit={onSubmit} />);
  await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));
  expect(await screen.findAllByText("필수 입력 항목입니다.")).toHaveLength(3);
  expect(onSubmit).not.toHaveBeenCalled();
});

it("submits trimmed values once", async () => {
  const pending = new Promise<void>(() => undefined);
  const onSubmit = vi.fn(() => pending);
  render(<PostForm mode="create" onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText("제목"), "  첫 글  ");
  await userEvent.type(screen.getByLabelText("작성자"), "  민수  ");
  await userEvent.type(screen.getByLabelText("내용"), "  반갑습니다  ");
  await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));
  expect(onSubmit).toHaveBeenCalledWith({ title: "첫 글", author: "민수", content: "반갑습니다" });
  expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
});
```

Add a rejected-submit test asserting values remain and `저장하지 못했습니다. 다시 시도해 주세요.` appears.

- [ ] **Step 2: Run tests to verify component failure**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-form.test.tsx`

Expected: FAIL because `PostForm` does not exist.

- [ ] **Step 3: Implement the accessible controlled form**

```tsx
export function PostForm({ mode, initialValue = EMPTY_DRAFT, cancelHref, onSubmit }: PostFormProps) {
  const [draft, setDraft] = useState(initialValue);
  const [errors, setErrors] = useState<Partial<Record<keyof PostDraft, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // validate trimmed title/author/content, then await onSubmit without clearing draft on failure
}
```

Associate every error with its control via `aria-describedby`, set `aria-invalid`, use an `aria-live="polite"` submission error, and link a cancel button to the appropriate detail or list destination supplied as `cancelHref`.

- [ ] **Step 4: Verify and commit the form**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-form.test.tsx`

Expected: all form tests pass.

```bash
git add frontend/test/superpowers_framework/src/features/posts
git commit -m "feat: add reusable post form"
```

### Task 4: Post List and Home Route

**Files:**
- Create: `frontend/test/superpowers_framework/src/features/posts/components/post-list.tsx`
- Create: `frontend/test/superpowers_framework/src/features/posts/components/request-state.tsx`
- Create: `frontend/test/superpowers_framework/src/features/posts/__tests__/post-list.test.tsx`
- Create: `frontend/test/superpowers_framework/src/app/page.tsx`

**Interfaces:**
- Consumes: `listPosts()` and `Post[]`.
- Produces: `PostList({ posts })`, `RequestError({ message, onRetry })`, and a client home route with load/retry behavior.

- [ ] **Step 1: Write failing list state tests**

```tsx
it("renders post metadata and detail links", () => {
  render(<PostList posts={[samplePost]} />);
  expect(screen.getByRole("link", { name: samplePost.title })).toHaveAttribute("href", `/posts/${samplePost.id}`);
  expect(screen.getByText(samplePost.author)).toBeInTheDocument();
  expect(screen.getByText("2026. 8. 17.")).toBeInTheDocument();
});

it("renders an actionable empty state", () => {
  render(<PostList posts={[]} />);
  expect(screen.getByText("아직 작성된 게시글이 없습니다.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "첫 글 작성하기" })).toHaveAttribute("href", "/posts/new");
});
```

- [ ] **Step 2: Run tests to verify list failure**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-list.test.tsx`

Expected: FAIL because `PostList` does not exist.

- [ ] **Step 3: Implement list, request state, and home route**

Render a semantic list and `<time dateTime={post.createdAt}>`. The client home route calls `listPosts()` in an effect, displays `게시글을 불러오는 중입니다…`, and increments a retry key when `다시 시도` is pressed.

```tsx
<header className="page-header">
  <div><p className="eyebrow">BOARD</p><h1>작은 게시판</h1></div>
  <Link className="button button-primary" href="/posts/new">새 글 작성</Link>
</header>
```

- [ ] **Step 4: Verify and commit the list screen**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-list.test.tsx && npm run lint`

Expected: list tests and lint pass.

```bash
git add frontend/test/superpowers_framework/src
git commit -m "feat: add post list screen"
```

### Task 5: Create and Edit Routes

**Files:**
- Create: `frontend/test/superpowers_framework/src/app/posts/new/page.tsx`
- Create: `frontend/test/superpowers_framework/src/app/posts/[id]/edit/page.tsx`
- Create: `frontend/test/superpowers_framework/src/app/posts/__tests__/editor-pages.test.tsx`

**Interfaces:**
- Consumes: `PostForm`, `createPost`, `getPost`, `updatePost`, Next.js `useRouter`, and async route `params` where applicable.
- Produces: create navigation to `/posts/{created.id}` and edit navigation to `/posts/{id}` while preserving `createdAt` server-side.

- [ ] **Step 1: Write failing route behavior tests**

```tsx
it("creates a post then routes to its detail", async () => {
  vi.mocked(createPost).mockResolvedValue({ ...draft, id: "9", createdAt: NOW });
  render(<NewPostPage />);
  await fillAndSubmitForm(draft);
  expect(createPost).toHaveBeenCalledWith(draft);
  expect(push).toHaveBeenCalledWith("/posts/9");
});

it("loads and updates an existing post", async () => {
  vi.mocked(getPost).mockResolvedValue(existingPost);
  render(<EditPostPage params={Promise.resolve({ id: "3" })} />);
  expect(await screen.findByDisplayValue(existingPost.title)).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText("제목"));
  await userEvent.type(screen.getByLabelText("제목"), "수정 제목");
  await userEvent.click(screen.getByRole("button", { name: "변경 내용 저장" }));
  expect(updatePost).toHaveBeenCalledWith("3", { ...draft, title: "수정 제목" });
});
```

Also cover edit loading, retryable failure, and 404 copy/link.

- [ ] **Step 2: Run tests to verify route failure**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/app/posts/__tests__/editor-pages.test.tsx`

Expected: FAIL because the editor pages do not exist.

- [ ] **Step 3: Implement create and edit route clients**

Use `"use client"`; await async params with `use(params)`. Pass `cancelHref="/"` in create mode and `cancelHref={\`/posts/${id}\`}` in edit mode. Convert 404 into `게시글을 찾을 수 없습니다.` with a list link; other failures use `RequestError` with a real retry callback.

- [ ] **Step 4: Verify and commit editor routes**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/app/posts/__tests__/editor-pages.test.tsx`

Expected: all editor route tests pass.

```bash
git add frontend/test/superpowers_framework/src/app/posts frontend/test/superpowers_framework/src/features/posts/components/post-form.tsx
git commit -m "feat: add post create and edit routes"
```

### Task 6: Detail and Delete Route

**Files:**
- Create: `frontend/test/superpowers_framework/src/features/posts/components/post-detail.tsx`
- Create: `frontend/test/superpowers_framework/src/features/posts/__tests__/post-detail.test.tsx`
- Create: `frontend/test/superpowers_framework/src/app/posts/[id]/page.tsx`

**Interfaces:**
- Consumes: `Post`, `getPost(id)`, `deletePost(id)`, `window.confirm`, and `router.push`.
- Produces: `PostDetail({ post, onDelete })` and a detail route with loading, retry, not-found, delete-cancel, delete-failure, and delete-success behavior.

- [ ] **Step 1: Write failing detail and deletion tests**

```tsx
it("renders the full post and edit destination", () => {
  render(<PostDetail post={samplePost} onDelete={vi.fn()} />);
  expect(screen.getByRole("heading", { name: samplePost.title })).toBeInTheDocument();
  expect(screen.getByText(samplePost.content)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute("href", `/posts/${samplePost.id}/edit`);
});

it("does not delete when confirmation is cancelled", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const onDelete = vi.fn();
  render(<PostDetail post={samplePost} onDelete={onDelete} />);
  await userEvent.click(screen.getByRole("button", { name: "삭제" }));
  expect(onDelete).not.toHaveBeenCalled();
});
```

Add tests for disabled `삭제 중…`, failed-delete live error, detail 404, retry, and successful push to `/`.

- [ ] **Step 2: Run tests to verify detail failure**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-detail.test.tsx`

Expected: FAIL because `PostDetail` does not exist.

- [ ] **Step 3: Implement detail UI and route coordinator**

Preserve newlines with CSS `white-space: pre-wrap`; render author and localized `<time>`. Confirm with `이 게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.` Only invoke `onDelete` after confirmation and keep the screen intact on rejection.

- [ ] **Step 4: Verify and commit detail behavior**

Run: `cd frontend/test/superpowers_framework && npm run test:run -- src/features/posts/__tests__/post-detail.test.tsx && npm run lint`

Expected: detail tests and lint pass.

```bash
git add frontend/test/superpowers_framework/src
git commit -m "feat: add post detail and deletion"
```

### Task 7: End-to-End Acceptance and Documentation

**Files:**
- Create: `frontend/test/superpowers_framework/playwright.config.ts`
- Create: `frontend/test/superpowers_framework/tests/e2e/post-crud.spec.ts`
- Create: `frontend/test/superpowers_framework/README.md`
- Modify: `frontend/test/superpowers_framework/package.json`

**Interfaces:**
- Consumes: working app at port 3000 and json-server at port 4000.
- Produces: deterministic CRUD acceptance test, documented setup, and final verification commands.

- [ ] **Step 1: Write the failing browser acceptance test**

```ts
test("a visitor can create, read, update, and delete a post", async ({ page }) => {
  const title = `E2E 게시글 ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("link", { name: "새 글 작성" }).click();
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("작성자").fill("테스트 작성자");
  await page.getByLabel("내용").fill("처음 작성한 본문입니다.");
  await page.getByRole("button", { name: "게시글 등록" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: "수정" }).click();
  await page.getByLabel("내용").fill("수정한 본문입니다.");
  await page.getByRole("button", { name: "변경 내용 저장" }).click();
  await expect(page.getByText("수정한 본문입니다.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});
```

- [ ] **Step 2: Run E2E once to expose missing configuration or behavior**

Run: `cd frontend/test/superpowers_framework && npm run test:e2e`

Expected: FAIL until Playwright web servers and browser prerequisites are configured.

- [ ] **Step 3: Configure Playwright and write the README**

Configure two `webServer` entries: `npm run mock` at `http://127.0.0.1:4000/posts` and `npm run dev` at `http://127.0.0.1:3000`; use Chromium and retain traces on first retry. Document Node prerequisites, `npm install`, `npm run dev:all`, both URLs, test commands, data reset via `db.json`, and the demo-only persistence limitations.

- [ ] **Step 4: Run the complete verification suite**

Run: `cd frontend/test/superpowers_framework && npm run test:run && npm run lint && npm run build && npm run test:e2e`

Expected: all unit/component tests pass, lint reports zero errors, production build succeeds, and the CRUD browser test passes.

- [ ] **Step 5: Commit acceptance coverage and documentation**

```bash
git add frontend/test/superpowers_framework
git commit -m "test: verify board CRUD flow"
```

### Task 8: Final Manual Accessibility and Responsive Check

**Files:**
- Modify if needed: `frontend/test/superpowers_framework/src/app/globals.css`
- Modify if needed: focused component or test files associated with a discovered issue.

**Interfaces:**
- Consumes: completed application and mock server.
- Produces: verified 375px and 1280px layouts with keyboard-operable CRUD controls and no browser console errors.

- [ ] **Step 1: Start the application and inspect both target widths**

Run: `cd frontend/test/superpowers_framework && npm run dev:all`

Expected: app and API become ready without startup errors.

- [ ] **Step 2: Verify the complete user story manually or with browser automation**

At 375×812 and 1280×900, traverse list → create → detail → edit → detail → delete. Verify visible focus, labels announced with inputs, long title/content wrapping, no horizontal scrolling, preserved values after a simulated failed request, and no console errors.

- [ ] **Step 3: Add a regression test before correcting any discovered defect**

Run the narrowest affected test file and confirm the new assertion fails for the observed behavior; then make the smallest CSS or component correction and rerun it to PASS.

- [ ] **Step 4: Re-run final automated verification**

Run: `cd frontend/test/superpowers_framework && npm run test:run && npm run lint && npm run build && npm run test:e2e`

Expected: every command exits 0.

- [ ] **Step 5: Commit only if the manual check required changes**

```bash
git add frontend/test/superpowers_framework
git commit -m "fix: polish board accessibility and layout"
```
