'use client';

import { FileText, Video, ScanFace, Target, Trophy } from 'lucide-react';

/**
 * JourneyTimeline — InterviewIQ's "resume → interview-ready" roadmap.
 *
 * A unique, dark-theme take on a step path (NOT a clone of any reference):
 * five glowing glass nodes on a violet→amber gradient rail that progresses in
 * colour from start (violet) to the finish (amber/gold), echoing the journey
 * from first upload to landing the role. Pure CSS/Tailwind — no canvas/WebGL.
 */

type Tint = 'violet' | 'indigo' | 'cyan' | 'amber' | 'emerald';

const TINT: Record<Tint, { num: string; ring: string; glow: string; badge: string }> = {
  violet: { num: 'text-violet-300', ring: 'border-violet-400/50', glow: 'group-hover:shadow-glow-primary', badge: 'text-violet-300 border-violet-400/40' },
  indigo: { num: 'text-indigo-300', ring: 'border-indigo-400/50', glow: 'group-hover:shadow-glow-primary', badge: 'text-indigo-300 border-indigo-400/40' },
  cyan: { num: 'text-cyan-300', ring: 'border-cyan-400/50', glow: 'group-hover:shadow-glow-signal', badge: 'text-cyan-300 border-cyan-400/40' },
  amber: { num: 'text-amber-300', ring: 'border-amber-400/50', glow: 'group-hover:shadow-glow-accent', badge: 'text-amber-300 border-amber-400/40' },
  emerald: { num: 'text-emerald-300', ring: 'border-emerald-400/50', glow: 'group-hover:shadow-glow-accent', badge: 'text-emerald-300 border-emerald-400/40' },
};

const STEPS: { n: string; title: string; desc: string; Icon: typeof FileText; tint: Tint }[] = [
  { n: '01', title: 'Upload Your Resume', desc: 'Every question is built from your real projects, skills and experience.', Icon: FileText, tint: 'violet' },
  { n: '02', title: 'Enter the Live Studio', desc: 'Meet Alex, your AI interviewer — one focused question at a time.', Icon: Video, tint: 'indigo' },
  { n: '03', title: 'Multimodal Capture', desc: 'Speech pacing, eye contact and answers read together, in real time.', Icon: ScanFace, tint: 'cyan' },
  { n: '04', title: 'STAR Scoring', desc: 'Situation · Task · Action · Result structure and clarity, objectively scored.', Icon: Target, tint: 'amber' },
  { n: '05', title: 'Improve & Land', desc: 'Track your trend across sessions and walk in genuinely ready.', Icon: Trophy, tint: 'emerald' },
];

export default function JourneyTimeline({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-glow-signal backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-glow-signal" />
          HOW IT WORKS
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
          From Resume to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300">Interview-Ready</span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          A guided, five-step loop that turns one practice session into an honest, measurable picture of how you actually interview.
        </p>
      </div>

      <div className="relative">
        {/* Rail — horizontal on desktop, vertical on mobile */}
        <div className="hidden md:block absolute left-[10%] right-[10%] top-10 h-0.5 bg-gradient-to-r from-violet-500/60 via-cyan-400/40 to-amber-400/70 bg-[length:200%_100%] animate-shimmer" />
        <div className="md:hidden absolute left-10 top-10 bottom-10 w-0.5 bg-gradient-to-b from-violet-500/60 via-cyan-400/40 to-amber-400/70" />

        <ol className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-4 list-none">
          {STEPS.map((s) => {
            const t = TINT[s.tint];
            return (
              <li
                key={s.n}
                className="group relative flex md:flex-col items-center md:text-center gap-5 md:gap-0"
              >
                {/* Node */}
                <div className="relative flex-shrink-0">
                  <div className={`w-20 h-20 rounded-full grid place-items-center glass-card border-2 ${t.ring} ${t.glow} transition-all duration-300 group-hover:-translate-y-1`}>
                    <span className={`text-2xl font-black ${t.num}`}>{s.n}</span>
                  </div>
                  <div className={`absolute -top-2 -right-2 w-9 h-9 rounded-xl grid place-items-center bg-[#0b0b12] border ${t.badge} shadow-sm`}>
                    <s.Icon size={16} />
                  </div>
                </div>

                {/* Caption */}
                <div className="md:mt-6 md:px-2">
                  <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-normal">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
