export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold tracking-tight">
          Interview<span className="text-brand-200">IQ</span>
        </h1>
        <p className="text-xl text-brand-200 max-w-xl">
          AI-powered multimodal interview coaching. <br />
          Analyze your speech, body language, and answer quality — simultaneously.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <div className="px-4 py-2 bg-white/10 rounded-lg text-sm backdrop-blur">
            🎙️ Speech Analysis
          </div>
          <div className="px-4 py-2 bg-white/10 rounded-lg text-sm backdrop-blur">
            👁️ Facial Analysis
          </div>
          <div className="px-4 py-2 bg-white/10 rounded-lg text-sm backdrop-blur">
            🧠 NLP Scoring
          </div>
        </div>
        <p className="text-brand-300 text-sm mt-8">
          Day 1 — Infrastructure Ready ✅
        </p>
      </div>
    </main>
  )
}
