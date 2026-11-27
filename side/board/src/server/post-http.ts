import type { PostInput } from '@/post'

type InputError = { status: number; error: string }
const maxBodySize = 64 * 1024

export function postJson(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  return Response.json(data, { status, headers: responseHeaders })
}

export function postNotFound(): Response {
  return postJson({ error: '게시글을 찾을 수 없습니다.' }, 404)
}

export async function readPostInput(request: Request): Promise<PostInput | InputError> {
  let input: unknown
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new Error('본문 없음')

    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBodySize) {
        await reader.cancel()
        return { status: 413, error: '요청 데이터가 너무 큽니다.' }
      }
      chunks.push(value)
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return { status: 400, error: 'JSON 형식을 확인해 주세요.' }
  }

  const fields = typeof input === 'object' && input !== null ? input : {}
  const title = 'title' in fields && typeof fields.title === 'string' ? fields.title.trim() : ''
  const content = 'content' in fields && typeof fields.content === 'string' ? fields.content.trim() : ''
  if (!title || title.length > 100 || !content || content.length > 5000) {
    return { status: 400, error: '제목은 1~100자, 본문은 1~5,000자로 입력해 주세요.' }
  }
  return { title, content }
}
