import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import test from 'node:test'

test('Next.js 게시판 화면과 게시글 CRUD', { timeout: 20_000 }, async (t) => {
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '0'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  })
  t.after(() => server.kill())
  server.stderr.pipe(process.stderr)
  const output = createInterface({ input: server.stdout })
  const address = await Promise.race([
    (async () => {
      for await (const line of output) {
        const url = line.match(/Local:\s+(http:\/\/[^\s]+)/)?.[1]
        if (url) return url
      }
      assert.fail('Next.js 서버의 시작 주소를 확인하지 못했습니다.')
    })(),
    once(server, 'exit').then(([code]) => assert.fail(`서버 종료 (${code})`)),
  ])
  const root = await fetch(address)
  assert.equal(root.status, 200)
  assert.match(await root.text(), /<h1>게시판<\/h1>/)

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
  const pageUrl = address + '/posts/' + post.id
  const postPage = await fetch(pageUrl)
  assert.equal(postPage.status, 200)
  assert.match(await postPage.text(), /<h1>첫 글<\/h1>/)
  assert.match(await (await fetch(address)).text(), /첫 글/)

  const updated = await write(detail, 'PUT', { title: '수정', content: '새 본문' })
  assert.equal(updated.status, 200)
  const edited = await updated.json()
  assert.deepEqual(edited, { ...post, title: '수정', content: '새 본문' })
  assert.deepEqual(await (await fetch(api)).json(), [edited])

  assert.equal((await fetch(detail, { method: 'DELETE' })).status, 204)
  assert.equal((await fetch(detail)).status, 404)
  assert.equal((await fetch(pageUrl)).status, 404)
  assert.equal((await write(detail, 'PUT', post)).status, 404)
  assert.deepEqual(await (await fetch(api)).json(), [])
})
