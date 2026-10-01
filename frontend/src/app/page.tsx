'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LaserCollection } from '@/components/threeui/laser';
import { TextAnimation3D } from '@/components/threeui/TextAnimation3D';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import OrbitGalleryHeading from '@/components/OrbitGalleryHeading';
import JourneyTimeline from '@/components/JourneyTimeline';

import { FileSearch, FileEdit, LineChart as ChartIcon } from 'lucide-react';

/**
 * LANDING PAGE — Dark futuristic theme powered by ThreeUI <LaserCollection />
 * (vanishing-array variant). Violet and amber carrier rails accelerating from
 * a pointer-steered horizon origin. Single WebGL canvas, GPU-efficient and SSR-safe.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) setIsLoggedIn(true);
  }, []);

  return (
    <main className="dark min-h-screen-dvh flex flex-col relative overflow-x-hidden font-sans selection:bg-primary-500/30 bg-[#020305] text-white">

      {/* The single WebGL scene — ThreeUI LaserCollection (vanishing-array) */}
      <div className="absolute top-0 left-0 w-full h-[760px] sm:h-[880px] z-0 overflow-hidden pointer-events-none">
        <LaserCollection
          variant="vanishing-array"
          speed={1.00}
          size={1.00}
          length={1.00}
          density={1.00}
          opacity={0.88}
          hue={0}
          saturation={1.00}
          brightness={1.00}
        />
        {/* Soft gradient masks to blend cleanly into the dark theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-transparent to-[#020305]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020305]/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-30 px-6 py-4 transition-all duration-300 border-b border-white/5 bg-[#020305]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />

          <div className="flex items-center gap-4">
            {mounted && isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-md btn-glow rounded-xl">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors px-4 py-2">
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-md rounded-xl shadow-glow-signal bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative z-10 max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-8 shadow-glow-signal backdrop-blur-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-glow-signal" />
          SYSTEM ACTIVE: MULTIMODAL AI
        </div>

        {/* CSS animated gradient headline — no WebGL */}
        <div className="mb-6 w-full flex items-center justify-center">
          <TextAnimation3D
            text="Master Every Interview"
            className="text-[3.5rem] sm:text-[5rem] leading-[1.05]"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-6">
          With <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 to-violet-400 bg-[size:200%] animate-shimmer">Next-Gen Intelligence</span>
        </h2>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-12 leading-relaxed font-normal animate-slide-up" style={{ animationDelay: '200ms' }}>
          Real-time cross-modal analysis that evaluates your speech pacing, facial eye contact, and STAR answer structure simultaneously in an immersive environment.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center mb-20 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {mounted && isLoggedIn ? (
            <Link href="/dashboard" className="btn btn-lg btn-glow rounded-2xl w-full sm:w-auto">
              Go to your Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-lg rounded-2xl w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-glow-primary transition-all">
                Start Free Practice Studio →
              </Link>
              <Link href="/login" className="btn btn-lg rounded-2xl w-full sm:w-auto bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10 shadow-sm transition-all">
                Sign In to Dashboard
              </Link>
            </>
          )}
        </div>

        {/* How It Works — resume-to-ready journey (replaces the old feature cards) */}
        <div className="w-full animate-slide-up" style={{ animationDelay: '400ms' }}>
          <JourneyTimeline />
        </div>
      </section>

      {/* Skills-in-Orbit Section — custom Canvas-2D rotating ring */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-24 border-t border-white/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-violet-400/30 text-violet-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-glow-primary backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-glow-primary" />
            ONE STUDIO · TWELVE SIGNALS
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            A Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300">Interview Intelligence</span> Loop
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Every answer you give is scored across a dozen dimensions at once — from how you speak to what you say to how you look while saying it. Watch the full picture come together.
          </p>
        </div>

        {/* The rotating ring — pure Canvas 2D, not a page background */}
        <OrbitGalleryHeading
          line1="EVERYTHING WE"
          line2="MEASURE IN ORBIT"
          className="w-full h-[360px] sm:h-[460px] max-w-5xl mx-auto"
        />

        <p className="text-center text-sm text-slate-500 max-w-xl mx-auto mt-8 leading-relaxed">
          Speech pacing, eye contact, STAR structure, resume relevance, coding depth, live scoring and more — one seamless practice session, one honest report.
        </p>
      </section>

      {/* Upcoming Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-glow-accent backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-glow-accent" />
            IN DEVELOPMENT
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Interview Prep</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            We are continuously expanding the platform. Here is a sneak peek at the tools we are building to ensure you land your dream job.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ATS Resume Checker */}
          <div className="glass-card p-8 group relative overflow-hidden card-hover">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <FileSearch size={100} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-6 text-emerald-400 shadow-sm relative z-10">
              <FileSearch size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 relative z-10">ATS Resume Checker</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10">
              Upload your resume and get an instant ATS score. Identify missing keywords, formatting errors, and optimize for the exact job description you are targeting.
            </p>
          </div>

          {/* ATS Resume Builder */}
          <div className="glass-card p-8 group relative overflow-hidden card-hover">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <FileEdit size={100} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-6 text-blue-400 shadow-sm relative z-10">
              <FileEdit size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 relative z-10">ATS Resume Builder</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10">
              Don&apos;t have a resume? Build a highly optimized, ATS-friendly resume from scratch using our AI-guided templates designed by top recruiters.
            </p>
          </div>

          {/* Aptitude Tests */}
          <div className="glass-card p-8 group relative overflow-hidden card-hover">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <ChartIcon size={100} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-6 text-yellow-400 shadow-sm relative z-10">
              <ChartIcon size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 relative z-10">Aptitude Tests</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10">
              Prepare for the initial screening rounds with our comprehensive suite of quantitative, logical reasoning, and verbal aptitude assessments.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
