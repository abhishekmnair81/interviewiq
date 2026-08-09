'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden font-sans">
      {}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/50 top-[-200px] left-1/2 -translate-x-1/2" />
      <div className="ambient-blur w-[450px] h-[450px] bg-emerald-200/40 top-[35%] left-[-150px]" />
      <div className="ambient-blur w-[450px] h-[450px] bg-sky-200/40 bottom-[-150px] right-[-150px]" />

      {}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 font-sans">
              Interview<span className="text-indigo-600">IQ</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold px-5 py-2.5 rounded-2xl btn-primary shadow-md transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          ✨ Multimodal AI Interview Coach
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-6">
          Master Every Interview With <br className="hidden sm:block" />
          <span className="text-indigo-600">Multimodal AI Precision</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed font-normal">
          Real-time cross-modal analysis that evaluates your speech pacing, facial eye contact, and STAR answer structure simultaneously.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center mb-16">
          <Link
            href="/register"
            className="px-8 py-4 btn-primary font-black rounded-2xl text-sm shadow-lg text-center"
          >
            Start Free Practice Studio →
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 btn-secondary font-bold rounded-2xl text-sm text-center"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/90">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl mb-4 text-indigo-600 shadow-sm">
              🎙️
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Whisper Speech Intelligence</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Evaluates WPM speed, vocal hesitations, volume consistency, and tone clarity.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/90">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mb-4 text-emerald-600 shadow-sm">
              👁️
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">MediaPipe Gaze &amp; Posture Tracking</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Monitors camera eye contact, head stability, and posture composure during your response.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/90">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-2xl mb-4 text-violet-600 shadow-sm">
              🧠
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">STAR Answer Framework</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Calculates relevance, verifies Situation/Task/Action/Result components, and flags vague language.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
