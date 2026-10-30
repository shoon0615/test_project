import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "../page";
import { listPosts } from "@/features/posts/api/posts-api";

vi.mock("@/features/posts/api/posts-api", () => ({
  listPosts: vi.fn(),
}));

const samplePost = {
  id: "3",
  title: "팀에 공유하는 안내",
  author: "서연",
  content: "모두가 읽어 보면 좋을 내용을 공유합니다.",
  createdAt: "2026-08-17T09:00:00.000Z",
};

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve: resolve! };
}

afterEach(() => {
  vi.mocked(listPosts).mockReset();
});

describe("HomePage", () => {
  it("shows loading while posts are requested", async () => {
    const pendingPosts = deferred<(typeof samplePost)[]>();
    vi.mocked(listPosts).mockReturnValue(pendingPosts.promise);

    render(<HomePage />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "게시글을 불러오는 중입니다…",
    );

    await act(async () => {
      pendingPosts.resolve([samplePost]);
    });
  });

  it("shows a retryable error when loading fails", async () => {
    vi.mocked(listPosts).mockRejectedValue(new Error("network"));

    render(<HomePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "게시글을 불러오지 못했습니다. 다시 시도해 주세요.",
    );
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("retries a failed request and renders the loaded posts", async () => {
    vi.mocked(listPosts)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([samplePost]);
    const user = userEvent.setup();

    render(<HomePage />);
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("link", { name: samplePost.title })).toHaveAttribute(
      "href",
      "/posts/3",
    );
    expect(listPosts).toHaveBeenCalledTimes(2);
  });

  it("renders posts returned by the API", async () => {
    vi.mocked(listPosts).mockResolvedValue([samplePost]);

    render(<HomePage />);

    expect(await screen.findByRole("link", { name: samplePost.title })).toHaveAttribute(
      "href",
      "/posts/3",
    );
    expect(screen.getByText(samplePost.author)).toBeInTheDocument();
  });
});
