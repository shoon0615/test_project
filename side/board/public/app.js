const list = document.querySelector('#posts')
const status = document.querySelector('#status')
const retry = document.querySelector('#retry')
const detail = document.querySelector('#detail')
const postTitle = document.querySelector('#post-title')
const postDate = document.querySelector('#post-date')
const postContent = document.querySelector('#post-content')
const detailStatus = document.querySelector('#detail-status')
const edit = document.querySelector('#edit-post')
const remove = document.querySelector('#delete-post')
const closeDetail = document.querySelector('#close-detail')
const editor = document.querySelector('#editor')
const editorTitle = document.querySelector('#editor-title')
const editorStatus = document.querySelector('#editor-status')
const fields = document.querySelector('#editor-fields')
const form = document.querySelector('#post-form')
const title = document.querySelector('#title')
const content = document.querySelector('#content')

const postsUrl = '/api/posts'
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
let detailRequest
let activePost
let editedId

async function request(url, method = 'GET', data, signal) {
  const options = { method, signal }
  if (data) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(data)
  }

  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.')
  }
  if (response.status === 204) return
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}

async function loadPosts(message = '') {
  retry.hidden = true
  try {
    const posts = await request(postsUrl)
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
    status.textContent = [message, error.message].filter(Boolean).join(' ')
    retry.hidden = false
  }
}

async function showPost(id) {
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
    const post = await request(postsUrl + '/' + id, 'GET', undefined, controller.signal)
    if (controller.signal.aborted) return
    activePost = post
    postTitle.textContent = post.title
    postDate.textContent = dateFormat.format(new Date(post.createdAt))
    postContent.textContent = post.content
    detailStatus.textContent = ''
    edit.disabled = false
    remove.disabled = false
  } catch (error) {
    if (!controller.signal.aborted) detailStatus.textContent = error.message
  }
}

function openEditor(post) {
  editedId = post?.id
  editorTitle.textContent = post ? '게시글 수정' : '글쓰기'
  editorStatus.textContent = ''
  title.value = post?.title ?? ''
  content.value = post?.content ?? ''
  editor.showModal()
}

document.querySelector('#new-post').addEventListener('click', () => openEditor())
retry.addEventListener('click', () => loadPosts())
edit.addEventListener('click', () => openEditor(activePost))
closeDetail.addEventListener('click', () => detail.close())
detail.addEventListener('cancel', (event) => {
  if (closeDetail.disabled) event.preventDefault()
})
detail.addEventListener('close', () => {
  if (!detail.open) detailRequest?.abort()
})
document.querySelector('#cancel-edit').addEventListener('click', () => editor.close())
editor.addEventListener('cancel', (event) => {
  if (fields.disabled) event.preventDefault()
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (fields.disabled) return
  fields.disabled = true
  editorStatus.textContent = '저장 중입니다.'
  try {
    const data = { title: title.value, content: content.value }
    const url = editedId ? postsUrl + '/' + editedId : postsUrl
    const saved = await request(url, editedId ? 'PUT' : 'POST', data)
    fields.disabled = false
    editor.close()
    await Promise.all([loadPosts('게시글을 저장했습니다.'), showPost(saved.id)])
  } catch (error) {
    editorStatus.textContent = error.message
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
    document.querySelector('#new-post').focus()
    await loadPosts('게시글을 삭제했습니다.')
  } catch (error) {
    detailStatus.textContent = error.message
    edit.disabled = false
    remove.disabled = false
  } finally {
    closeDetail.disabled = false
  }
})

loadPosts()
