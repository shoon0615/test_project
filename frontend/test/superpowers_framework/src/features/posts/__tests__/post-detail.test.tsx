import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailPostPage from "@/app/posts/[id]/page";
import { deletePost, getPost } from "@/features/posts/api/posts-api";
import { PostDetail } from "../components/post-detail";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/posts/api/posts-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/posts/api/posts-api")>();

  return {
    ...actual,
    deletePost: vi.fn(),
    getPost: vi.fn(),
  };
});

const samplePost = {
  id: "3",
  title: "여름 휴가 계획",
  author: "지수",
  content: "첫 번째 문단\n두 번째 문단",
  createdAt: "2026-08-17T09:00:00.000Z",
};

const nextPost = {
  id: "4",
  title: "다음 게시글",
  author: "하림",
  content: "다음 본문",
  createdAt: "2026-08-18T09:00:00.000Z",
};

function DetailPageContainer({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>페이지를 준비하는 중입니다…</p>}>
      <DetailPostPage params={params} />
    </Suspense>
  );
}

async function renderDetailPage(params = Promise.resolve({ id: "3" })) {
  let view: ReturnType<typeof render>;

  await act(async () => {
    view = render(<DetailPageContainer params={params} />);
  });

  return view!;
}

function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject: reject!, resolve: resolve! };
}

afterEach(() => {
  push.mockReset();
  vi.mocked(deletePost).mockReset();
  vi.mocked(getPost).mockReset();
  vi.restoreAllMocks();
});

describe("post detail", () => {
  it("renders the full post, preserves content newlines, and links to edit", () => {
    render(<PostDetail post={samplePost} onDelete={vi.fn()} />);

    expect(screen.getByRole("heading", { name: samplePost.title })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === samplePost.content),
    ).toHaveClass("post-content");
    expect(screen.getByText(samplePost.author)).toBeInTheDocument();
    expect(screen.getByText("2026. 8. 17.")).toHaveAttribute(
      "dateTime",
      samplePost.createdAt,
    );
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      "/posts/3/edit",
    );
    expect(screen.getByRole("link", { name: "목록" })).toHaveAttribute("href", "/");
  });

  it("encodes hostile post IDs in the edit destination", () => {
    const hostilePost = { ...samplePost, id: "summer/plan?draft#section" };

    render(<PostDetail post={hostilePost} onDelete={vi.fn()} />);

    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      "/posts/summer%2Fplan%3Fdraft%23section/edit",
    );
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PostDetail post={samplePost} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "이 게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.",
    );
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: samplePost.title })).toBeInTheDocument();
  });

  it("disables deletion while the confirmed delete is pending", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const pendingDelete = deferred<void>();
    const user = userEvent.setup();
    render(<PostDetail post={samplePost} onDelete={() => pendingDelete.promise} />);

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(screen.getByRole("button", { name: "삭제 중…" })).toBeDisabled();
    pendingDelete.resolve();
  });

  it("keeps the post visible and announces a failed delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <PostDetail post={samplePost} onDelete={() => Promise.reject(new Error("network"))} />,
    );

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "게시글을 삭제하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(screen.getByRole("heading", { name: samplePost.title })).toBeInTheDocument();
  });

  it("shows loading while the detail post is requested", async () => {
    const pendingPost = deferred<typeof samplePost>();
    vi.mocked(getPost).mockReturnValue(pendingPost.promise);

    await renderDetailPage();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "게시글을 불러오는 중입니다…",
    );
    await act(async () => {
      pendingPost.resolve(samplePost);
    });
  });

  it("shows a list link when the detail post does not exist", async () => {
    const { ApiError } = await import("@/features/posts/api/posts-api");
    vi.mocked(getPost).mockRejectedValue(
      new ApiError("게시글을 찾을 수 없습니다.", 404),
    );

    await renderDetailPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("게시글을 찾을 수 없습니다.");
    expect(screen.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/");
  });

  it("retries a failed detail request", async () => {
    vi.mocked(getPost)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(samplePost);
    const user = userEvent.setup();

    await renderDetailPage();

    expect(
      await screen.findByText("게시글을 불러오지 못했습니다. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("heading", { name: samplePost.title })).toBeInTheDocument();
    expect(getPost).toHaveBeenLastCalledWith("3");
  });

  it("deletes the current post and routes to the list", async () => {
    vi.mocked(getPost).mockResolvedValue(samplePost);
    vi.mocked(deletePost).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    await renderDetailPage();
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    expect(deletePost).toHaveBeenCalledWith("3");
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows loading instead of a previous post when the route ID changes", async () => {
    const pendingNextPost = deferred<typeof nextPost>();
    vi.mocked(getPost)
      .mockResolvedValueOnce(samplePost)
      .mockReturnValueOnce(pendingNextPost.promise);
    const view = await renderDetailPage();

    expect(await screen.findByRole("heading", { name: samplePost.title })).toBeInTheDocument();

    await act(async () => {
      view.rerender(<DetailPageContainer params={Promise.resolve({ id: "4" })} />);
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "게시글을 불러오는 중입니다…",
    );
    pendingNextPost.resolve(nextPost);
    expect(await screen.findByRole("heading", { name: nextPost.title })).toBeInTheDocument();
  });
});
