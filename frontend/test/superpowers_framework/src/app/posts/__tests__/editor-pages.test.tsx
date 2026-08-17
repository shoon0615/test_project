import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewPostPage from "../new/page";
import EditPostPage from "../[id]/edit/page";
import {
  ApiError,
  createPost,
  getPost,
  updatePost,
} from "@/features/posts/api/posts-api";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/posts/api/posts-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/posts/api/posts-api")>();

  return {
    ...actual,
    createPost: vi.fn(),
    getPost: vi.fn(),
    updatePost: vi.fn(),
  };
});

const draft = {
  title: "새 게시글",
  author: "민수",
  content: "새 본문",
};

const existingPost = {
  id: "3",
  title: "기존 제목",
  author: "지수",
  content: "기존 본문",
  createdAt: "2026-08-17T09:00:00.000Z",
};

const nextPost = {
  id: "4",
  title: "다음 제목",
  author: "하림",
  content: "다음 본문",
  createdAt: "2026-08-18T09:00:00.000Z",
};

function EditPageContainer({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>페이지를 준비하는 중입니다…</p>}>
      <EditPostPage params={params} />
    </Suspense>
  );
}

async function renderEditPage(params = Promise.resolve({ id: "3" })) {
  let view: ReturnType<typeof render>;

  await act(async () => {
    view = render(<EditPageContainer params={params} />);
  });

  return view!;
}

async function fillAndSubmitForm(values: typeof draft, submitLabel: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("제목"), values.title);
  await user.type(screen.getByLabelText("작성자"), values.author);
  await user.type(screen.getByLabelText("내용"), values.content);
  await user.click(screen.getByRole("button", { name: submitLabel }));
}

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve: resolve! };
}

afterEach(() => {
  push.mockReset();
  vi.mocked(createPost).mockReset();
  vi.mocked(getPost).mockReset();
  vi.mocked(updatePost).mockReset();
});

describe("post editor routes", () => {
  it("creates a post then routes to its detail", async () => {
    vi.mocked(createPost).mockResolvedValue({
      ...draft,
      id: "9",
      createdAt: "2026-08-17T09:00:00.000Z",
    });

    render(<NewPostPage />);
    await fillAndSubmitForm(draft, "게시글 등록");

    expect(createPost).toHaveBeenCalledWith(draft);
    expect(push).toHaveBeenCalledWith("/posts/9");
  });

  it("shows loading state while it loads the existing post", async () => {
    const pendingPost = deferred<typeof existingPost>();
    vi.mocked(getPost).mockReturnValue(pendingPost.promise);

    await renderEditPage();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "게시글을 불러오는 중입니다…",
    );

    pendingPost.resolve(existingPost);
    expect(await screen.findByDisplayValue(existingPost.title)).toBeInTheDocument();
  });

  it("loads an existing post, updates its editable fields, and routes to its detail", async () => {
    vi.mocked(getPost).mockResolvedValue(existingPost);
    vi.mocked(updatePost).mockResolvedValue({
      ...existingPost,
      title: "수정 제목",
    });
    const user = userEvent.setup();

    await renderEditPage();

    expect(await screen.findByDisplayValue(existingPost.title)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("제목"));
    await user.type(screen.getByLabelText("제목"), "수정 제목");
    await user.click(screen.getByRole("button", { name: "게시글 수정" }));

    expect(updatePost).toHaveBeenCalledWith("3", {
      title: "수정 제목",
      author: existingPost.author,
      content: existingPost.content,
    });
    expect(push).toHaveBeenCalledWith("/posts/3");
  });

  it("retries a failed edit load", async () => {
    vi.mocked(getPost)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(existingPost);
    const user = userEvent.setup();

    await renderEditPage();

    expect(
      await screen.findByText("게시글을 불러오지 못했습니다. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByDisplayValue(existingPost.title)).toBeInTheDocument();
    expect(getPost).toHaveBeenCalledTimes(2);
    expect(getPost).toHaveBeenLastCalledWith("3");
  });

  it("loads a new ID after a previous not-found error", async () => {
    vi.mocked(getPost)
      .mockRejectedValueOnce(new ApiError("게시글을 찾을 수 없습니다.", 404))
      .mockResolvedValueOnce(nextPost);
    const view = await renderEditPage(Promise.resolve({ id: "missing" }));

    expect(await screen.findByText("게시글을 찾을 수 없습니다.")).toBeInTheDocument();

    await act(async () => {
      view.rerender(<EditPageContainer params={Promise.resolve({ id: "4" })} />);
    });

    expect(await screen.findByDisplayValue(nextPost.title)).toBeInTheDocument();
    expect(getPost).toHaveBeenLastCalledWith("4");
  });

  it("shows loading instead of a previous form when the route ID changes", async () => {
    const pendingNextPost = deferred<typeof nextPost>();
    vi.mocked(getPost)
      .mockResolvedValueOnce(existingPost)
      .mockReturnValueOnce(pendingNextPost.promise);
    const view = await renderEditPage();

    expect(await screen.findByDisplayValue(existingPost.title)).toBeInTheDocument();

    await act(async () => {
      view.rerender(<EditPageContainer params={Promise.resolve({ id: "4" })} />);
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "게시글을 불러오는 중입니다…",
    );

    pendingNextPost.resolve(nextPost);
    expect(await screen.findByDisplayValue(nextPost.title)).toBeInTheDocument();
  });

  it("shows a list link when the edited post does not exist", async () => {
    vi.mocked(getPost).mockRejectedValue(
      new ApiError("게시글을 찾을 수 없습니다.", 404),
    );

    await renderEditPage();

    expect(await screen.findByText("게시글을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/");
  });
});
