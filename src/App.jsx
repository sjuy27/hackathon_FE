function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-cyan-400">HACKATHON FE</p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">새로운 아이디어를 시작하세요.</h1>
        <p className="mt-5 leading-relaxed text-slate-400">
          React + Vite + Tailwind CSS 개발 환경이 준비되었습니다.
          src/App.jsx를 수정해 첫 화면을 만들어 보세요.
        </p>
        <a
          className="mt-8 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
          href="https://react.dev/learn"
          target="_blank"
          rel="noreferrer"
        >
          React 문서 보기 ↗
        </a>
      </section>
    </main>
  )
}

export default App
