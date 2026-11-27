'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deletePost, errorMessage } from '@/api'
import { PostForm } from '@/components/PostForm'
import type { Post } from '@/post'

export function PostActions({ post }: { post: Post }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function remove() {
    if (busy || !window.confirm('이 게시글을 삭제할까요?')) return
    setBusy(true)
    setStatus('삭제 중입니다.')
    try {
      await deletePost(post.id)
      router.replace('/')
      router.refresh()
    } catch (error) {
      setStatus(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <>
      <p role="status">{status}</p>
      <div className="actions">
        <Link className="button-link" href="/" prefetch={false}>목록</Link>
        <button type="button" disabled={busy} onClick={() => setEditing(true)}>수정</button>
        <button className="danger" type="button" disabled={busy} onClick={remove}>삭제</button>
      </div>
      {editing && (
        <PostForm
          post={post}
          onClose={() => setEditing(false)}
          onSave={() => {
            setEditing(false)
            setStatus('게시글을 저장했습니다.')
            router.refresh()
          }}
        />
      )}
    </>
  )
}
