"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import epiludeFooterSource from "./sources/epilude-footer";

type FocusRole = "background" | "button" | "visual";
type EffectMode = "light" | "dark";

type FocusTarget = {
  selector: string;
  role: FocusRole;
  fit?: "cover" | "contain-square" | "wide-wordmark" | "portrait-stage";
  preserveTransform?: boolean;
};

type EffectDefinition = {
  title: string;
  source: string;
  background: string;
  targets: readonly FocusTarget[];
  theme?: {
    nativeMode?: EffectMode;
    lightBackground: string;
    darkBackground: string;
    invertBackground?: boolean;
  };
  transformSource?: (source: string, mode: EffectMode) => string;
  hiddenTargets?: readonly string[];
  introWordmark?: {
    sceneSelector: string;
    text: string;
    fontSize: number;
    endTime: number;
    holdTime: number;
    logoSvg: string;
  };
};

// Change 'SHADERS' to 'InterviewIQ'
const SHADERS_WORDMARK_SVG = `<svg width="1600" height="300" viewBox="0 0 1600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
  <text x="800" y="235" text-anchor="middle" fill="#F4F4F0" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="200" font-weight="900" letter-spacing="-4">Interview<tspan fill="#A78BFA">I</tspan><tspan fill="#FBBF24">Q</tspan></text>
</svg>`;

export type NeuformIsolatedEffectProps = {
  mode?: EffectMode;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

export const NEUFORM_ISOLATED_DEFAULTS = {
  mode: "dark",
  hue: 0,
  saturation: 1,
  brightness: 1,
} as const;

function transformEpiludeWordmarkSource(source: string, mode: EffectMode) {
  const palette =
    mode === "light"
      ? "[[8, 10, 15], [40, 48, 62], [85, 96, 116]]"
      : "[[255, 255, 255], [226, 232, 240], [191, 205, 225]]";

  return source
    .replace("<title>Epilude — Footer</title>", "<title>Shaders Particle Wordmark</title>")
    .replace("aspect-ratio: 8.541554959785524;", "aspect-ratio: 5.333333333333333;")
    .replace(/var WORDMARK =[\s\S]*?"<\/svg>";/, `var WORDMARK = ${JSON.stringify(SHADERS_WORDMARK_SVG)};`)
    .replace("var PALETTE = [[255, 255, 255], [226, 232, 240], [191, 205, 225]];", `var PALETTE = ${palette};`)
    .replace("a: 0.04 + 0.95 * band * Math.pow(flake, 1.8)", "a: 0.14 + 0.86 * band * Math.pow(flake, 1.8)")
    .replace(
      "return Math.pow(lum * (data[i + 3] / 255), GAMMA);",
      "return { m: Math.pow(lum * (data[i + 3] / 255), GAMMA), r: data[i], g: data[i + 1], b: data[i + 2] };"
    )
    .replace(
      "mask: sample ? sample(px, py) : 1",
      "maskData: sample ? sample(px, py) : { m: 1, r: 244, g: 244, b: 240 }"
    )
    .replace(
      "var rgb = mixPalette(field.p);",
      `var rgb = mixPalette(field.p);
       p.mask = p.maskData ? p.maskData.m : 1;
       if (p.maskData && (Math.abs(p.maskData.r - p.maskData.b) > 20 || Math.abs(p.maskData.g - p.maskData.b) > 20)) {
         rgb = [p.maskData.r, p.maskData.g, p.maskData.b];
       }`
    );
}

const EFFECTS = {
  particleWordmark: {
    title: "Shaders particle wordmark",
    source: epiludeFooterSource,
    background: "#0c0c0d",
    theme: {
      lightBackground: "#f4f7fb",
      darkBackground: "#0c0c0d",
    },
    transformSource: transformEpiludeWordmarkSource,
    targets: [{ selector: "#storm", role: "visual", fit: "wide-wordmark" }],
  },
} as const satisfies Record<string, EffectDefinition>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function effectBackground(definition: EffectDefinition, mode: EffectMode) {
  return definition.theme?.[`${mode}Background`] ?? definition.background;
}

function buildFocusedDocument(definition: EffectDefinition, mode: EffectMode) {
  const background = effectBackground(definition, mode);
  const invertBackground = definition.theme?.invertBackground === true && definition.theme.nativeMode !== mode;

  const source = definition.transformSource?.(definition.source, mode) ?? definition.source;
  const targetJson = JSON.stringify(definition.targets).replace(/</g, "\\u003c");
  const hiddenTargetJson = JSON.stringify(definition.hiddenTargets ?? []).replace(/</g, "\\u003c");
  const introWordmarkJson = JSON.stringify(definition.introWordmark ?? null).replace(/</g, "\\u003c");
  const modeJson = JSON.stringify(mode);

  const backgroundFilter = invertBackground
    ? "filter: invert(1) hue-rotate(180deg) saturate(.92) brightness(1.02) !important;"
    : "";
  const introWordmarkStyle = definition.introWordmark
    ? `${definition.introWordmark.sceneSelector} .tx { font-size: ${definition.introWordmark.fontSize}px !important; }`
    : "";

  const focusStyle = `<style data-threeui-focus>
  html, body { width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: ${background} !important; color-scheme: ${mode} !important; }
  body { position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; }
  body > * { visibility: hidden !important; }
  body[data-threeui-ready] > [data-threeui-role] { visibility: visible !important; }
  [data-threeui-residual] { display: none !important; }
  [data-threeui-hidden] { display: none !important; }
  [data-threeui-role="background"] { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; z-index: 0 !important; opacity: 1 !important; pointer-events: none !important; ${backgroundFilter} }
  [data-threeui-role="background"][data-threeui-fit="contain-square"] { position: absolute !important; top: 50% !important; right: auto !important; bottom: auto !important; left: 50% !important; width: min(100vw, 100vh) !important; height: min(100vw, 100vh) !important; aspect-ratio: 1 / 1 !important; transform: translate(-50%, -50%) !important; }
  [data-threeui-role="button"] { position: relative !important; z-index: 2 !important; opacity: 1 !important; flex: none !important; }
  [data-threeui-role="button"]:not([data-threeui-preserve-transform]) { transform: none !important; }
  [data-threeui-role="visual"] { position: relative !important; z-index: 1 !important; width: min(100%, 1040px) !important; max-width: 1040px !important; max-height: 100% !important; margin: auto !important; padding: 24px !important; overflow: auto !important; opacity: 1 !important; filter: none !important; }
  [data-threeui-role="visual"]:not([data-threeui-preserve-transform]) { transform: none !important; }
  [data-threeui-role="visual"][data-threeui-fit="contain-square"] { flex: none !important; width: min(calc(100vw - 32px), calc(100vh - 32px)) !important; max-width: none !important; height: min(calc(100vw - 32px), calc(100vh - 32px)) !important; max-height: none !important; aspect-ratio: 1 / 1 !important; padding: 0 !important; overflow: hidden !important; }
  [data-threeui-role="visual"][data-threeui-fit="wide-wordmark"] { width: min(calc(100vw - 48px), 1180px) !important; max-width: calc(100vw - 48px) !important; height: auto !important; max-height: none !important; aspect-ratio: 16 / 3 !important; padding: 0 !important; overflow: hidden !important; }
  [data-threeui-role="visual"][data-threeui-fit="portrait-stage"] { position: absolute !important; top: 50% !important; right: auto !important; bottom: auto !important; left: 50% !important; width: 1080px !important; max-width: none !important; height: 1350px !important; max-height: none !important; padding: 0 !important; overflow: hidden !important; transform-origin: center !important; }
  ${introWordmarkStyle}
</style>`;

  const focusScript = `<script data-threeui-focus>
  (function () {
    document.documentElement.dataset.sfMode = ${modeJson};
    var isolated = false;
    function isolate() {
      if (isolated) return;
      var specs = ${targetJson};
      var hiddenSelectors = ${hiddenTargetJson};
      var introWordmark = ${introWordmarkJson};
      var roots = [];
      hiddenSelectors.forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (element) {
          element.setAttribute('data-threeui-hidden', '');
          element.setAttribute('aria-hidden', 'true');
          if ('inert' in element) element.inert = true;
        });
      });
      specs.forEach(function (spec) {
        var element = document.querySelector(spec.selector);
        if (!element) return;
        element.setAttribute('data-threeui-role', spec.role);
        if (spec.fit) element.setAttribute('data-threeui-fit', spec.fit);
        if (spec.preserveTransform) element.setAttribute('data-threeui-preserve-transform', '');
        if (!roots.some(function (root) { return root.contains(element); })) roots.push(element);
      });
      if (introWordmark) {
        var introScene = document.querySelector(introWordmark.sceneSelector);
        var introText = introScene && introScene.querySelector('.tx');
        var introMark = introText && introText.querySelector('.mark');
        if (introText && introMark) {
          introMark.innerHTML = introWordmark.logoSvg;
          var introCharacters = Array.from(introText.children).filter(function (element) { return element !== introMark; });
          introCharacters.forEach(function (element, index) {
            element.textContent = introWordmark.text[index] === ' ' ? '\\u00a0' : (introWordmark.text[index] || '');
            element.style.display = index < introWordmark.text.length ? 'inline-block' : 'none';
          });
        }
        var introReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var introStartedAt = performance.now();
        function renderIntroWordmark(now) {
          if (typeof window.__seek !== 'function') return;
          if (introReducedMotion) {
            window.__seek(introWordmark.endTime);
            return;
          }
          var introCycle = introWordmark.endTime + introWordmark.holdTime;
          var introTime = ((now - introStartedAt) / 1000) % introCycle;
          window.__seek(Math.min(introTime, introWordmark.endTime));
          requestAnimationFrame(renderIntroWordmark);
        }
        requestAnimationFrame(renderIntroWordmark);
      }
      if (!roots.length) return;
      isolated = true;
      roots.forEach(function (root) {
        var placeholderLink = root.matches('a[href="#"]') ? root : root.querySelector('a[href="#"]');
        if (placeholderLink) placeholderLink.addEventListener('click', function (event) { event.preventDefault(); });
        document.body.appendChild(root);
      });
      Array.from(document.body.children).forEach(function (element) {
        if (roots.indexOf(element) !== -1) return;
        element.setAttribute('data-threeui-residual', '');
        element.setAttribute('aria-hidden', 'true');
        if ('inert' in element) element.inert = true;
      });
      document.body.setAttribute('data-threeui-ready', '');
      requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
    }
    function scheduleIsolation() { setTimeout(isolate, 100); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleIsolation, { once: true });
    else scheduleIsolation();
    window.addEventListener('load', isolate, { once: true });
  })();
</script>`;

  return source.replace(/<\/head>/i, `${focusStyle}</head>`).replace(/<\/body>/i, `${focusScript}</body>`);
}

function NeuformIsolatedEffect({
  definition,
  mode = NEUFORM_ISOLATED_DEFAULTS.mode,
  hue = NEUFORM_ISOLATED_DEFAULTS.hue,
  saturation = NEUFORM_ISOLATED_DEFAULTS.saturation,
  brightness = NEUFORM_ISOLATED_DEFAULTS.brightness,
  runtime,
  trackPointerHover,
  className,
  style,
}: NeuformIsolatedEffectProps & {
  definition: EffectDefinition;
  runtime?: Readonly<Record<string, number | string>>;
  trackPointerHover?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const safeMode: EffectMode = mode === "light" ? "light" : "dark";
  const background = effectBackground(definition, safeMode);
  const source = useMemo(() => buildFocusedDocument(definition, safeMode), [definition, safeMode]);
  const safeHue = clamp(hue, -180, 180);
  const safeSaturation = clamp(saturation, 0, 2);
  const safeBrightness = clamp(brightness, 0.35, 1.65);
  const filter = safeHue === 0 && safeSaturation === 1 && safeBrightness === 1 ? undefined : `hue-rotate(${safeHue}deg) saturate(${safeSaturation}) brightness(${safeBrightness})`;

  useEffect(() => {
    const frame = frameRef.current;
    if (!trackPointerHover || !frame) return undefined;
    let inside = false;
    const leave = () => {
      if (!inside) return;
      inside = false;
      frame.contentWindow?.postMessage({ threeuiRuntime: { hover: 0 } }, "*");
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source === frame.contentWindow && event.data?.threeuiPointerOver) inside = true;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!inside) return;
      const bounds = frame.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (outside) leave();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("pointermove", onPointerMove, true);
    frame.addEventListener("pointerleave", leave);
    document.addEventListener("mouseleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pointermove", onPointerMove, true);
      frame.removeEventListener("pointerleave", leave);
      document.removeEventListener("mouseleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [trackPointerHover]);

  const runtimeMessage = runtime ? JSON.stringify(runtime) : null;
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !runtimeMessage) return;
    const post = () => frame.contentWindow?.postMessage({ threeuiRuntime: JSON.parse(runtimeMessage) }, "*");
    post();
    frame.addEventListener("load", post);
    return () => frame.removeEventListener("load", post);
  }, [runtimeMessage, source]);

  return (
    <iframe
      ref={frameRef}
      className={className}
      data-mode={safeMode}
      title={definition.title}
      srcDoc={source}
      sandbox="allow-scripts"
      loading="eager"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        border: 0,
        background,
        filter,
        ...style,
      }}
    />
  );
}

function createEffectComponent(definition: EffectDefinition) {
  return function EffectComponent(props: NeuformIsolatedEffectProps) {
    return <NeuformIsolatedEffect {...props} definition={definition} />;
  };
}

export const ParticleWordmark = createEffectComponent(EFFECTS.particleWordmark);

export function TextAnimationCollection(props: any) {
  if (props.variant === "particle-wordmark") {
    return <ParticleWordmark {...props} />;
  }
  return null;
}
