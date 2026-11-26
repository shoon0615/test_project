import type { Post, PostInput } from './post.js'

const list = element<HTMLElement>('posts')
const status = element<HTMLElement>('status')
const retry = element<HTMLButtonElement>('retry')
const detail = element<HTMLDialogElement>('detail')
const postTitle = element<HTMLElement>('post-title')
const postDate = element<HTMLElement>('post-date')
const postContent = element<HTMLElement>('post-content')
const detailStatus = element<HTMLElement>('detail-status')
const edit = element<HTMLButtonElement>('edit-post')
const remove = element<HTMLButtonElement>('delete-post')
const closeDetail = element<HTMLButtonElement>('close-detail')
const editor = element<HTMLDialogElement>('editor')
const editorTitle = element<HTMLElement>('editor-title')
const editorStatus = element<HTMLElement>('editor-status')
const fields = element<HTMLFieldSetElement>('editor-fields')
const form = element<HTMLFormElement>('post-form')
const title = element<HTMLInputElement>('title')
const content = element<HTMLTextAreaElement>('content')

function element<T extends HTMLElement>(id: string): T {
  const found = document.querySelector<T>('#' + id)
  if (!found) throw new Error(`화면에서 #${id} 요소를 찾을 수 없습니다.`)
  return found
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

const newPost = element<HTMLButtonElement>('new-post')
const postsUrl = '/api/posts'
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
let detailRequest: AbortController | undefined
let activePost: Post | null = null
let editedId: string | undefined

async function request(url: string, method = 'GET', data?: PostInput, signal?: AbortSignal): Promise<Response> {
  const options: RequestInit = { method, signal }
  if (data) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(data)
  }

  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.')
  }
  if (!response.ok) {
    const result: { error: string } = await response.json()
    throw new Error(result.error)
  }
  return response
}

async function requestJson<T>(url: string, method = 'GET', data?: PostInput, signal?: AbortSignal): Promise<T> {
  const response = await request(url, method, data, signal)
  return response.json()
}

async function loadPosts(message = '') {
  retry.hidden = true
  try {
    const posts = await requestJson<Post[]>(postsUrl)
    list.replaceChildren()
    for (const post of posts) {
      const row = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = post.title
      button.addEventListener('click', () => showPost(post.id))
      const date = document.createElement('time')
      date.dateTime = post.createdAt
      date.textContent = dateFormat.format(new Date(post.createdAt))
      row.append(button, date)
      list.append(row)
    }
    const count = posts.length ? `게시글 ${posts.length}개` : '게시글이 없습니다.'
    status.textContent = [message, count].filter(Boolean).join(' ')
  } catch (error) {
    status.textContent = [message, errorMessage(error)].filter(Boolean).join(' ')
    retry.hidden = false
  }
}

async function showPost(id: string) {
  detailRequest?.abort()
  const controller = new AbortController()
  detailRequest = controller
  activePost = null
  edit.disabled = true
  remove.disabled = true
  postTitle.textContent = '게시글'
  postDate.textContent = ''
  postContent.textContent = ''
  detailStatus.textContent = '불러오는 중입니다.'
  if (!detail.open) detail.showModal()

  try {
    const post = await requestJson<Post>(postsUrl + '/' + id, 'GET', undefined, controller.signal)
    if (controller.signal.aborted) return
    activePost = post
    postTitle.textContent = post.title
    postDate.textContent = dateFormat.format(new Date(post.createdAt))
    postContent.textContent = post.content
    detailStatus.textContent = ''
    edit.disabled = false
    remove.disabled = false
  } catch (error) {
    if (!controller.signal.aborted) detailStatus.textContent = errorMessage(error)
  }
}

function openEditor(post?: Post | null) {
  editedId = post?.id
  editorTitle.textContent = post ? '게시글 수정' : '글쓰기'
  editorStatus.textContent = ''
  title.value = post?.title ?? ''
  content.value = post?.content ?? ''
  editor.showModal()
}

newPost.addEventListener('click', () => openEditor())
retry.addEventListener('click', () => loadPosts())
edit.addEventListener('click', () => openEditor(activePost))
closeDetail.addEventListener('click', () => detail.close())
detail.addEventListener('cancel', (event) => {
  if (closeDetail.disabled) event.preventDefault()
})
detail.addEventListener('close', () => {
  if (!detail.open) detailRequest?.abort()
})
element<HTMLButtonElement>('cancel-edit').addEventListener('click', () => editor.close())
editor.addEventListener('cancel', (event) => {
  if (fields.disabled) event.preventDefault()
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (fields.disabled) return
  fields.disabled = true
  editorStatus.textContent = '저장 중입니다.'
  try {
    const data: PostInput = { title: title.value, content: content.value }
    const url = editedId ? postsUrl + '/' + editedId : postsUrl
    const saved = await requestJson<Post>(url, editedId ? 'PUT' : 'POST', data)
    fields.disabled = false
    editor.close()
    await Promise.all([loadPosts('게시글을 저장했습니다.'), showPost(saved.id)])
  } catch (error) {
    editorStatus.textContent = errorMessage(error)
  } finally {
    fields.disabled = false
  }
})

remove.addEventListener('click', async () => {
  if (!activePost || !window.confirm('이 게시글을 삭제할까요?')) return
  edit.disabled = true
  remove.disabled = true
  closeDetail.disabled = true
  detailStatus.textContent = '삭제 중입니다.'
  try {
    await request(postsUrl + '/' + activePost.id, 'DELETE')
    detail.close()
    newPost.focus()
    await loadPosts('게시글을 삭제했습니다.')
  } catch (error) {
    detailStatus.textContent = errorMessage(error)
    edit.disabled = false
    remove.disabled = false
  } finally {
    closeDetail.disabled = false
  }
})

loadPosts()
