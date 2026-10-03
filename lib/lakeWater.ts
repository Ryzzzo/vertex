/**
 * The live lake on The Drowned Hollow's key art.
 *
 * The picture is a finished Cycles render (the drawdown key art). Only the
 * lake moves, and it moves the way a calm lake does: the render already holds
 * the reflection, so each water pixel tilts its own little patch of surface
 * and shows the part of that reflection a tilted mirror would show. Because
 * the lake is a flat plane seen from a known camera, every pixel knows where
 * it lies on the water in metres, so the waves are defined in metres and come
 * out in true perspective — fine and close under the boat, long and slow at
 * the steeple — and a wave too fine to show at a pixel's distance is faded out
 * rather than left to shimmer.
 *
 * Three helper passes, rendered from the same Blender scene as the key art
 * (render kit: drawdown.py + passes.py), ship beside it:
 *   aux    R = where the lake surface is visible, G = the two near mist bands
 *   lamp   the lantern's own light alone, so its flicker reaches everything it lights
 *
 * The base texture is the page's own <img>, so the picture is never fetched twice.
 */

/** Camera of the key art render: Blender's world-from-camera rotation, column-major. */
const CAM_POS = [-0.2, -3.4, 1.4] as const;
const CAM_ROT = [
  0.9985509514808655, -0.05381413921713829, 1.209555344772184e-9,
  0.0022504401858896017, 0.04175817593932152, 0.9991251826286316,
  -0.05376706272363663, -0.9976774454116821, 0.0418187752366066,
] as const;
/** lens / sensor width (26 mm on a 36 mm sensor, horizontal fit). */
const K = 26 / 36;
/** The render is 1920×1080. */
const ASPECT = 1080 / 1920;

const MAX_RIPPLES = 24;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uBase;
uniform sampler2D uAux;
uniform sampler2D uLamp;
uniform float uTime;
uniform float uAmp;      // 0..1 fade-in of all motion
uniform float uFlicker;  // lantern brightness, 1 = as rendered
uniform vec3 uCamPos;
uniform mat3 uRot;
uniform float uK;
uniform float uAspect;
uniform vec4 uRip[${MAX_RIPPLES}];   // xy: centre in metres, z: birth time, w: slope amplitude
uniform float uRipL[${MAX_RIPPLES}]; // wavelength in metres

const float TAU = 6.2831853;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

// fade a wave whose phase changes faster than ~1 radian per pixel: it would only shimmer
float lod(vec2 kv, vec2 dpx, vec2 dpy) {
  float f = max(abs(dot(kv, dpx)), abs(dot(kv, dpy)));
  return 1.0 - smoothstep(0.6, 1.6, f);
}

// one train of waves: wavelength (m), heading (rad), slope amplitude, gusty (0/1)
vec2 train(vec2 p, float t, float lambda, float heading, float slope, vec2 dpx, vec2 dpy) {
  float k = TAU / lambda;
  vec2 dir = vec2(cos(heading), sin(heading));
  vec2 kv = dir * k;
  float w = sqrt(9.81 * k + 0.0000728 * k * k * k);   // capillary-gravity dispersion
  float ph = dot(kv, p) - w * t;
  return dir * (slope * cos(ph) * lod(kv, dpx, dpy));
}

void main() {
  vec2 uv = vUv;
  // the camera ray of this pixel, and where it meets the lake (z = 0), in metres
  vec3 d = normalize(uRot * vec3(uv.x - 0.5, (uv.y - 0.5) * uAspect, -uK));
  float t = -uCamPos.z / min(d.z, -1e-5);
  vec3 p = uCamPos + t * d;
  vec2 dpx = dFdx(p.xy), dpy = dFdy(p.xy);
  vec2 duvx = dFdx(uv), duvy = dFdy(uv);

  vec3 base = textureGrad(uBase, uv, duvx, duvy).rgb;
  vec4 aux = texture(uAux, uv);
  float water = aux.r;
  vec3 col = base;

  if (water > 0.003 && d.z < -1e-4) {
    float T = uTime;
    // breeze: patches of catspaw ripples drifting across a glassy lake
    vec2 q = p.xy * vec2(0.045, 0.06) + vec2(-T * 0.035, T * 0.012);
    float gust = smoothstep(0.28, 0.85, vnoise(q) * 0.65 + vnoise(q * 2.3 + 7.1) * 0.35);
    float g2 = 0.25 + 1.1 * gust;

    vec2 g = vec2(0.0), gr = vec2(0.0);
    // long, slow undulation everywhere: what makes the reflections sway
    g += train(p.xy, T, 5.2, 1.45, 0.0011, dpx, dpy);
    g += train(p.xy, T, 3.1, 1.95, 0.0009, dpx, dpy);
    g += train(p.xy, T, 1.7, 0.55, 0.0008, dpx, dpy);
    // finer ripples, stronger where the breeze touches
    g += train(p.xy, T, 0.82, 0.15, 0.0009 * g2, dpx, dpy);
    g += train(p.xy, T, 0.47, -0.35, 0.0009 * g2, dpx, dpy);
    g += train(p.xy, T, 0.29, 0.40, 0.0008 * g2, dpx, dpy);
    g += train(p.xy, T, 0.17, -0.10, 0.0007 * g2, dpx, dpy);
    g += train(p.xy, T, 0.105, 0.75, 0.0006 * g2, dpx, dpy);
    g *= uAmp;

    // rings from the pointer: a packet of waves running outward, dying as it spreads
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRip[i];
      if (r.w <= 0.0) continue;
      float age = T - r.z;
      if (age < 0.0 || age > 4.5) continue;
      float lam = uRipL[i];
      float k = TAU / lam;
      vec2 off = p.xy - r.xy;
      float dist = length(off);
      float front = lam * 1.15 * age + lam * 0.15;
      float x = dist - front;
      float width = lam * (0.75 + age * 0.3);
      float env = exp(-(x * x) / (width * width)) * exp(-age * 0.85) * inversesqrt(1.0 + dist / lam);
      vec2 dir = off / max(dist, 1e-4);
      float f = lod(dir * k, dpx, dpy);
      gr += dir * (r.w * env * cos(k * x) * f);
    }
    gr *= uAmp;

    // a tilted mirror: reflect the camera ray off the tilted surface, then find
    // the pixel whose flat reflection looks the same way (far-field)
    vec3 n = normalize(vec3(-(g + gr), 1.0));
    vec3 rr = reflect(d, n);
    vec3 c = transpose(uRot) * vec3(rr.xy, -rr.z);
    vec2 uv2 = vec2(0.5 + (c.x / -c.z) * uK, 0.5 + (c.y / -c.z) * uK / uAspect);
    uv2 = clamp(uv2, vec2(0.0), vec2(1.0));
    float onWater = texture(uAux, uv2).r;
    vec3 moved = textureGrad(uBase, uv2, duvx, duvy).rgb;
    // the slope also catches a little more or less of the bright sky low on the horizon
    // (rings get more of it: a ring is read by its bright and dark crests, not by what it bends)
    float catchLight = 1.0 + clamp(-g.y * 9.0, -0.05, 0.05) + clamp(-gr.y * 6.0, -0.12, 0.12);
    float wet = smoothstep(0.35, 0.95, water);   // the boat's and snags' soft edges stay put
    col = mix(base, moved * catchLight, wet * onWater);
  }

  // the lantern: everything it lights breathes with the flame
  col += (uFlicker - 1.0) * texture(uLamp, uv).rgb * 1.35;

  // the near mist bands drift, very slightly
  float mist = aux.g;
  if (mist > 0.003) {
    float m = vnoise(vec2(uv.x * 7.0 - uTime * 0.018, uv.y * 55.0 + uTime * 0.004)) * 0.6
            + vnoise(vec2(uv.x * 17.0 - uTime * 0.03, uv.y * 120.0)) * 0.4;
    col *= 1.0 + mist * (m - 0.5) * 0.09 * uAmp;
  }

  outColor = vec4(col, 1.0);
}`;

export type LakeOptions = {
  canvas: HTMLCanvasElement;
  /** The page's own <img> of the key art: it becomes the base texture. */
  image: HTMLImageElement;
  auxUrl: string;
  lampUrl: string;
};

export type Lake = {
  /** Pointer position in the canvas's own box, 0..1 from the top-left, or null when it leaves. */
  pointer(x: number | null, y: number): void;
  setRunning(on: boolean): void;
  /** Draw one frame at a given motion time; for tests and recordings. */
  renderAt(seconds: number): void;
  destroy(): void;
};

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`lake: could not load ${url}`));
    im.src = url;
  });
}

async function ready(img: HTMLImageElement) {
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => reject(new Error("lake: base image failed")), { once: true });
    });
  }
  if (img.decode) await img.decode().catch(() => undefined);
}

/** Camera ray of a point in the picture (u, v from the bottom-left) and where it meets the lake. */
export function lakePoint(u: number, v: number): { x: number; y: number; dist: number } | null {
  const cx = u - 0.5, cy = (v - 0.5) * ASPECT, cz = -K;
  const r = CAM_ROT;
  let dx = r[0] * cx + r[3] * cy + r[6] * cz;
  let dy = r[1] * cx + r[4] * cy + r[7] * cz;
  let dz = r[2] * cx + r[5] * cy + r[8] * cz;
  const len = Math.hypot(dx, dy, dz);
  dx /= len; dy /= len; dz /= len;
  if (dz > -1e-4) return null;
  const t = -CAM_POS[2] / dz;
  return { x: CAM_POS[0] + t * dx, y: CAM_POS[1] + t * dy, dist: t };
}

/** Screen position (u, v from the bottom-left) of a world point: checks this camera against Blender's own projection. */
export function project(x: number, y: number, z: number): [number, number] {
  const px = x - CAM_POS[0], py = y - CAM_POS[1], pz = z - CAM_POS[2];
  const r = CAM_ROT;
  // camera = R^T * p (columns of R are the camera axes)
  const cx = r[0] * px + r[1] * py + r[2] * pz;
  const cy = r[3] * px + r[4] * py + r[5] * pz;
  const cz = r[6] * px + r[7] * py + r[8] * pz;
  return [0.5 + (cx / -cz) * K, 0.5 + ((cy / -cz) * K) / ASPECT];
}

export async function createLake({ canvas, image, auxUrl, lampUrl }: LakeOptions): Promise<Lake | null> {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return null;

  const [aux, lamp] = await Promise.all([load(auxUrl), load(lampUrl), ready(image)]);

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`lake shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`lake program: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const tex = (unit: number, src: TexImageSource, mip: boolean) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    return t;
  };
  const textures = [tex(0, image, true), tex(1, aux, false), tex(2, lamp, false)];

  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("uBase"), 0);
  gl.uniform1i(u("uAux"), 1);
  gl.uniform1i(u("uLamp"), 2);
  gl.uniform3f(u("uCamPos"), CAM_POS[0], CAM_POS[1], CAM_POS[2]);
  gl.uniformMatrix3fv(u("uRot"), false, new Float32Array(CAM_ROT));
  gl.uniform1f(u("uK"), K);
  gl.uniform1f(u("uAspect"), ASPECT);
  const uTime = u("uTime"), uAmp = u("uAmp"), uFlicker = u("uFlicker"), uRip = u("uRip"), uRipL = u("uRipL");

  // the water mask on the CPU too, so the pointer only stirs the lake (not the sky or the boat)
  const mask = (() => {
    const c = document.createElement("canvas");
    c.width = aux.naturalWidth; c.height = aux.naturalHeight;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return null;
    x.drawImage(aux, 0, 0);
    return { w: c.width, h: c.height, data: x.getImageData(0, 0, c.width, c.height).data };
  })();
  const isWater = (u0: number, vTop: number) => {
    if (!mask) return true;
    const px = Math.min(mask.w - 1, Math.max(0, Math.floor(u0 * mask.w)));
    const py = Math.min(mask.h - 1, Math.max(0, Math.floor(vTop * mask.h)));
    return mask.data[(py * mask.w + px) * 4] > 160;
  };

  const rip = new Float32Array(MAX_RIPPLES * 4);
  const ripL = new Float32Array(MAX_RIPPLES).fill(1);
  let ripNext = 0;
  const spawn = (x: number, y: number, dist: number, strength: number, now: number) => {
    const i = ripNext;
    ripNext = (ripNext + 1) % MAX_RIPPLES;
    rip.set([x, y, now, strength], i * 4);
    ripL[i] = Math.min(1.6, Math.max(0.09, 0.042 * dist));
  };

  let running = false;
  let frame = 0;
  /** Seconds of motion so far. It only advances while the lake is on screen, so the
   *  shader's phases stay small and precise however long the page stays open. */
  let clock = 0;
  let last = 0;
  let flick = 1, flickTarget = 1, flickAt = 0;
  let lastSpawn: { x: number; y: number; at: number } | null = null;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!running) draw(0);
  };

  const draw = (dt: number) => {
    // lantern: a small flame in still air — mostly steady, now and then a gutter
    if (clock >= flickAt) {
      const dip = Math.random() < 0.05;
      flickTarget = dip ? 0.78 + Math.random() * 0.08 : 1 + (Math.random() - 0.5) * 0.11;
      flickAt = clock + (dip ? 0.09 : 0.07 + Math.random() * 0.11);
    }
    flick += (flickTarget - flick) * (1 - Math.exp(-dt * (flickTarget < flick ? 22 : 12)));
    // motion fades in over the first second and a half, so the picture never jumps
    const amp = Math.min(1, clock / 1.6);
    const ease = amp * amp * (3 - 2 * amp);
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uAmp, ease);
    gl.uniform1f(uFlicker, 1 + (flick - 1) * ease);
    gl.uniform4fv(uRip, rip);
    gl.uniform1fv(uRipL, ripL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    clock += dt;
    draw(dt);
    frame = running ? requestAnimationFrame(loop) : 0;
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    pointer(x, y) {
      if (x === null) {
        lastSpawn = null;
        return;
      }
      if (!isWater(x, y)) {
        lastSpawn = null;
        return;
      }
      const hit = lakePoint(x, 1 - y);
      if (!hit) return;
      const now = clock;
      if (!lastSpawn) {
        spawn(hit.x, hit.y, hit.dist, 0.02, now);
        lastSpawn = { x: hit.x, y: hit.y, at: now };
        return;
      }
      const lam = Math.min(1.6, Math.max(0.09, 0.042 * hit.dist));
      const moved = Math.hypot(hit.x - lastSpawn.x, hit.y - lastSpawn.y);
      const dtS = now - lastSpawn.at;
      if (moved > lam * 0.9 || (dtS > 0.2 && moved > lam * 0.1)) {
        const speed = moved / Math.max(dtS, 0.016) / lam; // wavelengths per second
        spawn(hit.x, hit.y, hit.dist, Math.min(0.026, 0.012 + speed * 0.001), now);
        lastSpawn = { x: hit.x, y: hit.y, at: now };
      }
    },
    renderAt(seconds) {
      const dt = Math.max(0, Math.min(0.05, seconds - clock));
      clock = seconds;
      draw(dt);
    },
    setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) {
        last = 0;
        frame = requestAnimationFrame(loop);
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    destroy() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      for (const t of textures) gl.deleteTexture(t);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
