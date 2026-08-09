'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

interface Alex3DRealCharacterProps {
  state: AvatarState;
  alexText?: string;
  candidateName?: string;
  jobRole?: string;
}

interface VisemeTarget {
  jaw: number;
  mouth: number;
  aa: number;
  O: number;
  E: number;
  I: number;
  U: number;
  pp: number;
  ff: number;
  th: number;
  ss: number;
  smile: number;
  cheek: number;
}

const NEUTRAL_VISEME: VisemeTarget = {
  jaw: 0,
  mouth: 0.02,
  aa: 0,
  O: 0,
  E: 0,
  I: 0,
  U: 0,
  pp: 0,
  ff: 0,
  th: 0,
  ss: 0,
  smile: 0.08,
  cheek: 0.04,
};

function getVisemeForChar(char: string, prevChar: string = ''): VisemeTarget {
  const c = char.toLowerCase();
  const pair = (prevChar + c).toLowerCase();

  if (pair === 'th') {
    return { ...NEUTRAL_VISEME, jaw: 0.12, mouth: 0.18, th: 0.7, smile: 0.06 };
  }
  if (pair === 'ch' || pair === 'sh') {
    return { ...NEUTRAL_VISEME, jaw: 0.14, mouth: 0.22, ss: 0.6, O: 0.2, smile: 0.05 };
  }

  switch (c) {
    case 'a':
      return { ...NEUTRAL_VISEME, jaw: 0.34, mouth: 0.42, aa: 0.65, smile: 0.08, cheek: 0.12 };
    case 'e':
      return { ...NEUTRAL_VISEME, jaw: 0.12, mouth: 0.22, E: 0.6, I: 0.3, smile: 0.14, cheek: 0.1 };
    case 'i':
      return { ...NEUTRAL_VISEME, jaw: 0.1, mouth: 0.18, I: 0.65, E: 0.2, smile: 0.12, cheek: 0.08 };
    case 'o':
      return { ...NEUTRAL_VISEME, jaw: 0.22, mouth: 0.3, O: 0.7, U: 0.25, smile: 0.04, cheek: 0.04 };
    case 'u':
      return { ...NEUTRAL_VISEME, jaw: 0.14, mouth: 0.2, U: 0.75, O: 0.3, smile: 0.04, cheek: 0.04 };
    case 'm':
    case 'b':
    case 'p':
      return { ...NEUTRAL_VISEME, jaw: 0.0, mouth: 0.02, pp: 0.85, smile: 0.05 };
    case 'f':
    case 'v':
      return { ...NEUTRAL_VISEME, jaw: 0.08, mouth: 0.12, ff: 0.75, smile: 0.06 };
    case 's':
    case 'z':
    case 'c':
      return { ...NEUTRAL_VISEME, jaw: 0.08, mouth: 0.14, ss: 0.65, I: 0.2, smile: 0.1 };
    case 't':
    case 'd':
    case 'n':
    case 'l':
    case 'r':
      return { ...NEUTRAL_VISEME, jaw: 0.14, mouth: 0.2, E: 0.3, I: 0.2, smile: 0.08 };
    case 'k':
    case 'g':
    case 'q':
    case 'h':
    case 'x':
      return { ...NEUTRAL_VISEME, jaw: 0.22, mouth: 0.28, aa: 0.35, smile: 0.06 };
    case ' ':
    case ',':
    case '.':
    case '?':
    case '!':
      return NEUTRAL_VISEME;
    default:
      return { ...NEUTRAL_VISEME, jaw: 0.12, mouth: 0.18, aa: 0.3, smile: 0.08 };
  }
}

export function Alex3DRealCharacter({
  state,
  alexText = '',
}: Alex3DRealCharacterProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AvatarState>(state);
  const alexTextRef = useRef<string>(alexText);

  const [progress, setProgress] = useState<number | null>(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    alexTextRef.current = alexText;
  }, [alexText]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 400;
    const H = el.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);

    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
    camera.position.set(0, 1.4, 1.85);
    camera.lookAt(0, 1.15, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));

    const key = new THREE.DirectionalLight(0xfff8ee, 2.5);
    key.position.set(1.5, 2.8, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x7c8cf8, 1.4);
    fill.position.set(-1.8, 1.5, 1.8);
    scene.add(fill);

    const rim = new THREE.PointLight(0x9333ea, 3.2, 7);
    rim.position.set(0, 2.2, -1.5);
    scene.add(rim);

    const morphMeshes: THREE.Mesh[] = [];
    let headBone: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;

    const setMorph = (name: string, w: number) => {
      for (const m of morphMeshes) {
        const d = m.morphTargetDictionary,
          inf = m.morphTargetInfluences;
        if (d && inf) {
          const idx = d[name];
          if (idx !== undefined) inf[idx] = Math.max(0, Math.min(1, w));
        }
      }
    };

    setProgress(5);
    new GLTFLoader().load(
      encodeURI('/A person sitting comfortably at a desk, looki_variant2.glb'),
      (gltf) => {
        const model = gltf.scene;
        model.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.morphTargetDictionary && m.morphTargetInfluences) morphMeshes.push(m);
          }
        });

        headBone = model.getObjectByName('Head') ?? null;

        const box = new THREE.Box3().setFromObject(model);
        const sz = box.getSize(new THREE.Vector3());
        const ctr = box.getCenter(new THREE.Vector3());
        const scl = 1.92 / Math.max(sz.x, sz.y, sz.z, 0.001);
        model.scale.setScalar(scl);
        model.position.set(-ctr.x * scl, -box.min.y * scl, -ctr.z * scl);
        scene.add(model);

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }

        scene.updateMatrixWorld(true);
        if (headBone) {
          const hp = new THREE.Vector3();
          headBone.getWorldPosition(hp);
          camera.position.set(0, hp.y - 0.18, 1.55);
          camera.lookAt(0, hp.y - 0.22, 0);
        }

        setProgress(100);
        setTimeout(() => setProgress(null), 300);
      },
      (xhr) => {
        if (xhr.total > 0) setProgress(Math.round((xhr.loaded / xhr.total) * 100));
      },
      (err) => {
        console.error('GLB error:', err);
        setProgress(null);
      }
    );

    const clock = new THREE.Clock();
    let raf: number;

    let sJaw = 0,
      sMouth = 0,
      sAA = 0,
      sO = 0,
      sE = 0,
      sI = 0,
      sU = 0,
      sPP = 0,
      sFF = 0,
      sTH = 0,
      sSS = 0;
    let sSmile = 0.06,
      sCheek = 0.04;
    let sBrowUp = 0,
      sBrowOuter = 0,
      sBrowDn = 0;
    let sBlink = 0;
    let sHeadX = -0.26,
      sHeadY = 0;

    let blinkT = 0,
      blinkPh: 'wait' | 'close' | 'open' = 'wait';
    const BLINK_INT = 3.6;

    let speechStartTime = 0;
    let lastState: AvatarState = 'idle';

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const st = stateRef.current;
      const currentText = alexTextRef.current || '';

      if (st === 'speaking' && lastState !== 'speaking') {
        speechStartTime = t;
      }
      lastState = st;

      if (mixer) {
        let animSpeed = 0.2;
        if (st === 'speaking') {
          animSpeed = 0.5;
        } else if (st === 'listening') {
          animSpeed = 0.25;
        } else if (st === 'thinking') {
          animSpeed = 0.15;
        }
        mixer.update(dt * animSpeed);
      }

      blinkT += dt;
      if (blinkPh === 'wait' && blinkT > BLINK_INT) {
        blinkPh = 'close';
        blinkT = 0;
      }
      if (blinkPh === 'close') {
        sBlink = Math.min(1, blinkT / 0.08);
        if (blinkT > 0.08) {
          blinkPh = 'open';
          blinkT = 0;
        }
      } else if (blinkPh === 'open') {
        sBlink = Math.max(0, 1 - blinkT / 0.08);
        if (blinkT > 0.08) {
          blinkPh = 'wait';
          blinkT = 0;
          sBlink = 0;
        }
      }
      setMorph('eyeBlinkLeft', sBlink);
      setMorph('eyeBlinkRight', sBlink);

      let targetViseme = NEUTRAL_VISEME;
      let tBrowUp = 0,
        tBrowOuter = 0,
        tBrowDn = 0;
      let tHeadX = 0.10,
        tHeadY = 0;

      if (st === 'speaking') {
        const speechTime = t - speechStartTime;
        const charRate = 13.5;
        const charIdx = Math.floor(speechTime * charRate);

        if (currentText && currentText.length > 0 && charIdx < currentText.length) {
          const currentChar = currentText[charIdx] || ' ';
          const prevChar = charIdx > 0 ? currentText[charIdx - 1] : '';
          targetViseme = getVisemeForChar(currentChar, prevChar);
        } else {
          const altCycle = Math.floor(speechTime * 5.5) % 5;
          const altChars = ['a', 'e', 'o', 'm', 's'];
          targetViseme = getVisemeForChar(altChars[altCycle]);
        }

        const emphCycle = Math.sin(t * 2.5);
        tBrowUp = 0.08 + Math.max(0, emphCycle) * 0.12;
        tBrowOuter = 0.05 + Math.max(0, emphCycle) * 0.06;

        tHeadX = 0.10 + Math.sin(t * 0.7) * 0.035;
        tHeadY = Math.sin(t * 0.4) * 0.025;
      } else if (st === 'listening') {
        targetViseme = { ...NEUTRAL_VISEME, smile: 0.14, cheek: 0.1 };
        tBrowUp = 0.07;
        tBrowOuter = 0.04;
        tHeadX = 0.12;
      } else if (st === 'thinking') {
        targetViseme = { ...NEUTRAL_VISEME, smile: 0.02, cheek: 0.02 };
        tBrowDn = 0.18;
        tHeadX = 0.08;
      } else {
        targetViseme = NEUTRAL_VISEME;
      }

      const MS = 0.12;
      const ES = 0.05;
      const HS = 0.03;

      sJaw = lerp(sJaw, targetViseme.jaw, MS);
      sMouth = lerp(sMouth, targetViseme.mouth, MS);
      sAA = lerp(sAA, targetViseme.aa, MS);
      sO = lerp(sO, targetViseme.O, MS);
      sE = lerp(sE, targetViseme.E, MS);
      sI = lerp(sI, targetViseme.I, MS);
      sU = lerp(sU, targetViseme.U, MS);
      sPP = lerp(sPP, targetViseme.pp, MS);
      sFF = lerp(sFF, targetViseme.ff, MS);
      sTH = lerp(sTH, targetViseme.th, MS);
      sSS = lerp(sSS, targetViseme.ss, MS);

      sSmile = lerp(sSmile, targetViseme.smile, ES);
      sCheek = lerp(sCheek, targetViseme.cheek, ES);
      sBrowUp = lerp(sBrowUp, tBrowUp, ES);
      sBrowOuter = lerp(sBrowOuter, tBrowOuter, ES);
      sBrowDn = lerp(sBrowDn, tBrowDn, ES);
      sHeadX = lerp(sHeadX, tHeadX, HS);
      sHeadY = lerp(sHeadY, tHeadY, HS);

      setMorph('jawOpen', sJaw);
      setMorph('mouthOpen', sMouth);
      setMorph('viseme_aa', sAA);
      setMorph('viseme_O', sO);
      setMorph('viseme_E', sE);
      setMorph('viseme_I', sI);
      setMorph('viseme_U', sU);
      setMorph('viseme_PP', sPP);
      setMorph('viseme_FF', sFF);
      setMorph('viseme_TH', sTH);
      setMorph('viseme_SS', sSS);
      setMorph('mouthSmile', sSmile);
      setMorph('mouthSmileLeft', sSmile * 0.85);
      setMorph('mouthSmileRight', sSmile * 0.85);
      setMorph('cheekSquintLeft', sCheek);
      setMorph('cheekSquintRight', sCheek);
      setMorph('browInnerUp', sBrowUp);
      setMorph('browOuterUpLeft', sBrowOuter);
      setMorph('browOuterUpRight', sBrowOuter);
      setMorph('browDownLeft', sBrowDn);
      setMorph('browDownRight', sBrowDn);

      if (headBone) {
        headBone.rotation.x = sHeadX;
        headBone.rotation.y = sHeadY;

        scene.updateMatrixWorld(true);
        const hp = new THREE.Vector3();
        headBone.getWorldPosition(hp);
        camera.position.set(0, hp.y - 0.18, 1.55);
        camera.lookAt(0, hp.y - 0.22, 0);
      }

      renderer.render(scene, camera);
    };

    tick();

    const onResize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#070b14] overflow-hidden">
      {progress !== null && (
        <div className="absolute inset-0 bg-[#070b14]/95 z-30 flex flex-col items-center justify-center gap-4">
          <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-white tracking-wider uppercase">Loading AI Interviewer…</p>
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
