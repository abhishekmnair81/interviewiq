'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ThreeScrollScene — the ONE (and only) WebGL canvas per page.
 *
 * A cluster of floating, gently-distorting brand-colored solids plus a drifting
 * particle field. The whole cluster ROTATES and TRAVELS as the user scrolls the
 * page (real 3D-on-scroll), which is the "wow" moment that replaces the old flat
 * blurred-gradient look.
 *
 * Crash-safety rules honored here:
 *  - Exactly one <Canvas> (one THREE.WebGLRenderer). Never mount two on a page.
 *  - alpha:true → transparent clear, so the page's CSS background shows through.
 *  - prefers-reduced-motion is handled by the Scene3D wrapper (this never mounts).
 *  - Lazy-loaded (ssr:false) by the wrapper so there is zero WebGL during SSR.
 */

export type SceneVariant = 'light' | 'dark';

interface ThreeScrollSceneProps {
  variant?: SceneVariant;
}

/** Page scroll progress 0..1, kept in a ref so it never triggers React renders. */
function useScrollProgress() {
  const ref = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return ref;
}

const PALETTES: Record<SceneVariant, { a: string; b: string; c: string; particle: string }> = {
  light: { a: '#4f46e5', b: '#7c3aed', c: '#059669', particle: '#6366f1' },
  dark:  { a: '#818cf8', b: '#a78bfa', c: '#34d399', particle: '#a5b4fc' },
};

function SceneContent({ variant }: { variant: SceneVariant }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const scroll = useScrollProgress();
  const p = PALETTES[variant];

  // Drifting particle cloud — built once.
  const positions = useMemo(() => {
    const N = 380;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 15;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 11;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const s = scroll.current;
    const g = group.current;
    if (g) {
      // continuous idle spin + scroll-driven tumble and travel
      g.rotation.y += delta * 0.15;
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, s * Math.PI * 0.6, 0.06);
      g.position.y = THREE.MathUtils.lerp(g.position.y, s * 3.2, 0.06);
      g.position.z = THREE.MathUtils.lerp(g.position.z, s * 2.6, 0.06);
    }
    const pt = points.current;
    if (pt) {
      pt.rotation.y -= delta * 0.03;
      pt.rotation.x = THREE.MathUtils.lerp(pt.rotation.x, -s * 0.6, 0.05);
    }
  });

  return (
    <>
      <ambientLight intensity={variant === 'dark' ? 0.8 : 1.15} />
      <directionalLight position={[5, 6, 5]} intensity={variant === 'dark' ? 1.2 : 1.5} color="#ffffff" />
      <pointLight position={[-6, -3, 4]} intensity={0.9} color={p.c} />
      <pointLight position={[5, 4, -4]} intensity={0.8} color={p.b} />

      <group ref={group}>
        {/* far left */}
        <Float speed={1.4} rotationIntensity={1.1} floatIntensity={1.5}>
          <mesh position={[-4.9, 1.1, -1]} scale={0.85}>
            <icosahedronGeometry args={[1, 0]} />
            <MeshDistortMaterial color={p.a} distort={0.18} speed={2} roughness={0.4} metalness={0} transparent opacity={0.62} emissive={p.a} emissiveIntensity={0.2} />
          </mesh>
        </Float>
        {/* far right */}
        <Float speed={1.8} rotationIntensity={1.4} floatIntensity={1.2}>
          <mesh position={[5.0, 0.1, -1.5]} scale={0.62}>
            <torusKnotGeometry args={[0.7, 0.26, 128, 24]} />
            <MeshDistortMaterial color={p.c} distort={0.15} speed={1.6} roughness={0.45} metalness={0} transparent opacity={0.6} emissive={p.c} emissiveIntensity={0.18} />
          </mesh>
        </Float>
        {/* top right */}
        <Float speed={1.2} rotationIntensity={1.0} floatIntensity={1.8}>
          <mesh position={[3.4, 2.4, -2.5]} scale={0.5}>
            <octahedronGeometry args={[1, 0]} />
            <MeshDistortMaterial color={p.b} distort={0.2} speed={2.2} roughness={0.4} metalness={0} transparent opacity={0.6} emissive={p.b} emissiveIntensity={0.22} />
          </mesh>
        </Float>
        {/* bottom left */}
        <Float speed={2.0} rotationIntensity={1.3} floatIntensity={1.3}>
          <mesh position={[-3.7, -2.3, -2]} scale={0.55}>
            <dodecahedronGeometry args={[1, 0]} />
            <MeshDistortMaterial color={p.a} distort={0.22} speed={2.4} roughness={0.4} metalness={0} transparent opacity={0.58} emissive={p.a} emissiveIntensity={0.2} />
          </mesh>
        </Float>
      </group>

      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={variant === 'dark' ? 0.045 : 0.03}
          color={p.particle}
          transparent
          opacity={variant === 'dark' ? 0.85 : 0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}

export default function ThreeScrollScene({ variant = 'light' }: ThreeScrollSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent variant={variant} />
    </Canvas>
  );
}
