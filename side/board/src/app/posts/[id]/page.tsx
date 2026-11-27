import { notFound } from 'next/navigation'
import { PostActions } from '@/components/PostActions'
import { formatPostDate } from '@/server/post-date'
import { findPost } from '@/server/posts'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await findPost(id)
  if (!post) notFound()

  return (
    <main>
      <article>
        <h1>{post.title}</h1>
        <p className="muted"><time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time></p>
        <p id="post-content">{post.content}</p>
        <PostActions key={post.id} post={post} />
      </article>
    </main>
  )
}
