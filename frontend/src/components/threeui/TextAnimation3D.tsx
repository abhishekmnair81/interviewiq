'use client';

import React, { useEffect, useState } from 'react';

/**
 * TextAnimation3D — replaced the @designcodeio/threeui TypographyVortexCanvas (WebGL)
 * with a pure CSS animated gradient headline. Zero WebGL, zero canvas, zero lag.
 *
 * CHANGELOG: Removed TypographyVortexCanvas import and Suspense wrapper.
 * Now renders an <h1> with an animated gradient shimmer via CSS keyframes.
 */

interface TextAnimation3DProps {
  text: string;
  className?: string;
}

export function TextAnimation3D({ text, className = '' }: TextAnimation3DProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <h1
      className={`font-black tracking-tight ${className}`}
      style={{
        background: 'linear-gradient(135deg, #c084fc 0%, #818cf8 35%, #fbbf24 70%, #a78bfa 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 0 28px rgba(192,132,252,0.4)) drop-shadow(0 2px 6px rgba(0,0,0,0.8))',
        // gradientShimmer @keyframes lives in globals.css (not here) to avoid hydration mismatch
        animation: reducedMotion ? 'none' : 'gradientShimmer 6s linear infinite',
      }}
    >
      {text}
    </h1>
  );
}
