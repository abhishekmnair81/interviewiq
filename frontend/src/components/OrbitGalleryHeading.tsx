'use client';

import { useEffect, useRef } from 'react';

/**
 * OrbitGalleryHeading — a self-contained Canvas-2D orbiting-ring heading.
 *
 * Inspired by the ThreeUI "GalleryHeading" (Matte Rise) rotating-ring motion,
 * but rebuilt from scratch so the 12 orbiting tiles can carry custom
 * InterviewIQ-themed vector artwork (mic / gaze / STAR / resume / coding /
 * analytics …) in the site's own violet–amber palette, with a custom two-line
 * headline composited between the front and back tiles.
 *
 * Notes:
 * - Pure Canvas 2D (NOT WebGL) — safe to place alongside the landing page's
 *   single LaserCollection WebGL background without risking a lost context.
 * - Transparent background: it blends onto the existing dark page, no full-page
 *   background effect of its own.
 * - Continuous slow auto-rotation; freezes on a single frame when the user
 *   prefers reduced motion.
 */

type Tint = 'violet' | 'indigo' | 'amber' | 'emerald' | 'cyan';

interface TileSpec {
  label: string;
  tint: Tint;
  glyph: string;
}

// Palette drawn from the InterviewIQ theme tokens (dark → mid → light).
const TINTS: Record<Tint, [string, string, string]> = {
  violet: ['#2e1065', '#6d28d9', '#a78bfa'],
  indigo: ['#1e1b4b', '#4f46e5', '#818cf8'],
  amber: ['#451a03', '#d97706', '#fbbf24'],
  emerald: ['#052e2b', '#059669', '#34d399'],
  cyan: ['#083344', '#0891b2', '#22d3ee'],
};

const TILES: TileSpec[] = [
  { label: 'SPEECH', tint: 'cyan', glyph: 'mic' },
  { label: 'EYE CONTACT', tint: 'violet', glyph: 'eye' },
  { label: 'STAR METHOD', tint: 'amber', glyph: 'star' },
  { label: 'RESUME', tint: 'indigo', glyph: 'doc' },
  { label: 'CODING', tint: 'emerald', glyph: 'code' },
  { label: 'ANALYTICS', tint: 'violet', glyph: 'chart' },
  { label: 'TONE', tint: 'cyan', glyph: 'wave' },
  { label: 'REAL-TIME', tint: 'amber', glyph: 'bolt' },
  { label: 'MULTIMODAL', tint: 'indigo', glyph: 'layers' },
  { label: 'SCORING', tint: 'violet', glyph: 'trophy' },
  { label: 'PRACTICE', tint: 'emerald', glyph: 'play' },
  { label: 'PROGRESS', tint: 'amber', glyph: 'trend' },
];

interface Props {
  line1?: string;
  line2?: string;
  className?: string;
}

// ── Vector glyphs, drawn in a unit space [-1, 1] (context pre-scaled) ────────
function drawGlyph(g: CanvasRenderingContext2D, type: string) {
  g.lineWidth = 0.13;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  switch (type) {
    case 'mic':
      rr(-0.3, -0.95, 0.6, 1.0, 0.3); g.stroke();
      g.beginPath(); g.arc(0, -0.1, 0.55, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
      g.beginPath(); g.moveTo(0, 0.45); g.lineTo(0, 0.82); g.moveTo(-0.34, 0.82); g.lineTo(0.34, 0.82); g.stroke();
      break;
    case 'eye':
      g.beginPath(); g.moveTo(-0.92, 0); g.quadraticCurveTo(0, -0.72, 0.92, 0);
      g.quadraticCurveTo(0, 0.72, -0.92, 0); g.closePath(); g.stroke();
      g.beginPath(); g.arc(0, 0, 0.3, 0, Math.PI * 2); g.stroke();
      break;
    case 'star': {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 0.98 : 0.42;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      break;
    }
    case 'doc':
      rr(-0.58, -0.85, 1.16, 1.7, 0.14); g.stroke();
      g.beginPath();
      [-0.4, -0.12, 0.16, 0.44].forEach((y) => { g.moveTo(-0.32, y); g.lineTo(0.32, y); });
      g.stroke();
      break;
    case 'code':
      g.beginPath();
      g.moveTo(-0.28, -0.5); g.lineTo(-0.78, 0); g.lineTo(-0.28, 0.5);
      g.moveTo(0.28, -0.5); g.lineTo(0.78, 0); g.lineTo(0.28, 0.5);
      g.moveTo(0.14, -0.62); g.lineTo(-0.14, 0.62);
      g.stroke();
      break;
    case 'chart':
      g.beginPath(); g.moveTo(-0.8, -0.8); g.lineTo(-0.8, 0.8); g.lineTo(0.85, 0.8); g.stroke();
      g.beginPath(); g.moveTo(-0.6, 0.42); g.lineTo(-0.18, 0.0); g.lineTo(0.22, 0.24); g.lineTo(0.72, -0.5); g.stroke();
      break;
    case 'wave':
      g.beginPath();
      [[-0.75, 0.34], [-0.45, 0.72], [-0.15, 0.5], [0.15, 0.92], [0.45, 0.46], [0.75, 0.62]].forEach(([x, h]) => {
        g.moveTo(x, -h); g.lineTo(x, h);
      });
      g.stroke();
      break;
    case 'bolt':
      g.beginPath();
      g.moveTo(0.12, -0.95); g.lineTo(-0.46, 0.12); g.lineTo(0.02, 0.12);
      g.lineTo(-0.1, 0.95); g.lineTo(0.48, -0.16); g.lineTo(0.0, -0.16);
      g.closePath(); g.fill();
      break;
    case 'layers':
      [-0.48, 0.0, 0.48].forEach((dy) => {
        g.beginPath();
        g.moveTo(0, dy - 0.3); g.lineTo(0.82, dy); g.lineTo(0, dy + 0.3); g.lineTo(-0.82, dy);
        g.closePath(); g.stroke();
      });
      break;
    case 'trophy':
      g.beginPath();
      g.moveTo(-0.5, -0.72); g.lineTo(0.5, -0.72); g.lineTo(0.34, 0.02);
      g.lineTo(-0.34, 0.02); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(-0.5, -0.6); g.arc(-0.5, -0.4, 0.22, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.beginPath(); g.moveTo(0.5, -0.6); g.arc(0.5, -0.4, 0.22, -Math.PI / 2, Math.PI / 2, true); g.stroke();
      g.beginPath(); g.moveTo(0, 0.02); g.lineTo(0, 0.5);
      g.moveTo(-0.4, 0.72); g.lineTo(0.4, 0.72); g.moveTo(-0.22, 0.5); g.lineTo(0.22, 0.5); g.stroke();
      break;
    case 'play':
      g.beginPath(); g.arc(0, 0, 0.88, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.26, -0.42); g.lineTo(0.46, 0); g.lineTo(-0.26, 0.42); g.closePath(); g.fill();
      break;
    case 'trend':
      g.beginPath(); g.moveTo(-0.82, 0.5); g.lineTo(-0.24, -0.06); g.lineTo(0.16, 0.32); g.lineTo(0.82, -0.46); g.stroke();
      g.beginPath(); g.moveTo(0.34, -0.46); g.lineTo(0.82, -0.46); g.lineTo(0.82, 0.02); g.stroke();
      break;
  }
}

// ── Build a 4:3 tile texture for one skill (icon + label on a glassy plate) ──
function buildTileTexture(spec: TileSpec, W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const [dark, mid, light] = TINTS[spec.tint];

  // Plate base
  g.fillStyle = '#0a0a12';
  g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, dark);
  grad.addColorStop(1, '#07070d');
  g.globalAlpha = 0.92; g.fillStyle = grad; g.fillRect(0, 0, W, H); g.globalAlpha = 1;

  // Tint glow behind the icon
  const glow = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.55);
  glow.addColorStop(0, mid + 'cc');
  glow.addColorStop(0.5, mid + '33');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // Inset rounded border
  const inset = W * 0.045, r = W * 0.09;
  g.strokeStyle = 'rgba(255,255,255,0.14)';
  g.lineWidth = Math.max(1.5, W * 0.006);
  g.beginPath();
  g.moveTo(inset + r, inset);
  g.arcTo(W - inset, inset, W - inset, H - inset, r);
  g.arcTo(W - inset, H - inset, inset, H - inset, r);
  g.arcTo(inset, H - inset, inset, inset, r);
  g.arcTo(inset, inset, W - inset, inset, r);
  g.closePath(); g.stroke();

  // Icon
  const iconR = H * 0.24;
  g.save();
  g.translate(W / 2, H * 0.42);
  g.scale(iconR, iconR);
  g.strokeStyle = light;
  g.fillStyle = light;
  g.shadowColor = mid;
  g.shadowBlur = W * 0.03;
  drawGlyph(g, spec.glyph);
  g.restore();

  // Label
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = `700 ${Math.round(W * 0.085)}px Inter, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  const tracked = spec.label.split('').join(' ');
  g.fillText(tracked, W / 2, H * 0.82);
  g.restore();

  return c;
}


export default function OrbitGalleryHeading({
  line1 = 'EVERYTHING WE',
  line2 = 'MEASURE IN ORBIT',
  className = '',
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Ring geometry — tiles ride an ellipse but stay upright (billboards),
    // so nothing tumbles or reads upside-down as it orbits.
    const N = TILES.length;
    const AX = 8 * (Math.PI / 180); // slight roll of the ellipse
    const cf = 0.34; // tilt → flatter, wider ellipse (less vertical spread)
    const sf = Math.sqrt(1 - cf * cf);
    const U: [number, number, number] = [Math.cos(AX), Math.sin(AX), 0];
    const V: [number, number, number] = [-Math.sin(AX) * cf, Math.cos(AX) * cf, sf];
    const DIST = 13; // perspective depth
    const HW = 0.22; // tile half-width (fraction of ring radius)
    const ASPECT = 0.72; // 4:3-ish tiles

    // Pre-render the 12 tile textures once
    const TEX_W = 512, TEX_H = Math.round(512 * ASPECT);
    const front = TILES.map((t) => buildTileTexture(t, TEX_W, TEX_H));
    const back = front.map((f) => {
      const c = document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      const g = c.getContext('2d')!;
      g.drawImage(f, 0, 0);
      g.fillStyle = 'rgba(4,3,8,0.62)';
      g.fillRect(0, 0, c.width, c.height);
      return c;
    });

    let W = 0, H = 0, cx = 0, cy = 0, radius = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cx = W / 2;
      cy = H / 2;
      // Fit the whole ring (incl. tile height) inside the box so the top and
      // bottom of the orbit are never clipped.
      radius = Math.min(W * 0.37, H * 0.78);
    };

    const add = (
      a: [number, number, number],
      b: [number, number, number],
      s: number,
    ): [number, number, number] => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

    const project = (p: [number, number, number]) => {
      const k = (radius * DIST) / (DIST - p[2]);
      return { x: cx + k * p[0], y: cy + k * p[1], k };
    };

    const drawHeadline = () => {
      const size = Math.min(W * 0.072, H * 0.2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
      // line 1 — muted
      ctx.fillStyle = 'rgba(226,232,240,0.55)';
      ctx.fillText(line1, cx, cy - size * 0.62);
      // line 2 — bright violet→amber gradient
      const grad = ctx.createLinearGradient(cx - W * 0.35, cy, cx + W * 0.35, cy);
      grad.addColorStop(0, '#c084fc');
      grad.addColorStop(0.5, '#818cf8');
      grad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(129,140,248,0.5)';
      ctx.shadowBlur = size * 0.35;
      ctx.fillText(line2, cx, cy + size * 0.62);
      ctx.shadowBlur = 0;
    };

    // Upright billboard tile: only its POSITION follows the ellipse; the artwork
    // is always drawn axis-aligned so text/icons never flip. Depth (z) drives
    // perspective scale and front/back dimming.
    const drawTile = (idx: number, center: [number, number, number]) => {
      const p0 = project(center);
      const facing = center[2] > 0;
      const img = facing ? front[idx] : back[idx];
      const halfW = p0.k * HW;
      const halfH = halfW * ASPECT;
      ctx.save();
      ctx.globalAlpha = facing ? 1 : 0.82;
      ctx.translate(p0.x, p0.y);
      ctx.drawImage(img, -halfW, -halfH, halfW * 2, halfH * 2);
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // Clock that only advances while not paused (hover pauses the orbit).
    let raf = 0;
    let paused = false;
    let elapsed = reduce ? 2400 : 0;
    let lastTs = performance.now();

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const spin = (elapsed / 26000) * Math.PI * 2;

      const items = TILES.map((_t, i) => {
        const psi = spin + (i * Math.PI * 2) / N;
        const center = add(add([0, 0, 0], U, Math.cos(psi)), V, Math.sin(psi));
        return { i, center, z: center[2] };
      }).sort((a, b) => a.z - b.z);

      let headlineDrawn = false;
      for (const it of items) {
        if (!headlineDrawn && it.z > 0) {
          drawHeadline();
          headlineDrawn = true;
        }
        drawTile(it.i, it.center as [number, number, number]);
      }
      if (!headlineDrawn) drawHeadline();
    };

    const frame = (now: number) => {
      if (!paused) elapsed += now - lastTs;
      lastTs = now;
      draw();
      raf = requestAnimationFrame(frame);
    };

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; lastTs = performance.now(); };

    resize();
    if (reduce) {
      draw();
    } else {
      lastTs = performance.now();
      raf = requestAnimationFrame(frame);
      wrap.addEventListener('pointerenter', onEnter);
      wrap.addEventListener('pointerleave', onLeave);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        resize();
        if (reduce) draw();
      });
      ro.observe(wrap);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      wrap.removeEventListener('pointerenter', onEnter);
      wrap.removeEventListener('pointerleave', onLeave);
    };
  }, [line1, line2]);

  return (
    <div
      ref={wrapRef}
      className={className}
      aria-label={`${line1} ${line2}`}
      role="img"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
