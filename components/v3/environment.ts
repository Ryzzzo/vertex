/**
 * Two procedural environments, authored rather than photographed.
 *
 * The brief asked for Poly Haven HDRIs. v2 ran that test (§7) and the
 * procedural version won, decisively, for a reason that is *stronger* here than
 * it was there: this scene needs two environments and a defensible relationship
 * between them. A loaded EXR is a photograph of a room somebody else stood in —
 * it can be graded but not authored, it puts a request on the critical path, and
 * two of them means two requests and a hero that looks different when a CDN is
 * slow. It also cannot be tuned against *this* palette, which is the entire
 * activity of getting a cinematic scene to read.
 *
 * Cost of the procedural pair: 0 KB of bundle, ~7 ms at init, and every value
 * below is a two-line edit evaluated against the real frame.
 *
 * ── What an environment actually has to do here ───────────────────────────
 *
 * The ship's hull is `metalness: 1`. That means every face is *entirely*
 * reflected environment with no diffuse underneath it, so this file — not the
 * lights — is what decides whether the bridge reads as aluminium or as black
 * plastic. v2 §7 records the specific number: a 0.012 room makes a 0.012
 * machine wherever it is not catching a highlight. The floor value here is
 * 0.026 for the same reason, and it is the first thing to check if the metal
 * ever goes dead.
 */

import * as THREE from "three";
import { COOL, WARM } from "./palette";

export type EnvKind = "ship" | "dune";

/**
 * Builds a PMREM-filtered environment for one act.
 *
 * The source is a tiny scene of emissive cards inside a gradient shell, run
 * through `PMREMGenerator.fromScene()` — exactly the path a loaded `.hdr` takes
 * once it has been decoded, so the result is a real prefiltered mipmap chain
 * and not a cube map pretending to be one.
 */
export function buildEnvironment(
  renderer: THREE.WebGLRenderer,
  kind: EnvKind,
): THREE.Texture {
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];

  const card = (
    w: number,
    h: number,
    colour: THREE.ColorRepresentation,
    intensity: number,
    place: (m: THREE.Mesh) => void,
  ) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colour).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(g, m);
    place(mesh);
    scene.add(mesh);
    disposables.push(g, m);
  };

  /* The shell. A large inverted sphere carrying a vertical gradient — the
     "sky" the whole thing sits in, and the floor value that decides metal. */
  const shellGeo = new THREE.SphereGeometry(12, 24, 16);
  const shellMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uUp: { value: new THREE.Color() },
      uDown: { value: new THREE.Color() },
      uFloor: { value: 0.026 },
    },
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uUp; uniform vec3 uDown; uniform float uFloor;
      varying vec3 vP;
      void main() {
        float t = clamp(normalize(vP).y * 0.5 + 0.5, 0.0, 1.0);
        // Smoothstep rather than linear: a linear sky gradient reflected in a
        // curved metal face reads as a banding artefact, because the surface
        // normal sweeps the gradient non-linearly.
        vec3 c = mix(uDown, uUp, t * t * (3.0 - 2.0 * t));
        gl_FragColor = vec4(c + uFloor, 1.0);
      }`,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  scene.add(shell);
  disposables.push(shellGeo, shellMat);

  if (kind === "ship") {
    /* Cool interior. The sky is the ceiling LED wash; the ground is the deck
       catching it back. Both are dim — this is a dark room, and the object is
       lit by cards, not by ambience. */
    shellMat.uniforms.uUp.value.setStyle(COOL.blue).multiplyScalar(0.055);
    shellMat.uniforms.uDown.value.setStyle(COOL.panel).multiplyScalar(0.13);
    shellMat.uniforms.uFloor.value = 0.026;

    /**
     * Key card. 1.85 units, not 2.3 — v2 §7's more consequential correction. A
     * card wide enough to cover most of the upper hemisphere is not a soft box,
     * it is ambient light, and ambient light on metal flattens every face to
     * the same value. Amplitude went up to keep the energy while concentrating
     * it, because the reference's tonal range is *falloff*.
     */
    card(1.85, 1.85, COOL.chrome, 2.7, (m) => {
      m.position.set(-3.6, 5.2, 2.4);
      m.lookAt(0, 0, 0);
    });
    /* Fill, deliberately ~1/6 of the key. A fill approaching the key erases
       the falloff the key was shrunk to create. */
    card(2.6, 2.0, COOL.blue, 0.42, (m) => {
      m.position.set(4.4, 2.2, 1.2);
      m.lookAt(0, 0, 0);
    });
    /* The viewport itself, as a light. It is the largest emitting surface in
       the room and the reason the chair silhouettes. */
    card(7.5, 3.2, "#9db6e8", 0.34, (m) => {
      m.position.set(0, 2.4, -8.5);
      m.lookAt(0, 1.5, 0);
    });
    /* One amber card, low and behind. This is the second act arriving early —
       the warm accent is in the ship's reflections from the first frame, so
       the palette shift later reads as a place rather than as a restyle. */
    card(2.2, 0.9, COOL.amber, 0.5, (m) => {
      m.position.set(1.6, 0.8, 6.5);
      m.lookAt(0, 1, 0);
    });
  } else {
    /* Warm exterior. Now the sky *is* the dominant light and the ground bounce
       is strong, which is the opposite balance to the ship and most of why the
       two acts feel different before any object is drawn. */
    shellMat.uniforms.uUp.value.setStyle(WARM.sand).multiplyScalar(0.30);
    shellMat.uniforms.uDown.value.setStyle(WARM.ochre).multiplyScalar(0.19);
    shellMat.uniforms.uFloor.value = 0.05;

    /* The sun, small and hot and near the horizon. Small is the point: a low
       sun is a hard source, and hard sources are what make long shadows read. */
    card(0.9, 0.9, WARM.sand, 9.5, (m) => {
      m.position.set(-6.2, 1.5, -7.4);
      m.lookAt(0, 0, 0);
    });
    /* Sky dome bounce opposite the sun. */
    card(9, 4, WARM.ochre, 0.3, (m) => {
      m.position.set(5.5, 4.5, 5.5);
      m.lookAt(0, 0, 0);
    });
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  for (const d of disposables) d.dispose();

  return rt.texture;
}
