import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 text-center max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mb-6">
          InterviewIQ
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          Multimodal AI-Powered Interview Coaching Platform. Analyze speech, facial expressions, and answer quality simultaneously.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition duration-200"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold rounded-xl transition duration-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
