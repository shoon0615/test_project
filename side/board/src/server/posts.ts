import { randomUUID } from 'node:crypto'
import type { Post, PostInput } from '@/post'

const server = globalThis as typeof globalThis & { boardPosts?: Map<string, Post> }

// 페이지와 Route Handler가 같은 Node.js 프로세스에서 저장소를 공유한다.
const posts = (server.boardPosts ??= new Map<string, Post>())

export function listPosts(): Post[] {
  return [...posts.values()].reverse()
}

export function findPost(id: string): Post | undefined {
  return posts.get(id)
}

export function createPost(input: PostInput): Post {
  const post = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
  posts.set(post.id, post)
  return post
}

export function updatePost(id: string, input: PostInput): Post | undefined {
  const post = posts.get(id)
  if (!post) return undefined

  const updated = { ...post, ...input }
  posts.set(id, updated)
  return updated
}

export function removePost(id: string): boolean {
  return posts.delete(id)
}
