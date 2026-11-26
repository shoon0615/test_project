import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { deletePost, getPost, getPosts, savePost } from '@/api'
import type { Post } from '@/post'

type Panel = { kind: 'detail'; id: string } | { kind: 'editor'; post?: Post }
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

export function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [listStatus, setListStatus] = useState('게시글을 불러오는 중입니다.')
  const [listError, setListError] = useState(false)
  const [notice, setNotice] = useState('')
  const [listVersion, setListVersion] = useState(0)
  const [panel, setPanel] = useState<Panel | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getPosts(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setPosts(result)
      setListStatus(result.length ? `게시글 ${result.length}개` : '게시글이 없습니다.')
      setListError(false)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setListStatus(errorMessage(error))
      setListError(true)
    })
    return () => controller.abort()
  }, [listVersion])

  function refreshPosts(message = '') {
    setNotice(message)
    setListVersion((version) => version + 1)
  }

  return (
    <main>
      <header className="page-header">
        <h1>게시판</h1>
        <button className="primary" type="button" onClick={() => setPanel({ kind: 'editor' })}>글쓰기</button>
      </header>
      <p id="status" role="status">{[notice, listStatus].filter(Boolean).join(' ')}</p>
      {listError && <button type="button" onClick={() => refreshPosts()}>다시 불러오기</button>}
      <ul aria-label="게시글 목록">
        {posts.map((post) => (
          <li key={post.id}>
            <button type="button" onClick={() => setPanel({ kind: 'detail', id: post.id })}>{post.title}</button>
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
          </li>
        ))}
      </ul>

      {panel?.kind === 'detail' && (
        <PostDetail
          key={panel.id}
          id={panel.id}
          onClose={() => setPanel(null)}
          onEdit={(post) => setPanel({ kind: 'editor', post })}
          onDelete={() => {
            setPanel(null)
            refreshPosts('게시글을 삭제했습니다.')
          }}
        />
      )}
      {panel?.kind === 'editor' && (
        <PostForm
          post={panel.post}
          onClose={() => setPanel(panel.post ? { kind: 'detail', id: panel.post.id } : null)}
          onSave={(post) => {
            setPanel({ kind: 'detail', id: post.id })
            refreshPosts('게시글을 저장했습니다.')
          }}
        />
      )}
    </main>
  )
}

type DialogProps = {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}

function Dialog({ title, busy, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  )
}

type PostDetailProps = {
  id: string
  onClose: () => void
  onEdit: (post: Post) => void
  onDelete: () => void
}

function PostDetail({ id, onClose, onEdit, onDelete }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [status, setStatus] = useState('불러오는 중입니다.')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getPost(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setPost(result)
      setStatus('')
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setStatus(errorMessage(error))
    })
    return () => controller.abort()
  }, [id])

  async function remove() {
    if (!window.confirm('이 게시글을 삭제할까요?')) return
    setBusy(true)
    setStatus('삭제 중입니다.')
    try {
      await deletePost(id)
      onDelete()
    } catch (error) {
      setStatus(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <Dialog title={post?.title ?? '게시글'} busy={busy} onClose={onClose}>
      {post && (
        <>
          <p className="muted"><time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time></p>
          <p id="post-content">{post.content}</p>
        </>
      )}
      <p role="status">{status}</p>
      <div className="actions">
        <button type="button" disabled={busy} onClick={onClose}>닫기</button>
        <button type="button" disabled={!post || busy} onClick={() => post && onEdit(post)}>수정</button>
        <button className="danger" type="button" disabled={!post || busy} onClick={remove}>삭제</button>
      </div>
    </Dialog>
  )
}

type PostFormProps = {
  post?: Post
  onClose: () => void
  onSave: (post: Post) => void
}

function PostForm({ post, onClose, onSave }: PostFormProps) {
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
