'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

interface Alex3DRealCharacterProps {
  state: AvatarState;
  candidateName?: string;
  jobRole?: string;
}

const EQUALIZER_BARS = [35, 75, 50, 95, 65, 85, 45, 70, 60, 90, 40, 65, 80, 100, 55, 70, 45, 85];

export function Alex3DRealCharacter({
  state,
  candidateName = 'Candidate',
  jobRole = 'Software Engineer',
}: Alex3DRealCharacterProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [barHeights, setBarHeights] = useState<number[]>(EQUALIZER_BARS.map(() => 15));
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const stateRef = useRef<AvatarState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const mousePosRef = useRef({ x: 0, y: 0 });

  // Mouse / Candidate Gaze Tracking Listener
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mousePosRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Three.js WebGL 3D Character Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── 1. WebGL Scene & Camera ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 440;

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 1.48, 4.0);
    camera.lookAt(0, 1.38, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // ── 2. Studio Multi-Light Rig ────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key Light (Warm Key)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(2.8, 3.8, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Soft Blue Fill Light
    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.4);
    fillLight.position.set(-2.8, 2.2, 2.8);
    scene.add(fillLight);

    // Vibrant Rim Backlight
    const rimLight = new THREE.PointLight(0xa855f7, 3.2, 9);
    rimLight.position.set(0, 3.0, -2.0);
    scene.add(rimLight);

    // ── 3. High-Fidelity Executive 3D Character Rig ──────────────────────────
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5b887,
      roughness: 0.38,
      metalness: 0.04,
    });

    const suitMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Executive Dark Charcoal Navy
      roughness: 0.6,
      metalness: 0.12,
    });

    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
    });

    const tieMaterial = new THREE.MeshStandardMaterial({
      color: 0x4338ca, // Indigo Tie
      roughness: 0.25,
      metalness: 0.2,
    });

    const glassesFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Sleek Matte Black Frames
      roughness: 0.2,
      metalness: 0.8,
    });

    const glassesLensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.8,
    });

    const eyeScleraMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // High-Depth Sapphire Blue Iris
      roughness: 0.12,
      metalness: 0.25,
    });

    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.05,
    });

    const lipMaterial = new THREE.MeshStandardMaterial({
      color: 0xbc6c58,
      roughness: 0.42,
    });

    const browMaterial = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.7,
    });

    // ── Torso & Suit Assembly ──
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.22, 0);

    const suitGeo = new THREE.CylinderGeometry(0.6, 0.7, 1.28, 32);
    const suitMesh = new THREE.Mesh(suitGeo, suitMaterial);
    suitMesh.position.set(0, 0.4, 0);
    suitMesh.castShadow = true;
    suitMesh.receiveShadow = true;
    torsoGroup.add(suitMesh);

    const shirtGeo = new THREE.CylinderGeometry(0.23, 0.27, 0.88, 20);
    const shirtMesh = new THREE.Mesh(shirtGeo, shirtMaterial);
    shirtMesh.position.set(0, 0.62, 0.33);
    torsoGroup.add(shirtMesh);

    const tieGeo = new THREE.BoxGeometry(0.088, 0.54, 0.05);
    const tieMesh = new THREE.Mesh(tieGeo, tieMaterial);
    tieMesh.position.set(0, 0.52, 0.44);
    torsoGroup.add(tieMesh);

    // Lapels
    const lapelGeo = new THREE.BoxGeometry(0.14, 0.52, 0.06);
    const lapelLeft = new THREE.Mesh(lapelGeo, suitMaterial);
    lapelLeft.position.set(-0.17, 0.66, 0.37);
    lapelLeft.rotation.set(0.1, 0.1, -0.26);
    torsoGroup.add(lapelLeft);

    const lapelRight = new THREE.Mesh(lapelGeo, suitMaterial);
    lapelRight.position.set(0.17, 0.66, 0.37);
    lapelRight.rotation.set(0.1, -0.1, 0.26);
    torsoGroup.add(lapelRight);

    avatarGroup.add(torsoGroup);

    // ── Neck ──
    const neckGeo = new THREE.CylinderGeometry(0.165, 0.195, 0.38, 24);
    const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
    neckMesh.position.set(0, 1.15, 0.04);
    avatarGroup.add(neckMesh);

    // ── Head Group (Root for Expressions & Eye Gaze) ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.54, 0.05);

    // Skull Base
    const skullGeo = new THREE.SphereGeometry(0.35, 32, 32);
    skullGeo.scale(1, 1.19, 0.97);
    const skullMesh = new THREE.Mesh(skullGeo, skinMaterial);
    skullMesh.castShadow = true;
    headGroup.add(skullMesh);

    // Jaw & Chin Structure
    const jawGeo = new THREE.BoxGeometry(0.43, 0.23, 0.38);
    const jawMesh = new THREE.Mesh(jawGeo, skinMaterial);
    jawMesh.position.set(0, -0.22, 0.08);
    headGroup.add(jawMesh);

    // Hair Structure
    const hairGeo = new THREE.SphereGeometry(0.375, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    hairGeo.scale(1.02, 1.12, 1.03);
    const hairMesh = new THREE.Mesh(hairGeo, hairMaterial);
    hairMesh.position.set(0, 0.04, -0.02);
    headGroup.add(hairMesh);

    // ── Ears ──
    const earGeo = new THREE.SphereGeometry(0.07, 16, 16);
    earGeo.scale(0.4, 0.8, 0.5);

    const earLeft = new THREE.Mesh(earGeo, skinMaterial);
    earLeft.position.set(-0.35, 0.04, 0.02);
    earLeft.rotation.set(0, -0.2, 0.1);
    headGroup.add(earLeft);

    const earRight = new THREE.Mesh(earGeo, skinMaterial);
    earRight.position.set(0.35, 0.04, 0.02);
    earRight.rotation.set(0, 0.2, -0.1);
    headGroup.add(earRight);

    // ── Anatomical Eyes ──
    const eyeGeo = new THREE.SphereGeometry(0.063, 24, 24);
    const irisGeo = new THREE.SphereGeometry(0.038, 20, 20);
    const pupilGeo = new THREE.SphereGeometry(0.021, 16, 16);

    // Left Eye
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(-0.125, 0.065, 0.3);

    const leftSclera = new THREE.Mesh(eyeGeo, eyeScleraMaterial);
    leftEyeGroup.add(leftSclera);

    const leftIris = new THREE.Mesh(irisGeo, irisMaterial);
    leftIris.position.set(0, 0, 0.032);
    leftEyeGroup.add(leftIris);

    const leftPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    leftPupil.position.set(0, 0, 0.048);
    leftEyeGroup.add(leftPupil);

    headGroup.add(leftEyeGroup);

    // Right Eye
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(0.125, 0.065, 0.3);

    const rightSclera = new THREE.Mesh(eyeGeo, eyeScleraMaterial);
    rightEyeGroup.add(rightSclera);

    const rightIris = new THREE.Mesh(irisGeo, irisMaterial);
    rightIris.position.set(0, 0, 0.032);
    rightEyeGroup.add(rightIris);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    rightPupil.position.set(0, 0, 0.048);
    rightEyeGroup.add(rightPupil);

    headGroup.add(rightEyeGroup);

    // Eyelids (Blinking Mechanics)
    const eyelidGeo = new THREE.BoxGeometry(0.14, 0.068, 0.035);
    const leftEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
    leftEyelid.position.set(-0.125, 0.112, 0.32);
    headGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
    rightEyelid.position.set(0.125, 0.112, 0.32);
    headGroup.add(rightEyelid);

    // ── Eyebrows ──
    const browGeo = new THREE.BoxGeometry(0.138, 0.025, 0.03);

    const leftBrow = new THREE.Mesh(browGeo, browMaterial);
    leftBrow.position.set(-0.125, 0.17, 0.33);
    leftBrow.rotation.z = 0.05;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMaterial);
    rightBrow.position.set(0.125, 0.17, 0.33);
    rightBrow.rotation.z = -0.05;
    headGroup.add(rightBrow);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.046, 0.125, 16);
    const noseMesh = new THREE.Mesh(noseGeo, skinMaterial);
    noseMesh.position.set(0, -0.02, 0.36);
    noseMesh.rotation.x = 0.15;
    headGroup.add(noseMesh);

    // ── Executive Glasses (Polished Frame & Reflective Lens) ──
    const glassFrameGroup = new THREE.Group();
    glassFrameGroup.position.set(0, 0.065, 0.33);

    const rimGeo = new THREE.BoxGeometry(0.15, 0.08, 0.02);

    const leftGlassRim = new THREE.Mesh(rimGeo, glassesFrameMaterial);
    leftGlassRim.position.set(-0.125, 0, 0);
    glassFrameGroup.add(leftGlassRim);

    const rightGlassRim = new THREE.Mesh(rimGeo, glassesFrameMaterial);
    rightGlassRim.position.set(0.125, 0, 0);
    glassFrameGroup.add(rightGlassRim);

    const bridgeGeo = new THREE.BoxGeometry(0.08, 0.015, 0.02);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, glassesFrameMaterial);
    bridgeMesh.position.set(0, 0.02, 0);
    glassFrameGroup.add(bridgeMesh);

    const lensGeo = new THREE.BoxGeometry(0.138, 0.07, 0.01);
    const leftLens = new THREE.Mesh(lensGeo, glassesLensMaterial);
    leftLens.position.set(-0.125, 0, 0.005);
    glassFrameGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, glassesLensMaterial);
    rightLens.position.set(0.125, 0, 0.005);
    glassFrameGroup.add(rightLens);

    headGroup.add(glassFrameGroup);

    // ── Mouth & Viseme Assembly ──
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.165, 0.32);

    const lipUpperGeo = new THREE.BoxGeometry(0.165, 0.026, 0.04);
    const lipUpper = new THREE.Mesh(lipUpperGeo, lipMaterial);
    lipUpper.position.set(0, 0.015, 0);
    mouthGroup.add(lipUpper);

    const lipLowerGeo = new THREE.BoxGeometry(0.145, 0.032, 0.04);
    const lipLower = new THREE.Mesh(lipLowerGeo, lipMaterial);
    lipLower.position.set(0, -0.015, 0);
    mouthGroup.add(lipLower);

    headGroup.add(mouthGroup);
    avatarGroup.add(headGroup);

    // ── Floor Contact Shadow Plane ──
    const shadowPlaneGeo = new THREE.PlaneGeometry(3, 3);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.4;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── 4. 60 FPS Procedural Animation & Interactive Gaze Engine ────────────
    let animId: number;
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;

    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;

    let targetJawOpen = 0;
    let targetHeadRotX = 0;
    let targetHeadRotY = 0;
    let targetHeadRotZ = 0;
    let targetBrowY = 0.17;
    let targetBrowRotZ = 0.05;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const currentState = stateRef.current;
      const mouse = mousePosRef.current;

      // A. Natural Chest Breathing & Body Sway
      torsoGroup.position.y = 0.22 + Math.sin(time * 1.5) * 0.012;
      avatarGroup.rotation.y = Math.sin(time * 0.7) * 0.015;

      // B. Candidate Interactive Gaze Tracking (Eyes & Head follow cursor slightly)
      const gazeX = mouse.x * 0.15;
      const gazeY = mouse.y * 0.12;

      leftEyeGroup.rotation.y = lerp(leftEyeGroup.rotation.y, gazeX * 0.6, 0.1);
      leftEyeGroup.rotation.x = lerp(leftEyeGroup.rotation.x, -gazeY * 0.4, 0.1);
      rightEyeGroup.rotation.y = lerp(rightEyeGroup.rotation.y, gazeX * 0.6, 0.1);
      rightEyeGroup.rotation.x = lerp(rightEyeGroup.rotation.x, -gazeY * 0.4, 0.1);

      // C. Human Eye Blinking Mechanics
      blinkTimer += delta;
      if (blinkTimer > 2.8 && !isBlinking) {
        isBlinking = true;
      }
      if (isBlinking) {
        leftEyelid.position.y = 0.065;
        rightEyelid.position.y = 0.065;
        if (blinkTimer > 2.96) {
          isBlinking = false;
          blinkTimer = 0;
          leftEyelid.position.y = 0.112;
          rightEyelid.position.y = 0.112;
        }
      }

      // D. State-Driven Emotion & Expression Targets
      if (currentState === 'speaking') {
        // 🎙 SPEAKING: Dynamic Viseme Speech Articulation
        const speechWave = Math.abs(Math.sin(time * 12)) * 0.048 + Math.abs(Math.cos(time * 7.5)) * 0.032;
        targetJawOpen = speechWave;

        targetHeadRotX = gazeY * 0.2 + Math.sin(time * 4) * 0.04;
        targetHeadRotY = gazeX * 0.3 + Math.sin(time * 2.5) * 0.05;
        targetHeadRotZ = Math.sin(time * 3) * 0.02;

        targetBrowY = 0.18 + Math.sin(time * 3) * 0.008;
        targetBrowRotZ = 0.08;

        setBarHeights(
          EQUALIZER_BARS.map((h, i) =>
            Math.max(20, (h * (0.5 + Math.abs(Math.sin(time * 8 + i * 0.6)) * 0.5)) % 100)
          )
        );
      } else if (currentState === 'listening') {
        // 👂 LISTENING: Empathetic Attentive Nods & Warm Posture
        targetJawOpen = 0;
        targetHeadRotX = gazeY * 0.2 + Math.sin(time * 2) * 0.045; // Gentle nod
        targetHeadRotY = gazeX * 0.3 + Math.sin(time * 1.2) * 0.03;
        targetHeadRotZ = Math.sin(time * 1.4) * 0.015;

        targetBrowY = 0.175;
        targetBrowRotZ = 0.03;

        setBarHeights(EQUALIZER_BARS.map((_, i) => 15 + Math.abs(Math.sin(time * 3 + i * 0.4)) * 18));
      } else if (currentState === 'thinking') {
        // 🧠 THINKING: Furrowed Eyebrows & Pensive Reflection
        targetJawOpen = 0.005;
        targetHeadRotX = -0.06 + Math.sin(time * 1.1) * 0.018;
        targetHeadRotY = 0.12 + Math.sin(time * 0.8) * 0.025;
        targetHeadRotZ = -0.04;

        targetBrowY = 0.158;
        targetBrowRotZ = -0.1;

        setBarHeights(EQUALIZER_BARS.map(() => 10));
      } else {
        // ⏸ IDLE: Confident & Natural Posture
        targetJawOpen = 0;
        targetHeadRotX = gazeY * 0.15 + Math.sin(time * 1.1) * 0.015;
        targetHeadRotY = gazeX * 0.2 + Math.sin(time * 0.8) * 0.015;
        targetHeadRotZ = 0;

        targetBrowY = 0.17;
        targetBrowRotZ = 0.04;

        setBarHeights(EQUALIZER_BARS.map(() => 12));
      }

      // E. Smooth Interpolation
      lipLower.position.y = lerp(lipLower.position.y, -0.015 - targetJawOpen * 1.5, 0.2);
      mouthGroup.scale.y = lerp(mouthGroup.scale.y, 1 + targetJawOpen * 8, 0.2);

      headGroup.rotation.x = lerp(headGroup.rotation.x, targetHeadRotX, 0.15);
      headGroup.rotation.y = lerp(headGroup.rotation.y, targetHeadRotY, 0.15);
      headGroup.rotation.z = lerp(headGroup.rotation.z, targetHeadRotZ, 0.15);

      leftBrow.position.y = lerp(leftBrow.position.y, targetBrowY, 0.15);
      rightBrow.position.y = lerp(rightBrow.position.y, targetBrowY, 0.15);
      leftBrow.rotation.z = lerp(leftBrow.rotation.z, targetBrowRotZ, 0.15);
      rightBrow.rotation.z = lerp(rightBrow.rotation.z, -targetBrowRotZ, 0.15);

      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const hudTheme = {
    speaking: {
      border: 'border-emerald-500/70 ring-4 ring-emerald-500/20 shadow-emerald-500/20',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      text: '🎙 Alex is Speaking',
      barColor: 'bg-emerald-400',
    },
    listening: {
      border: 'border-indigo-500/70 ring-4 ring-indigo-500/20 shadow-indigo-500/20',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
      text: '👂 Alex is Listening',
      barColor: 'bg-indigo-400',
    },
    thinking: {
      border: 'border-amber-500/70 ring-4 ring-amber-500/20 shadow-amber-500/20',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      text: '🧠 Evaluating STAR Response',
      barColor: 'bg-amber-400',
    },
    idle: {
      border: 'border-slate-800 shadow-slate-900/50',
      badge: 'bg-slate-800/80 text-slate-400 border-slate-700',
      text: '✨ Executive AI Interviewer',
      barColor: 'bg-slate-600',
    },
  }[state];

  return (
    <div
      className={`relative w-full h-full min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-slate-950 border transition-all duration-500 shadow-2xl flex flex-col justify-between p-4 select-none ${hudTheme.border}`}
    >
      {/* Cinematic Ambient Background Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/35 via-slate-950/85 to-slate-950 pointer-events-none" />

      {/* Top Header HUD Bar */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                state === 'speaking'
                  ? 'bg-emerald-400'
                  : state === 'listening'
                  ? 'bg-indigo-400'
                  : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                state === 'speaking'
                  ? 'bg-emerald-500'
                  : state === 'listening'
                  ? 'bg-indigo-500'
                  : 'bg-slate-400'
              }`}
            />
          </span>
          <span className="text-xs font-black text-white tracking-wide">Alex (Executive 3D Character)</span>
        </div>

        {/* Quality & Live Status Badges */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
            60FPS WebGL
          </span>
          <div
            className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border shadow-md backdrop-blur-md transition-all duration-300 ${hudTheme.badge}`}
          >
            {hudTheme.text}
          </div>
        </div>
      </div>

      {/* Studio Viewport Brackets & 3D WebGL Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center my-2 z-10 overflow-hidden rounded-2xl border border-slate-800/80 shadow-inner group">
        {/* Corner Reticles */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500/60 z-20 pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500/60 z-20 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500/60 z-20 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500/60 z-20 pointer-events-none" />

        <div ref={mountRef} className="w-full h-full min-h-[310px]" />
      </div>

      {/* Bottom Live Audio Spectrum & Role Badge */}
      <div className="relative z-20 w-full flex items-center justify-between bg-slate-900/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Interviewing Candidate For
          </span>
          <span className="text-xs font-extrabold text-white truncate max-w-[180px]">{jobRole}</span>
        </div>

        {/* Real-time Spectrum Equalizer */}
        <div className="flex items-center gap-1 h-6">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${hudTheme.barColor}`}
              style={{
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
