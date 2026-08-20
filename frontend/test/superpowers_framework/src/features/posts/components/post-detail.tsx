import Link from "next/link";
import { useState } from "react";
import type { Post } from "../model/post";

export type PostDetailProps = {
  post: Post;
  onDelete: () => Promise<void> | void;
};

const DELETE_ERROR_MESSAGE = "게시글을 삭제하지 못했습니다. 다시 시도해 주세요.";
const DELETE_CONFIRMATION_MESSAGE =
  "이 게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.";

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(createdAt));
}

export function PostDetail({ post, onDelete }: PostDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!window.confirm(DELETE_CONFIRMATION_MESSAGE)) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);

    try {
      await onDelete();
    } catch {
      setDeleteError(DELETE_ERROR_MESSAGE);
      setIsDeleting(false);
    }
  };

  return (
    <article>
      <header className="page-header">
        <div>
          <p className="eyebrow">POST</p>
          <h1>{post.title}</h1>
          <p>
            <span>{post.author}</span>
            {" · "}
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          </p>
        </div>
        <div className="button-group">
          <Link className="button" href={`/posts/${encodeURIComponent(post.id)}/edit`}>
            수정
          </Link>
          <button className="button" type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </header>

      {deleteError ? <p role="alert">{deleteError}</p> : null}
      <p className="post-content">{post.content}</p>
    </article>
  );
}
