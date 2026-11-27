import { postJson, readPostInput } from '@/server/post-http'
import { createPost, listPosts } from '@/server/posts'

export function GET() {
  return postJson(listPosts())
}

export async function POST(request: Request) {
  const input = await readPostInput(request)
  if ('error' in input) return postJson({ error: input.error }, input.status)

  const post = createPost(input)
  return postJson(post, 201, { Location: '/api/posts/' + post.id })
}
