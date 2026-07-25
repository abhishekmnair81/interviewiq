'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  // Persistent Auth: If already logged in, redirect automatically to dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden font-sans">
      {/* Soft Ambient Light Halos */}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/50 top-[-200px] left-1/2 -translate-x-1/2" />
      <div className="ambient-blur w-[450px] h-[450px] bg-violet-200/40 top-[35%] left-[-150px]" />
      <div className="ambient-blur w-[450px] h-[450px] bg-sky-200/40 bottom-[-150px] right-[-150px]" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Interview<span className="glow-brand">IQ</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          ✨ Multimodal AI Interview Coach
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-6">
          Master Every Interview With <br className="hidden sm:block" />
          <span className="glow-brand">Multimodal AI Precision</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed font-normal">
          Real-time cross-modal analysis that evaluates your speech pacing, facial eye contact, and STAR answer structure simultaneously.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center mb-16">
          <Link
            href="/register"
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
          >
            Start Free Practice Studio →
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 glass-card hover:bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 transition text-base shadow-sm"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Unique Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-2xl mb-4 text-indigo-600 shadow-sm">
              🎙️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Whisper Speech Intelligence</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Evaluates WPM speed, filler words (&apos;um&apos;, &apos;basically&apos;), volume consistency, and tone clarity.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-sky-100/80 border border-sky-200 flex items-center justify-center text-2xl mb-4 text-sky-600 shadow-sm">
              👁️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">OpenCV Gaze &amp; Facial Tracking</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Monitors camera eye contact, head stability, and posture composure during your response.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-violet-100/80 border border-violet-200 flex items-center justify-center text-2xl mb-4 text-violet-600 shadow-sm">
              🧠
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">STAR Answer Framework</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Calculates relevance, verifies Situation/Task/Action/Result components, and flags vague language.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
