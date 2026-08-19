"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { deletePost, getPost, ApiError } from "@/features/posts/api/posts-api";
import { PostDetail } from "@/features/posts/components/post-detail";
import { RequestError } from "@/features/posts/components/request-state";
import type { Post } from "@/features/posts/model/post";
import { useRouter } from "next/navigation";

const LOAD_ERROR_MESSAGE = "게시글을 불러오지 못했습니다. 다시 시도해 주세요.";

type DetailPostPageProps = {
  params: Promise<{ id: string }>;
};

type LoadState = {
  id: string;
  post: Post | null;
  error: "not-found" | "request" | null;
};

export default function DetailPostPage({ params }: DetailPostPageProps) {
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

  const handleDelete = async () => {
    await deletePost(id);
    router.push("/");
  };

  if (error === "not-found") {
    return (
      <main className="shell">
        <section className="status-panel status-panel--error">
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
      <PostDetail key={post.id} post={post} onDelete={handleDelete} />
    </main>
  );
}
