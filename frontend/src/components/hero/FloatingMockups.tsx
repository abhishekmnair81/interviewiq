'use client';

import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue, type MotionStyle } from 'framer-motion';

/**
 * A CSS-drawn browser-chrome mockup card — no broken images.
 * TODO: Replace the <MockupContent> gradient blocks with a real <Image> screenshot:
 *   import Image from 'next/image';
 *   <Image src="/mockups/dashboard.png" alt="Dashboard" width={600} height={400} />
 */
function MockupCard({
  title,
  accentColor,
  blocks,
  className = '',
}: {
  title: string;
  accentColor: string;
  blocks: { h: string; w: string; color: string }[];
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-slate-950/80 ${className}`}
    >
      {/* Browser chrome bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.04]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className="ml-3 flex-1 h-5 rounded-full bg-white/[0.04] border border-white/10 px-3 flex items-center">
          <span className="text-[9px] text-white/50 truncate">interviewiq.app/{title.toLowerCase().replace(/\s/g, '-')}</span>
        </span>
      </div>
      {/* CSS-drawn content blocks */}
      <div className="p-4 space-y-3">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg" style={{ background: accentColor, opacity: 0.8 }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 rounded-full bg-white/20 w-3/4" />
            <div className="h-2 rounded-full bg-white/10 w-1/2" />
          </div>
        </div>
        {/* Content rows */}
        {blocks.map((b, i) => (
          <div
            key={i}
            className="rounded-xl p-3 border border-white/5"
            style={{ background: b.color, opacity: 0.85 }}
          >
            <div className="h-2 rounded-full bg-white/30 mb-2" style={{ width: b.w }} />
            <div className="h-2 rounded-full bg-white/20" style={{ width: b.h }} />
          </div>
        ))}
        {/* Bottom stats row */}
        <div className="flex gap-2 pt-1">
          {['78%', '94%', '88%'].map((v, i) => (
            <div key={i} className="flex-1 rounded-lg bg-white/[0.04] border border-white/10 p-2 text-center">
              <div className="text-[11px] font-bold" style={{ color: accentColor }}>{v}</div>
              <div className="text-[8px] text-white/40 mt-0.5">score</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FloatingMockups() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const centerY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const leftY   = useTransform(scrollYProgress, [0, 1], [100, -30]);
  const rightY  = useTransform(scrollYProgress, [0, 1], [80, -50]);
  const centerRX = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -12]);
  const leftRY   = useTransform(scrollYProgress, [0, 0.5, 1], [14, 8, 3]);
  const rightRY  = useTransform(scrollYProgress, [0, 0.5, 1], [-14, -8, -3]);

  const motion_style = (y: MotionValue<number>, extra?: MotionStyle): MotionStyle =>
    shouldReduceMotion ? {} : { y, ...extra };

  // Continuous idle "floating" — applied to an inner wrapper so it never
  // collides with the scroll-parallax transform on the outer motion.div.
  const floatStyle = (dur: string, delay: string): React.CSSProperties =>
    shouldReduceMotion ? {} : { animation: `cardFloat ${dur} ease-in-out ${delay} infinite` };

  return (
    <section
      ref={containerRef}
      className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20"
      style={{ perspective: '1400px' }}
    >
      {/* Section label */}
      <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-500/70 mb-12">
        See it in action
      </p>

      {/* Three cards row */}
      <div className="relative flex items-end justify-center gap-6">

        {/* Left — Interview card */}
        <motion.div
          style={motion_style(leftY, { rotateY: leftRY })}
          className="hidden sm:block w-full max-w-xs flex-shrink-0 self-center"
        >
          <div style={floatStyle('7s', '0s')}>
            <MockupCard
              title="Live Interview"
              accentColor="#7c3aed"
              blocks={[
                { h: '70%', w: '90%', color: 'rgba(79,70,229,0.25)' },
                { h: '50%', w: '75%', color: 'rgba(124,58,237,0.2)' },
              ]}
              className="opacity-80 scale-95"
            />
          </div>
        </motion.div>

        {/* Center — Dashboard (largest) */}
        <motion.div
          style={motion_style(centerY, { rotateX: centerRX, zIndex: 20 })}
          className="w-full max-w-sm flex-shrink-0 relative"
        >
          <div style={floatStyle('8s', '0.5s')} className="relative">
            {/* Glow behind center card */}
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#10b981)', transform: 'scale(0.9) translateY(8px)' }}
            />
            <MockupCard
              title="Dashboard"
              accentColor="#10b981"
              blocks={[
                { h: '80%', w: '95%', color: 'rgba(16,185,129,0.2)' },
                { h: '60%', w: '80%', color: 'rgba(79,70,229,0.2)' },
                { h: '45%', w: '65%', color: 'rgba(124,58,237,0.15)' },
              ]}
            />
          </div>
        </motion.div>

        {/* Right — Report card */}
        <motion.div
          style={motion_style(rightY, { rotateY: rightRY })}
          className="hidden md:block w-full max-w-xs flex-shrink-0 self-center"
        >
          <div style={floatStyle('6.5s', '1s')}>
            <MockupCard
              title="Analysis Report"
              accentColor="#059669"
              blocks={[
                { h: '65%', w: '85%', color: 'rgba(16,185,129,0.2)' },
                { h: '55%', w: '70%', color: 'rgba(79,70,229,0.15)' },
              ]}
              className="opacity-80 scale-95"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
