'use client';

import React, { useEffect, useState } from 'react';

/**
 * CSSWaveHero — zero WebGL, crash-proof. Flowing gradient waves + aurora ribbon.
 *
 * All @keyframes live in globals.css (inline <style> tags with quotes cause the
 * SSR/client hydration mismatch we already hit).
 *
 * Motion model (why it actually LOOKS animated now):
 *  - Each wave = a 200%-wide SVG whose path repeats every period; translateX
 *    scrolls it exactly one period → seamless, continuous horizontal flow.
 *  - A separate wrapper adds a slow vertical bob (no transform collision).
 *  - A blurred, drifting multi-color "aurora" ribbon sits behind the headline.
 *  The old version only nudged translateY a few px, so it read as static.
 *
 * PALETTE — swap in one place for a lighter theme:
 *   BG #070b14 | indigo #4f46e5 | violet #7c3aed | emerald #10b981
 */

// One seamless wave period; drawn twice (0..2880) so translateX(-50%) on the
// 200%-wide SVG loops with no visible seam (crest→trough→crest, flat tangents).
const WAVE_PATH =
  'M0,110 C360,110 360,230 720,230 C1080,230 1080,110 1440,110 ' +
  'C1800,110 1800,230 2160,230 C2520,230 2520,110 2880,110 L2880,320 L0,320 Z';

export function CSSWaveHero() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const flow = (dur: string, reverse = false): React.CSSProperties =>
    reducedMotion ? {} : { animation: `${reverse ? 'waveFlowReverse' : 'waveFlow'} ${dur} linear infinite` };
  const bob = (dur: string, delay = '0s'): React.CSSProperties =>
    reducedMotion ? {} : { animation: `waveBob ${dur} ease-in-out ${delay} infinite` };
  const blob = (dur: string, delay = '0s'): React.CSSProperties =>
    reducedMotion ? {} : { animation: `blobFloat ${dur} ease-in-out ${delay} infinite` };

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
      style={{ pointerEvents: 'none', background: 'linear-gradient(180deg, #ffffff 0%, #eef1fb 55%, #e8ecfb 100%)' }}
    >
      {/* Ambient drifting glows */}
      <div className="absolute rounded-full" style={{ width: 700, height: 700, top: '-20%', left: '8%', background: 'radial-gradient(circle, rgba(79,70,229,0.22) 0%, transparent 70%)', filter: 'blur(70px)', ...blob('18s') }} />
      <div className="absolute rounded-full" style={{ width: 520, height: 520, bottom: '4%', right: '6%', background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', filter: 'blur(70px)', ...blob('22s', '2s') }} />
      <div className="absolute rounded-full" style={{ width: 420, height: 420, top: '30%', right: '24%', background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)', filter: 'blur(80px)', ...blob('26s', '1s') }} />

      {/* Colorful aurora ribbon — the flowing band behind the headline */}
      <div
        className="absolute left-1/2 top-[22%]"
        style={{
          width: '150%',
          height: '40%',
          transform: 'translateX(-50%) rotate(-10deg)',
          background: 'linear-gradient(100deg, transparent 0%, rgba(79,70,229,0.5) 22%, rgba(124,58,237,0.5) 45%, rgba(16,185,129,0.5) 68%, transparent 100%)',
          backgroundSize: '220% 100%',
          filter: 'blur(80px)',
          opacity: 0.4,
          ...(reducedMotion ? {} : { animation: 'gradientShimmer 16s linear infinite, auroraDrift 22s ease-in-out infinite' }),
        }}
      />

      {/* Flowing wave layers — wrapper bobs vertically, inner SVG flows horizontally */}
      {/* Back — slowest, flows right */}
      <div className="absolute bottom-0 left-0 w-full" style={{ height: '60%', ...bob('11s') }}>
        <svg className="absolute bottom-0 left-0 h-full" style={{ width: '200%', ...flow('30s', true) }} viewBox="0 0 2880 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.32" />
            </linearGradient>
          </defs>
          <path fill="url(#wg3)" d={WAVE_PATH} />
        </svg>
      </div>
      {/* Mid */}
      <div className="absolute bottom-0 left-0 w-full" style={{ height: '48%', ...bob('8s', '0.6s') }}>
        <svg className="absolute bottom-0 left-0 h-full" style={{ width: '200%', ...flow('20s') }} viewBox="0 0 2880 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#4f46e5" stopOpacity="0.40" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.50" />
            </linearGradient>
          </defs>
          <path fill="url(#wg2)" d={WAVE_PATH} />
        </svg>
      </div>
      {/* Front — fastest, brightest */}
      <div className="absolute bottom-0 left-0 w-full" style={{ height: '38%', ...bob('6s', '1.1s') }}>
        <svg className="absolute bottom-0 left-0 h-full" style={{ width: '200%', ...flow('13s') }} viewBox="0 0 2880 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.60" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path fill="url(#wg1)" d={WAVE_PATH} />
        </svg>
      </div>

      {/* Drifting glowing particles */}
      {!reducedMotion && (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {[
            { left: '15%', top: '25%', size: 4, dur: '6s',   delay: '0s',   color: 'rgba(124,58,237,0.55)' },
            { left: '30%', top: '62%', size: 3, dur: '8s',   delay: '0.8s', color: 'rgba(79,70,229,0.55)'  },
            { left: '52%', top: '20%', size: 5, dur: '5s',   delay: '1.6s', color: 'rgba(16,185,129,0.5)'  },
            { left: '68%', top: '68%', size: 3, dur: '9s',   delay: '2.4s', color: 'rgba(124,58,237,0.6)'  },
            { left: '84%', top: '38%', size: 4, dur: '7s',   delay: '3.2s', color: 'rgba(99,102,241,0.5)'  },
            { left: '44%', top: '80%', size: 3, dur: '6.5s', delay: '4s',   color: 'rgba(5,150,105,0.5)'   },
            { left: '90%', top: '58%', size: 2, dur: '7.5s', delay: '1.2s', color: 'rgba(79,70,229,0.55)'  },
            { left: '22%', top: '45%', size: 2, dur: '8.5s', delay: '2.8s', color: 'rgba(16,185,129,0.5)'  },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: p.left, top: p.top,
                width: p.size, height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                animation: `particleFloat ${p.dur} ease-in-out infinite alternate`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
