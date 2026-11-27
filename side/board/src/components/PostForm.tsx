'use client'

import { useState, type FormEvent } from 'react'
import { errorMessage, savePost } from '@/api'
import { Dialog } from '@/components/Dialog'
import type { Post } from '@/post'

type PostFormProps = {
  post?: Post
  onClose: () => void
  onSave: (post: Post) => void
}

export function PostForm({ post, onClose, onSave }: PostFormProps) {
  const [title, setTitle] = useState(post?.title ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setStatus('저장 중입니다.')
    try {
      const saved = await savePost({ title, content }, post?.id)
      onSave(saved)
    } catch (error) {
      setStatus(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <Dialog title={post ? '게시글 수정' : '글쓰기'} busy={busy} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="title">제목</label>
          <input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required />
          <label htmlFor="content">본문</label>
          <textarea id="content" name="content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={7} required />
          <div className="actions">
            <button type="button" onClick={onClose}>취소</button>
            <button className="primary" type="submit">저장</button>
          </div>
        </fieldset>
        <p role="status">{status}</p>
      </form>
    </Dialog>
  )
}
