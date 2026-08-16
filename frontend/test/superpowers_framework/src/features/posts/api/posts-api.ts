import { ApiError } from "../model/post";
import type { Post, PostDraft } from "../model/post";

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = { ...init };

  if (init?.body !== undefined) {
    requestInit.headers = {
      "Content-Type": "application/json",
      ...init.headers,
    };
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, requestInit);

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError("게시글을 찾을 수 없습니다.", 404);
    }

    throw new ApiError("요청을 처리하지 못했습니다.", response.status);
  }

  if (init?.method === "DELETE") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listPosts(): Promise<Post[]> {
  return request<Post[]>("/posts").then((posts) =>
    [...posts].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    ),
  );
}

export function getPost(id: string): Promise<Post> {
  return request<Post>(`/posts/${encodeURIComponent(id)}`);
}

export function createPost(draft: PostDraft): Promise<Post> {
  return request<Post>("/posts", {
    method: "POST",
    body: JSON.stringify({ ...draft, createdAt: new Date().toISOString() }),
  });
}

export function updatePost(id: string, draft: PostDraft): Promise<Post> {
  return request<Post>(`/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
}

export function deletePost(id: string): Promise<void> {
  return request<void>(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export { ApiError };
