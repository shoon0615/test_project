import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const posts = new Map()
const publicFiles = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
])

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(data))
}

async function readPost(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size <= 64 * 1024) chunks.push(chunk)
  }
  if (size > 64 * 1024) {
    return { status: 413, error: '요청 데이터가 너무 큽니다.' }
  }

  let input
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return { status: 400, error: 'JSON 형식을 확인해 주세요.' }
  }

  const title = typeof input?.title === 'string' ? input.title.trim() : ''
  const content = typeof input?.content === 'string' ? input.content.trim() : ''
  if (!title || title.length > 100 || !content || content.length > 5000) {
    return { status: 400, error: '제목은 1~100자, 본문은 1~5,000자로 입력해 주세요.' }
  }
  return { title, content }
}

async function handleRequest(request, response) {
  const { pathname } = new URL(request.url, 'http://localhost')
  const { method } = request
  const file = publicFiles.get(pathname)
  if (file && method === 'GET') {
    const [name, type] = file
    const body = readFileSync(new URL('public/' + name, import.meta.url))
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

  // 본문을 받는 동안 다른 요청이 글을 지울 수 있으므로 그 뒤에 글을 찾는다.
  let input
  if (method === 'POST' || method === 'PUT') {
    input = await readPost(request)
    if (input.error) return sendJson(response, input.status, { error: input.error })
  }

  if (method === 'POST') {
    const post = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
    posts.set(post.id, post)
    response.setHeader('Location', '/api/posts/' + post.id)
    return sendJson(response, 201, post)
  }

  const post = posts.get(id)
  if (!post) return sendJson(response, 404, { error: '게시글을 찾을 수 없습니다.' })
  if (method === 'GET') return sendJson(response, 200, post)
  if (method === 'PUT') {
    const updated = { ...post, ...input }
    posts.set(id, updated)
    return sendJson(response, 200, updated)
  }

  posts.delete(id)
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
  console.log(`http://localhost:${server.address().port}`)
})
