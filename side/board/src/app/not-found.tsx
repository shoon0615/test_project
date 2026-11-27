import Link from 'next/link'

export default function NotFound() {
  return (
    <main>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>글이 삭제되었거나 주소가 바뀌었을 수 있습니다.</p>
      <Link className="button-link" href="/">목록으로</Link>
    </main>
  )
}
