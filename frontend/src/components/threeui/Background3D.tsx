'use client';

import React from 'react';
import { Scene3D } from './Scene3D';

/**
 * Background3D — the dashboard's single WebGL layer.
 *
 * Now powered by ThreeScrollScene (via Scene3D): the same floating 3D solids +
 * particle field used on the landing page, tuned for the dark dashboard, and
 * driven by scroll so the backdrop drifts as the user moves down the page.
 *
 * (Replaces the old third-party ThreeUI VoidField. Still exactly ONE canvas,
 * lazy-loaded, with a graceful reduced-motion / no-WebGL fallback handled inside
 * Scene3D.)
 */
export function Background3D() {
  return (
    <>
      {/* Static gradient base — this is what shows if WebGL/motion is disabled. */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-indigo-900/25 via-slate-900 to-emerald-900/10" />
      {/* The scroll-reactive 3D scene, softly composited over the base. */}
      <Scene3D
        variant="dark"
        className="fixed inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen"
      />
    </>
  );
}
