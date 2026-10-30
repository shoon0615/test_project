"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPosts } from "@/features/posts/api/posts-api";
import { PostList } from "@/features/posts/components/post-list";
import { RequestError } from "@/features/posts/components/request-state";
import type { Post } from "@/features/posts/model/post";

const LOAD_ERROR_MESSAGE = "게시글을 불러오지 못했습니다. 다시 시도해 주세요.";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listPosts().then(
      (nextPosts) => {
        if (!cancelled) {
          setPosts(nextPosts);
        }
      },
      () => {
        if (!cancelled) {
          setError(LOAD_ERROR_MESSAGE);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleRetry = () => {
    setPosts(null);
    setError("");
    setRetryKey((key) => key + 1);
  };

  return (
    <main className="shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">BOARD</p>
          <h1>작은 게시판</h1>
        </div>
        <Link className="button button-primary" href="/posts/new">
          새 글 작성
        </Link>
      </header>

      {posts ? <PostList posts={posts} /> : null}
      {error ? (
        <RequestError message={error} onRetry={handleRetry} />
      ) : null}
      {!posts && !error ? <p role="status">게시글을 불러오는 중입니다…</p> : null}
    </main>
  );
}
