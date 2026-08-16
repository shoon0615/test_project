import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../api/posts-api";

const draft = { title: "새 글", author: "민수", content: "본문" };

describe("posts api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sorts posts newest first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "1",
              title: "먼저",
              author: "민수",
              content: "A",
              createdAt: "2026-08-16T09:00:00.000Z",
            },
            {
              id: "2",
              title: "나중",
              author: "지수",
              content: "B",
              createdAt: "2026-08-17T09:00:00.000Z",
            },
          ]),
        ),
      ),
    );

    await expect(listPosts()).resolves.toMatchObject([{ id: "2" }, { id: "1" }]);
  });

  it("gets a post detail with an encoded id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "hello world" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPost("hello world")).resolves.toMatchObject({ id: "hello world" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/posts/hello%20world", {});
  });

  it("creates a post with a generated ISO createdAt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "3", ...draft }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await createPost(draft);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, string>;
    expect(body).toMatchObject(draft);
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(request).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("keeps createdAt out of PATCH data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updatePost("1", { title: "수정", author: "민수", content: "본문" });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      title: "수정",
      author: "민수",
      content: "본문",
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("deletes a post without trying to parse a response body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deletePost("1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/posts/1", { method: "DELETE" });
  });

  it("maps a missing post to the not-found ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(getPost("missing")).rejects.toEqual(
      new ApiError("게시글을 찾을 수 없습니다.", 404),
    );
  });

  it("maps other non-OK responses to a generic ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(listPosts()).rejects.toEqual(new ApiError("요청을 처리하지 못했습니다.", 500));
  });
});
