import { randomUUID } from 'node:crypto'
import type { Post, PostInput } from '@/post'

async function requestPosts(path: string, options?: RequestInit): Promise<Response> {
  const baseUrl = (process.env.JSON_SERVER_URL ?? 'http://127.0.0.1:3001').replace(/\/+$/, '')
  return fetch(baseUrl + '/posts' + path, { ...options, cache: 'no-store' })
}

function jsonBody(method: 'POST' | 'PATCH', body: PostInput): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function requireSuccess(response: Response): void {
  if (!response.ok) throw new Error(`json-server 요청 실패 (${response.status})`)
}

async function requestPost(id: string, options?: RequestInit): Promise<Response | undefined> {
  // URL이 점 경로를 해석하기 전에 존재할 수 없는 ID를 걸러낸다.
  if (id === '.' || id === '..') return undefined

  const response = await requestPosts('/' + encodeURIComponent(id), options)
  if (response.status === 404) return undefined
  requireSuccess(response)
  return response
}

export async function listPosts(): Promise<Post[]> {
  const response = await requestPosts('')
  requireSuccess(response)
  const posts: Post[] = await response.json()
  return posts.reverse()
}

export async function findPost(id: string): Promise<Post | undefined> {
  const response = await requestPost(id)
  return response?.json()
}

export async function createPost(input: PostInput): Promise<Post> {
  const post = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
  const response = await requestPosts('', jsonBody('POST', post))
  requireSuccess(response)
  return response.json()
}

export async function updatePost(id: string, input: PostInput): Promise<Post | undefined> {
  const response = await requestPost(id, jsonBody('PATCH', input))
  return response?.json()
}

export async function removePost(id: string): Promise<boolean> {
  const response = await requestPost(id, { method: 'DELETE' })
  if (!response) return false
  // json-server는 삭제 결과를 본문으로 보내므로 연결을 재사용할 수 있게 읽는다.
  await response.text()
  return true
}
