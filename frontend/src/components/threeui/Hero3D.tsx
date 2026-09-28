'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useEffect, useState } from 'react';
import '@designcodeio/threeui/style.css'; // Global threeui styles

// Dynamically import the ThreeUI component to prevent SSR WebGL errors
const EmeraldHorizonBackground = dynamic(
  () => import('@designcodeio/threeui/components/EmeraldHorizonBackground').then((mod) => mod.EmeraldHorizonBackground),
  { ssr: false }
);

export function Hero3D() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 overflow-hidden">
        {/* Fallback ambient blobs for reduced motion users */}
        <div className="ambient-blob absolute w-[600px] h-[600px] bg-indigo-500/20 top-[-200px] left-1/4 -translate-x-1/2 blur-[120px]" />
        <div className="ambient-blob absolute w-[400px] h-[400px] bg-emerald-500/10 bottom-[-100px] right-[-100px] blur-[100px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Suspense fallback={<div className="absolute inset-0 bg-slate-950" />}>
        <EmeraldHorizonBackground />
      </Suspense>
    </div>
  );
}
