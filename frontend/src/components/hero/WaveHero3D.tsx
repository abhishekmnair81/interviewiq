'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WaveMaterial = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      // Indigo -> Violet -> Emerald gradient stops
      // To switch to a lighter palette, swap the background in the Canvas wrapper
      // and change these stops to lighter colors (e.g. indigo-300, violet-300, emerald-300)
      uColor1: { value: new THREE.Color('#4f46e5') }, // indigo-600
      uColor2: { value: new THREE.Color('#7c3aed') }, // violet-600
      uColor3: { value: new THREE.Color('#10b981') }, // emerald-500
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      transparent
      wireframe={false}
      uniforms={uniforms}
      vertexShader={`
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vPos;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vUv = uv;
          
          vec3 pos = position;
          // Calculate displacement using noise
          float noise = snoise(vec2(pos.x * 0.4 + uTime, pos.y * 0.4 + uTime));
          
          // Single wave layer for performance
          pos.z += noise * 1.5;
          
          vPos = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `}
      fragmentShader={`
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying vec2 vUv;
        varying vec3 vPos;
        
        void main() {
          // Normalize height for color mixing
          float mixValue = smoothstep(-1.0, 1.8, vPos.z);
          
          // Indigo -> Violet -> Emerald
          vec3 color = mix(uColor1, uColor2, vUv.x);
          color = mix(color, uColor3, mixValue);
          
          // Add some glow at the peaks
          float glow = smoothstep(0.5, 2.0, vPos.z) * 0.4;
          color += vec3(glow);
          
          // Fade out edges
          float alpha = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          alpha *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          
          gl_FragColor = vec4(color, alpha * 0.7);
        }
      `}
    />
  );
};

const FloatingParticles = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions] = useState(() => {
    // 50 particles for high performance
    const pos = new Float32Array(50 * 3);
    for(let i=0; i<50; i++) {
      pos[i*3] = (Math.random() - 0.5) * 20;
      pos[i*3+1] = (Math.random() - 0.5) * 20;
      pos[i*3+2] = (Math.random() - 0.5) * 10 - 2;
    }
    return pos;
  });

  useFrame((state) => {
    if(pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.06} 
        color="#a78bfa" 
        transparent 
        opacity={0.3} 
        sizeAttenuation 
      />
    </points>
  );
};

export function WaveHero3D() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    // Intersection observer for pausing render loop when offscreen
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0 });
    
    if (containerRef.current) observer.observe(containerRef.current);
    
    // Handle tab visibility
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 overflow-hidden">
        <div className="ambient-blob absolute w-[600px] h-[600px] bg-indigo-500/20 top-[-200px] left-1/4 -translate-x-1/2 blur-[120px]" />
        <div className="ambient-blob absolute w-[400px] h-[400px] bg-emerald-500/10 bottom-[-100px] right-[-100px] blur-[100px]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 -z-10 bg-[#070b14] overflow-hidden" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {isVisible && (
        <Canvas
          dpr={1} // Force DPR to 1 to drastically reduce fill rate lag
          camera={{ position: [0, -2, 8], fov: 60 }}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, depth: false }}
        >
          {/* Main animated wave plane - reduced geometry to 32x32 for performance */}
          <mesh rotation={[-Math.PI / 3, 0, 0]} position={[0, 0, -2]}>
            <planeGeometry args={[30, 20, 32, 32]} />
            <WaveMaterial />
          </mesh>

          {/* Depth floating particles */}
          <FloatingParticles />
        </Canvas>
      )}
    </div>
  );
}
