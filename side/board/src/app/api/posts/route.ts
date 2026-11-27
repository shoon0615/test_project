import { postJson, readPostInput } from '@/server/post-http'
import { createPost, listPosts } from '@/server/posts'

export async function GET() {
  return postJson(await listPosts())
}

export async function POST(request: Request) {
  const input = await readPostInput(request)
  if ('error' in input) return postJson({ error: input.error }, input.status)

  const post = await createPost(input)
  return postJson(post, 201, { Location: '/api/posts/' + post.id })
}
