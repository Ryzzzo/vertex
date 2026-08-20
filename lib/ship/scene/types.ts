/**
 * The contract every compartment implements.
 *
 * A room is a group, an update closure and a dispose closure. That is the whole
 * abstraction, and it is the reason this build does not carry React Three
 * Fiber: what R3F sells at room scale is reconciler-managed lifecycle, and
 * procedurally generated geometry arrives as an opaque `Group` that its
 * reconciler does not manage or dispose anyway. Fifteen lines and zero
 * kilobytes buys the same thing here.
 *
 * `dispose()` is not optional and it is not best-effort. `SceneManager` asserts
 * that `renderer.info.memory` returns to baseline after every unmount, because
 * a leak caught by an assertion costs minutes and one caught by a visitor costs
 * the build.
 */
import type {
  DirectionalLight,
  Group,
  PerspectiveCamera,
} from "three/webgpu";
import type { QualityTier } from "./quality";
import type { Atmosphere } from "./atmosphere";

/** Per-frame state handed to every room. Read-only from the room's side. */
export type FrameState = {
  /** Seconds since the room mounted. Resets on room change. */
  elapsed: number;
  /** Seconds since the previous frame, clamped so a backgrounded tab cannot
   *  hand the room a two-second step. */
  delta: number;
  /** Pointer in normalised device coords, -1..1, eased. Zero until first move,
   *  and frozen at zero under reduced motion. */
  pointer: { x: number; y: number };
  /** 0 → 1 across the arrival choreography. Rooms use it to stage reveals. */
  boot: number;
  /**
   * Viewport aspect. Rooms recompose for portrait themselves rather than the
   * manager doing it for them — a room knows what it wants in frame and the
   * manager does not. On a phone the bridge raises its target so the viewport
   * clears the copy card instead of sitting behind it.
   */
  aspect: number;
  quality: QualityTier;
  /**
   * Hand the manager the atmosphere this room wants.
   *
   * The room owns its lighting state; the manager owns fog, exposure and the
   * post chain. Rather than have the manager guess, the room pushes its
   * resolved atmosphere once per frame and the manager applies the parts that
   * are not its to author. That keeps the dependency one-directional — rooms
   * never reach into the renderer.
   */
  setAtmosphere(atmosphere: Atmosphere): void;
};

export type RoomModule = {
  /** Everything this room adds to the scene. Added and removed as one node. */
  group: Group;
  /** Where the camera rests in this room, and what it looks at. */
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  /**
   * The room's shadow-casting key, if it has one.
   *
   * Handed up so the post chain can raymarch godrays against its shadow map.
   * A room without one simply renders without shafts rather than failing —
   * which is the right default, because not every compartment has a window.
   */
  keyLight?: DirectionalLight;
  update(state: FrameState): void;
  dispose(): void;
};

export type RoomFactory = (opts: {
  seed: number;
  quality: QualityTier;
  camera: PerspectiveCamera;
}) => RoomModule;
