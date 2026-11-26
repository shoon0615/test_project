import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import test from 'node:test'

test('FO 게시판의 정적 파일과 게시글 CRUD', async (t) => {
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, PORT: '0' },
  })
  t.after(() => server.kill())
  const address = await Promise.race([
    once(server.stdout, 'data').then(([chunk]) => chunk.toString().trim()),
    once(server, 'exit').then(([code]) => assert.fail(`서버 종료 (${code})`)),
  ])
  const root = await fetch(address)
  assert.equal(root.status, 200)
  assert.match(await root.text(), /게시판/)
  for (const asset of ['/app.js', '/style.css']) {
    assert.equal((await fetch(address + asset)).status, 200)
  }

  const api = address + '/api/posts'
  const write = (url, method, body) => fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.deepEqual(await (await fetch(api)).json(), [])
  assert.equal((await write(api, 'POST', { title: ' ', content: '본문' })).status, 400)
  assert.equal((await fetch(api, { method: 'POST', body: '{' })).status, 400)

  const created = await write(api, 'POST', { title: ' 첫 글 ', content: '본문' })
  assert.equal(created.status, 201)
  const post = await created.json()
  assert.equal(post.title, '첫 글')
  const detail = api + '/' + post.id
  assert.deepEqual(await (await fetch(detail)).json(), post)

  const updated = await write(detail, 'PUT', { title: '수정', content: '새 본문' })
  assert.equal(updated.status, 200)
  const edited = await updated.json()
  assert.deepEqual(edited, { ...post, title: '수정', content: '새 본문' })
  assert.deepEqual(await (await fetch(api)).json(), [edited])

  assert.equal((await fetch(detail, { method: 'DELETE' })).status, 204)
  assert.equal((await fetch(detail)).status, 404)
  assert.equal((await write(detail, 'PUT', post)).status, 404)
  assert.deepEqual(await (await fetch(api)).json(), [])
})
