/**
 * One renderer, one scene, one loop, for the whole ship.
 *
 * The architecture in one sentence: a persistent canvas above the router, with
 * the route driving which room module is mounted. Never a canvas per route —
 * browsers cap live WebGL contexts and recreating the renderer on navigation
 * leaks them, and the failure presents as "context lost" several rooms in,
 * after the build looks finished.
 *
 * `WebGPURenderer` unconditionally. It uses the WebGPU backend where available
 * and falls back to a WebGL2 backend automatically, so it is not a WebGPU-only
 * choice — it *is* the WebGL2 path. Nothing below branches on backend.
 */
import {
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGPURenderer,
  NeutralToneMapping,
} from "three/webgpu";
import type { FrameState, RoomModule } from "./types";
import type { QualityTier } from "./quality";
import type { Tier } from "./capability";

export type MemorySnapshot = {
  geometries: number;
  textures: number;
  programs: number;
};

export type SceneManagerOptions = {
  canvas: HTMLCanvasElement;
  tier: Tier;
  quality: QualityTier;
  /** Held at 0 until the shell says the room may resolve. */
  reducedMotion: boolean;
};

export class SceneManager {
  readonly renderer: WebGPURenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;

  private quality: QualityTier;
  private room: RoomModule | null = null;
  private roomName = "";
  private running = false;
  private disposed = false;

  private last = 0;
  private elapsed = 0;
  private boot = 0;
  private bootDuration = 2.4;

  private pointer = { x: 0, y: 0 };
  private pointerTarget = { x: 0, y: 0 };
  private reducedMotion: boolean;

  /** Memory counts with no room mounted. The disposal gate's reference. */
  private baseline: MemorySnapshot | null = null;

  private readonly onPointerMove = (e: PointerEvent) => {
    if (this.reducedMotion) return;
    this.pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointerTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  private readonly onResize = () => this.resize();

  private readonly onVisibility = () => {
    // A backgrounded tab should not accumulate elapsed time, or the first frame
    // back hands the room a delta measured in minutes.
    if (document.visibilityState === "visible") this.last = performance.now();
  };

  constructor(opts: SceneManagerOptions) {
    this.quality = opts.quality;
    this.reducedMotion = opts.reducedMotion;

    this.renderer = new WebGPURenderer({
      canvas: opts.canvas,
      antialias: true,
      // The `?gl=webgl2` override lands here. Forcing this backend has to be
      // routine rather than a pre-launch check: compute shaders and storage
      // buffers silently do nothing on it, and this machine will never surface
      // that path by accident.
      forceWebGL: opts.tier === "webgl2",
      alpha: false,
      powerPreference: "high-performance",
    });

    // Neutral rather than ACES. ACES pulls saturated highlights toward orange,
    // and this room's entire palette premise is that nothing in it is warm —
    // a blown white LED strip tinting amber is the exact failure being avoided.
    this.renderer.toneMapping = NeutralToneMapping;
    // The reference bridge is a bright white room. At 1.05 the #E9EBEE panels
    // were landing as mid grey and the whole space read dim and murky, which is
    // the opposite of the direction — professional and spacious, not gritty.
    this.renderer.toneMappingExposure = 1.22;

    this.camera = new PerspectiveCamera(55, 1, 0.1, 300);
  }

  async init(): Promise<void> {
    await this.renderer.init();
    this.resize();
    this.baseline = this.memory();

    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: true,
    });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** Which backend actually resolved. Reported by the capture harness. */
  backendName(): string {
    const b = this.renderer.backend as unknown as {
      isWebGPUBackend?: boolean;
      isWebGLBackend?: boolean;
    };
    if (b?.isWebGPUBackend) return "webgpu";
    if (b?.isWebGLBackend) return "webgl2";
    return "unknown";
  }

  memory(): MemorySnapshot {
    const m = this.renderer.info.memory;
    return {
      geometries: m.geometries,
      textures: m.textures,
      programs: m.programs,
    };
  }

  mount(name: string, room: RoomModule): void {
    if (this.room) this.unmount();
    this.room = room;
    this.roomName = name;
    this.scene.add(room.group);

    this.camera.fov = room.camera.fov;
    this.camera.position.set(...room.camera.position);
    this.camera.lookAt(new Vector3(...room.camera.target));
    this.camera.updateProjectionMatrix();

    this.elapsed = 0;
    this.boot = this.reducedMotion ? 1 : 0;
  }

  /**
   * Tear the current room down and prove it.
   *
   * `scene.clear()` removes objects from the graph and frees nothing on the
   * GPU. The room's own `dispose()` walks its geometries and materials; this
   * checks the result against the baseline rather than trusting it. A leak
   * caught by an assertion costs minutes, one caught by a visitor costs the
   * build — which is why the numbers are returned rather than logged and
   * forgotten.
   */
  unmount(): { leaked: boolean; before: MemorySnapshot; after: MemorySnapshot } {
    const before = this.memory();
    if (this.room) {
      this.scene.remove(this.room.group);
      this.room.dispose();
      this.room = null;
      this.roomName = "";
    }
    const after = this.memory();
    const base = this.baseline ?? after;
    const leaked =
      after.geometries > base.geometries || after.textures > base.textures;
    return { leaked, before, after };
  }

  currentRoom(): string {
    return this.roomName;
  }

  setQuality(q: QualityTier): void {
    this.quality = q;
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    void this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    void this.renderer.setAnimationLoop(null);
  }

  private readonly frame = (now: number) => {
    // Clamp so an alt-tab does not hand a room a two-second step.
    const delta = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.elapsed += delta;

    if (this.boot < 1) {
      this.boot = Math.min(this.boot + delta / this.bootDuration, 1);
    }

    // Ease the pointer rather than reading it raw, so a fast sweep drifts the
    // camera instead of whipping it.
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.06;

    const state: FrameState = {
      elapsed: this.elapsed,
      delta,
      pointer: this.reducedMotion ? { x: 0, y: 0 } : this.pointer,
      // A long-tail ease-out on the boot ramp, matching the site's one curve
      // closely enough that the reveal and the DOM entrances read as the same
      // hand.
      boot: 1 - Math.pow(1 - this.boot, 3),
      aspect: this.camera.aspect,
      quality: this.quality,
    };

    this.room?.update(state);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.unmount();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
    // Only here. Disposing the renderer on a room change would throw away the
    // context the whole architecture exists to keep.
    this.renderer.dispose();
  }
}
