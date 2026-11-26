import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import type { Post, PostInput } from './post.js'

type PostInputError = { status: number; error: string }

const posts = new Map<string, Post>()
const publicFiles = new Map([
  ['/', ['../public/index.html', 'text/html']],
  ['/style.css', ['../public/style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
])

function sendJson(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(data))
}

async function readPost(request: IncomingMessage): Promise<PostInput | PostInputError> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size <= 64 * 1024) chunks.push(chunk)
  }
  if (size > 64 * 1024) {
    return { status: 413, error: '요청 데이터가 너무 큽니다.' }
  }

  let input: unknown
  try {
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

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  const method = request.method ?? ''
  const file = publicFiles.get(pathname)
  if (file && method === 'GET') {
    const [name, type] = file
    const body = readFileSync(new URL(name, import.meta.url))
    response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' })
    response.end(body)
    return
  }

  const collection = pathname === '/api/posts'
  const id = /^\/api\/posts\/([^/]+)$/.exec(pathname)?.[1]
  if (!collection && !id) {
    return sendJson(response, 404, { error: '요청한 주소를 찾을 수 없습니다.' })
  }

  const allowed = collection ? ['GET', 'POST'] : ['GET', 'PUT', 'DELETE']
  if (!allowed.includes(method)) {
    response.setHeader('Allow', allowed.join(', '))
    return sendJson(response, 405, { error: '지원하지 않는 요청 방식입니다.' })
  }

  if (collection && method === 'GET') {
    return sendJson(response, 200, [...posts.values()].reverse())
  }

  if (method === 'POST' || method === 'PUT') {
    const input = await readPost(request)
    if ('error' in input) return sendJson(response, input.status, { error: input.error })

    if (method === 'POST') {
      const post: Post = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
      posts.set(post.id, post)
      response.setHeader('Location', '/api/posts/' + post.id)
      return sendJson(response, 201, post)
    }

    // 본문을 받는 동안 글이 삭제될 수도 있으므로 검증 뒤에 조회한다.
    const post = id ? posts.get(id) : undefined
    if (!post) return sendJson(response, 404, { error: '게시글을 찾을 수 없습니다.' })
    const updated: Post = { ...post, ...input }
    posts.set(post.id, updated)
    return sendJson(response, 200, updated)
  }

  const post = id ? posts.get(id) : undefined
  if (!post) return sendJson(response, 404, { error: '게시글을 찾을 수 없습니다.' })
  if (method === 'GET') return sendJson(response, 200, post)

  posts.delete(post.id)
  response.writeHead(204).end()
}

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response)
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: '서버에서 요청을 처리하지 못했습니다.' })
  }
})

server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1', () => {
  const address = server.address()
  if (address && typeof address === 'object') {
    console.log(`http://localhost:${address.port}`)
  }
})
