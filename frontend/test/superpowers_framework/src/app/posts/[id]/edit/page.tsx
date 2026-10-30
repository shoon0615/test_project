"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getPost, updatePost, ApiError } from "@/features/posts/api/posts-api";
import { PostForm } from "@/features/posts/components/post-form";
import { RequestError } from "@/features/posts/components/request-state";
import type { Post, PostDraft } from "@/features/posts/model/post";
import { useRouter } from "next/navigation";

const LOAD_ERROR_MESSAGE = "게시글을 불러오지 못했습니다. 다시 시도해 주세요.";

type EditPostPageProps = {
  params: Promise<{ id: string }>;
};

type LoadState = {
  id: string;
  post: Post | null;
  error: "not-found" | "request" | null;
};

export default function EditPostPage({ params }: EditPostPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({
    id: "",
    post: null,
    error: null,
  });
  const [retryKey, setRetryKey] = useState(0);
  const isCurrentLoad = loadState.id === id;
  const post = isCurrentLoad ? loadState.post : null;
  const error = isCurrentLoad ? loadState.error : null;

  useEffect(() => {
    let cancelled = false;

    getPost(id).then(
      (nextPost) => {
        if (!cancelled) {
          setLoadState({ id, post: nextPost, error: null });
        }
      },
      (loadError: unknown) => {
        if (cancelled) {
          return;
        }

        setLoadState({
          id,
          post: null,
          error: loadError instanceof ApiError && loadError.status === 404 ? "not-found" : "request",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id, retryKey]);

  const handleRetry = () => {
    setLoadState({ id, post: null, error: null });
    setRetryKey((currentKey) => currentKey + 1);
  };

  const handleSubmit = async (draft: PostDraft) => {
    await updatePost(id, draft);
    router.push(`/posts/${id}`);
  };

  if (error === "not-found") {
    return (
      <main className="shell">
        <section className="status-panel status-panel--error" role="alert">
          <p>게시글을 찾을 수 없습니다.</p>
          <Link className="button" href="/">
            목록으로
          </Link>
        </section>
      </main>
    );
  }

  if (error === "request") {
    return (
      <main className="shell">
        <RequestError message={LOAD_ERROR_MESSAGE} onRetry={handleRetry} />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="shell">
        <p role="status">게시글을 불러오는 중입니다…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <PostForm
        mode="edit"
        initialValue={{
          title: post.title,
          author: post.author,
          content: post.content,
        }}
        cancelHref={`/posts/${id}`}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
