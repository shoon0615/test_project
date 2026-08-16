import Link from "next/link";
import type { Post } from "../model/post";

export type PostListProps = {
  posts: Post[];
};

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(createdAt));
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <section className="status-panel" aria-labelledby="empty-posts-heading">
        <h2 id="empty-posts-heading">게시글이 없습니다</h2>
        <p>아직 작성된 게시글이 없습니다.</p>
        <Link className="button" href="/posts/new">
          첫 글 작성하기
        </Link>
      </section>
    );
  }

  return (
    <ul aria-label="게시글 목록">
      {posts.map((post) => (
        <li key={post.id}>
          <article>
            <h2>
              <Link href={`/posts/${post.id}`}>{post.title}</Link>
            </h2>
            <p>
              <span>{post.author}</span>
              {" · "}
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
