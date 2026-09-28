'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import type { SceneVariant } from './ThreeScrollScene';

/**
 * Scene3D — lazy, SSR-safe, crash-safe wrapper around the single WebGL scene.
 *
 * - ssr:false so no WebGL runs during server render / hydration.
 * - Renders NOTHING (just an empty layer) when prefers-reduced-motion is set,
 *   or when a WebGL context can't be created — so it degrades gracefully instead
 *   of throwing the "Context Lost" error we hit before.
 * - Mount at most ONE <Scene3D> per page.
 */

const ThreeScrollScene = dynamic(() => import('./ThreeScrollScene'), {
  ssr: false,
  loading: () => null,
});

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function Scene3D({
  variant = 'light',
  className = '',
}: {
  variant?: SceneVariant;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!reduced && webglAvailable());
  }, []);

  if (!enabled) {
    // Empty, inert layer — the page's CSS background is the fallback visual.
    return <div className={className} aria-hidden="true" style={{ pointerEvents: 'none' }} />;
  }

  return (
    <div className={className} aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <ThreeScrollScene variant={variant} />
    </div>
  );
}
