import type { Post, PostInput } from '@/post'

const postsUrl = '/api/posts'

async function request(url: string, options?: RequestInit): Promise<Response> {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (options?.signal?.aborted) throw error
    throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.')
  }
  if (!response.ok) {
    const result: { error?: string } | null = await response.json().catch(() => null)
    throw new Error(result?.error ?? '요청을 처리하지 못했습니다.')
  }
  return response
}

export async function getPosts(signal: AbortSignal): Promise<Post[]> {
  const response = await request(postsUrl, { signal })
  return response.json()
}

export async function getPost(id: string, signal: AbortSignal): Promise<Post> {
  const response = await request(postsUrl + '/' + id, { signal })
  return response.json()
}

export async function savePost(input: PostInput, id?: string): Promise<Post> {
  const response = await request(id ? postsUrl + '/' + id : postsUrl, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.json()
}

export async function deletePost(id: string): Promise<void> {
  await request(postsUrl + '/' + id, { method: 'DELETE' })
}
