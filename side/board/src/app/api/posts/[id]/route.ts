import { postJson, postNotFound, readPostInput } from '@/server/post-http'
import { findPost, removePost, updatePost } from '@/server/posts'

type PostRoute = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: PostRoute) {
  const { id } = await params
  const post = await findPost(id)
  return post ? postJson(post) : postNotFound()
}

export async function PUT(request: Request, { params }: PostRoute) {
  const { id } = await params
  const input = await readPostInput(request)
  if ('error' in input) return postJson({ error: input.error }, input.status)

  const post = await updatePost(id, input)
  return post ? postJson(post) : postNotFound()
}

export async function DELETE(_request: Request, { params }: PostRoute) {
  const { id } = await params
  return (await removePost(id)) ? new Response(null, { status: 204 }) : postNotFound()
}
