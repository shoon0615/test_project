export function App() {
  return (
    <main className="min-h-screen bg-page text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-8">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <h1 className="text-xl font-semibold">Comment Lens</h1>
          <a className="text-sm font-medium text-muted" href="#recent-reports">
            최근 리포트
          </a>
        </header>

        <section className="max-w-3xl space-y-5" aria-labelledby="intro-title">
          <div className="space-y-3">
            <h2 id="intro-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
              댓글 300개를 읽는 대신, URL 하나로 핵심만 보세요.
            </h2>
            <p className="text-sm leading-7 text-body md:text-base">
              댓글과 분석 결과는 자체 서버로 보내지 않고 브라우저 안에서 처리하는 방향으로 구성됩니다.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row" aria-label="YouTube 댓글 분석">
            <label className="sr-only" htmlFor="youtube-url">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              className="h-12 flex-1 rounded-md border border-[#CFCFC7] bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-brand"
              maxLength={2048}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
            <button
              className="h-12 min-w-32 rounded-md bg-brand px-5 font-medium text-white hover:bg-[#B42318] disabled:opacity-50"
              type="submit"
            >
              분석하기
            </button>
          </form>
        </section>

        <section id="recent-reports" className="text-sm text-muted" aria-live="polite">
          저장된 최근 리포트는 아직 없습니다.
        </section>
      </div>
    </main>
  );
}
