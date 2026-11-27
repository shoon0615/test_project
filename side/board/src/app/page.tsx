import Link from 'next/link'
import { PostWriter } from '@/components/PostWriter'
import { formatPostDate } from '@/server/post-date'
import { listPosts } from '@/server/posts'

export const dynamic = 'force-dynamic'

export default function BoardPage() {
  const posts = listPosts()

  return (
    <main>
      <header className="page-header">
        <h1>게시판</h1>
        <PostWriter />
      </header>
      <p id="status">{posts.length ? `게시글 ${posts.length}개` : '게시글이 없습니다.'}</p>
      <ul aria-label="게시글 목록">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`} prefetch={false}>{post.title}</Link>
            <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
          </li>
        ))}
      </ul>
    </main>
  )
}
