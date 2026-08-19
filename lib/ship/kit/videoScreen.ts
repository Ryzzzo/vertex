/**
 * The viewport display — a rendered gas giant, playing as video.
 *
 * ── The byte argument, because video is where this goes wrong ─────────────
 *
 * The Kling source is 3840×2160 at 60fps and 21 Mbps: 38 MB for fifteen
 * seconds. The viewport occupies roughly 490 CSS px of a 1440 px frame and is
 * partly occluded by its own surround, so at dpr 2 it can never resolve more
 * than about 980 px across. Shipping the master would have been a hundredfold
 * overspend on pixels nobody can see — the same mistake as shipping a 24K EXR
 * as an environment map.
 *
 * Transcoded to 960×540 / 30fps / 12s: **0.40 MB H.264, 0.31 MB VP9.** The
 * browser takes whichever it supports and the other is never fetched.
 *
 * ── Why it reads as a screen rather than a window ─────────────────────────
 *
 * Deliberate, and it is the honest choice: a real window onto a planet would
 * need the parallax and the lighting response to agree with the room, and it
 * would not. A display does not have to — it is a surface, and surfaces are
 * allowed scanlines and a little chromatic fringing at the edges. The
 * artefacts are not decoration; they are what makes the frame legible as an
 * object in the room instead of a hole cut in the wall.
 */
import {
  MeshBasicNodeMaterial,
  VideoTexture,
  SRGBColorSpace,
  type Material,
} from "three/webgpu";
import {
  color,
  Fn,
  float,
  mix,
  smoothstep,
  texture,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { SHIP } from "../palette";

export type VideoScreen = {
  material: Material;
  /** Resolves true once the video is actually playing, false if it never can. */
  ready: Promise<boolean>;
  dispose(): void;
};

export function createVideoScreen(sources: {
  webm: string;
  mp4: string;
}): VideoScreen {
  const el = document.createElement("video");
  el.muted = true;
  el.loop = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  // Never `autoplay` as an attribute — the element is not in the document, so
  // it plays only because we ask it to, after the source is known good.
  el.setAttribute("aria-hidden", "true");

  const canWebm = el.canPlayType("video/webm; codecs=vp9") !== "";
  el.src = canWebm ? sources.webm : sources.mp4;

  const videoTexture = new VideoTexture(el);
  videoTexture.colorSpace = SRGBColorSpace;

  // Dev-only verification surface. The element is detached from the document,
  // so there is no other way for the capture harness to answer "is it actually
  // decoding frames" — and a blurred still of a rendered planet and a blurred
  // still of a procedural one are the same picture.
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__shipVideo = el;
  }

  const material = new MeshBasicNodeMaterial({ transparent: true });
  material.toneMapped = false;

  const face = Fn(() => {
    const p = uv();

    // Chromatic aberration, scaled by distance from centre so it is invisible
    // in the middle and just perceptible at the corners — which is how a real
    // lens behaves and how a fringe avoids reading as a mistake.
    const fromCentre = p.sub(vec2(0.5, 0.5));
    const amount = fromCentre.length().mul(0.0035);
    const dir = fromCentre.normalize();

    const r = texture(videoTexture, p.add(dir.mul(amount))).r;
    const g = texture(videoTexture, p).g;
    const b = texture(videoTexture, p.sub(dir.mul(amount))).b;

    // Scanlines at a low frequency and low contrast. High-contrast scanlines
    // read as a broken CRT; this reads as a panel with a refresh.
    const scan = p.y.mul(360).sin().mul(0.5).add(0.5).mul(0.055).add(0.945);

    // Edge falloff, so the image sits inside its bezel rather than running to
    // a hard cut at the frame.
    const edge = smoothstep(0.0, 0.045, p.x)
      .mul(smoothstep(1.0, 0.955, p.x))
      .mul(smoothstep(0.0, 0.06, p.y))
      .mul(smoothstep(1.0, 0.94, p.y));

    const rgb = vec3(r, g, b).mul(scan);
    // A cold lift in the blacks, so the display never goes fully to zero and
    // keeps reading as an emitting surface.
    const lifted = mix(rgb, vec3(0.06, 0.09, 0.14), float(0.06));

    return vec4(mix(color(SHIP.space), lifted, edge), edge);
  });

  material.colorNode = face();

  const ready = new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    el.addEventListener("playing", () => done(true), { once: true });
    el.addEventListener("error", () => done(false), { once: true });
    // If neither fires the procedural planet behind simply stays visible,
    // which is a correct picture rather than a fallback.
    setTimeout(() => done(false), 6000);

    el.play().catch(() => done(false));
  });

  return {
    material,
    ready,
    dispose() {
      el.pause();
      el.removeAttribute("src");
      el.load();
      videoTexture.dispose();
      material.dispose();
    },
  };
}
