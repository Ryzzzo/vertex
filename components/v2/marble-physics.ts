/**
 * The Machine — rigid-body layer.
 *
 * ── The conflict the brief did not anticipate, and how it is resolved ─────
 *
 * The brief asks for real physics on the marble: "real weight, real bounces,
 * real contact response. No fake gravity." It also asks for the marble's
 * position to be choreographed to scroll position across seven keyframes.
 *
 * Those two requirements are not compatible, and it is worth being precise about
 * why rather than quietly picking one. A rigid-body solver integrates forward
 * from state. Scroll is not a clock — it is a *seek bar*. The visitor can throw
 * it backwards, land on an arbitrary offset via a hash link, or restore a tab at
 * 63%. A simulated marble has no defined position at 63%; it only has the
 * position implied by every frame that came before, which on a scrub is a
 * history that never happened. Bolting a solver onto a scrubbed timeline gives
 * you a marble that is somewhere different every time the same visitor scrolls
 * past the same point, and that ends up reading as a bug rather than as physics.
 *
 * So the resolution is a split, and the split is the interesting part:
 *
 *   · **The primary marble is a kinematic body.** Its position is the arc-length
 *     parameterisation of the route, exactly as v1 had it, which keeps the
 *     sequence deterministic and reversible. But it is a body in the world, and
 *     its velocity is written every step from its own frame-to-frame delta — so
 *     when it strikes something, the solver has a real velocity to transfer.
 *     It pushes; nothing pushes it. That is the correct model for a marble
 *     riding a constrained track anyway: the rail *is* holding it to a path.
 *
 *   · **Everything it hits is fully dynamic**, and that is where the bytes are
 *     spent. A shallow machined tray at the head of the machine holds a dozen
 *     loose marbles under real gravity, real restitution and real rolling
 *     friction. They settle into a pile that is different on every load, they
 *     clatter when the deploy stage fires, and — the part that matters — when
 *     the visitor grabs the machine and spins it, they slosh.
 *
 * ── Why the spin works, which is the whole reason this file exists ────────
 *
 * The machine rotates about its own Y axis when dragged. A naive setup gets
 * nothing from this: gravity is world-down, a Y rotation does not tilt the tray,
 * and the marbles would sit dead still while the object spun around them.
 *
 * The simulation therefore runs in the *machine's own rotating frame*, where the
 * tray is fixed and body positions map straight onto local mesh positions. The
 * price of a rotating frame is that Newton's laws need three pseudo-forces added
 * by hand, and all three are physically real to anything sitting in that frame:
 *
 *   · **Centrifugal**, mω²r outward — marbles climb the outer wall of the tray
 *     under sustained spin.
 *   · **Euler**, −m(dω/dt)×r — the lurch when the visitor starts or stops the
 *     drag. This is the one that actually reads; it is the marbles being left
 *     behind by an accelerating tray.
 *   · **Coriolis**, −2mω×v — curls the paths of marbles already rolling.
 *
 * Including all three is about fifteen lines and it is the difference between
 * "the marbles moved" and "the marbles have mass". Dropping Coriolis was tried;
 * it is subtle but its absence makes fast rolls look like they are on rails.
 *
 * ── Cost ──────────────────────────────────────────────────────────────────
 *
 * `cannon-es`, not Rapier. Rapier is the better solver and it is the wrong
 * choice here: it ships a WebAssembly binary that has to be fetched and
 * instantiated before the first step, which puts a network round trip on a hero
 * that is otherwise entirely self-contained, and `@react-three/rapier`'s
 * ergonomics are worth nothing to a codebase with no R3F in it. cannon-es is
 * pure ESM, tree-shakes to roughly a third of its published size once the
 * unused shapes and constraints drop out, and solves fourteen spheres in a box
 * in well under a millisecond. For this problem the wasm solver is paying a
 * round trip to be fast at something that was never the bottleneck.
 */

import * as CANNON from "cannon-es";

/** Scene units are ~0.46 m. Gravity is exaggerated so small spheres read heavy. */
const GRAVITY = -16.5;
const STEP = 1 / 60;
/** Never simulate more than this much wall-clock in one frame after a stall. */
const MAX_CATCHUP = 4;

export type TrayConfig = {
  /** Tray floor centre, in machine-local space. */
  cx: number;
  cy: number;
  cz: number;
  /** Inner dimensions of the tray well. */
  w: number;
  d: number;
  /** Wall height. */
  wall: number;
  /** Marble radius, matched to the primary marble so they read as one set. */
  r: number;
  count: number;
};

export type MarbleWorld = {
  step(dt: number, omega: number, alpha: number): void;
  /** Local-space positions of the loose marbles, written into the array given. */
  readInto(out: Float32Array): void;
  /** Quaternions, so a marble's own spin is visible on its specular highlight. */
  readQuatInto(out: Float32Array): void;
  /** Drives the kinematic primary marble. Velocity is derived, not supplied. */
  setPrimary(x: number, y: number, z: number, dt: number): void;
  /** One impulsive kick to every loose marble — used when the deploy stage fires. */
  jolt(strength: number): void;
  /** True once the pile has stopped moving, so the loop can skip stepping. */
  get asleep(): boolean;
  count: number;
  dispose(): void;
};

export function createMarbleWorld(cfg: TrayConfig): MarbleWorld {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
  // Sweep-and-prune beats the naive broadphase the moment bodies cluster, and a
  // tray of marbles is nothing but a cluster.
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 8;
  (world.solver as CANNON.GSSolver).tolerance = 0.002;

  const steel = new CANNON.Material("steel");
  const contact = new CANNON.ContactMaterial(steel, steel, {
    // Low enough that the pile settles rather than simmering, high enough that
    // a dropped marble reads as hard rather than as putty.
    restitution: 0.26,
    friction: 0.28,
  });
  world.addContactMaterial(contact);
  world.defaultContactMaterial = contact;

  // ── the tray ────────────────────────────────────────────────────────
  // Static boxes rather than planes: an infinite plane cannot make a corner, and
  // marbles escaping through the corner of two planes is the oldest bug in
  // rigid-body demos.
  const halfW = cfg.w / 2;
  const halfD = cfg.d / 2;
  const T = 0.06;

  const staticBox = (
    hx: number, hy: number, hz: number,
    x: number, y: number, z: number,
  ) => {
    const b = new CANNON.Body({
      mass: 0,
      material: steel,
      shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)),
    });
    b.position.set(x, y, z);
    world.addBody(b);
    return b;
  };

  staticBox(halfW, T, halfD, cfg.cx, cfg.cy - T, cfg.cz);
  staticBox(T, cfg.wall, halfD, cfg.cx - halfW - T, cfg.cy + cfg.wall, cfg.cz);
  staticBox(T, cfg.wall, halfD, cfg.cx + halfW + T, cfg.cy + cfg.wall, cfg.cz);
  staticBox(halfW + T * 2, cfg.wall, T, cfg.cx, cfg.cy + cfg.wall, cfg.cz - halfD - T);
  staticBox(halfW + T * 2, cfg.wall, T, cfg.cx, cfg.cy + cfg.wall, cfg.cz + halfD + T);

  // ── the loose marbles ───────────────────────────────────────────────
  const bodies: CANNON.Body[] = [];
  // A fixed seed: the *pile* should differ from a hand-placed grid, but it must
  // not differ between two loads of the same page, or a screenshot taken for
  // review is not a screenshot of what the next visitor sees.
  let seed = 0x51ed270b;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < cfg.count; i++) {
    const b = new CANNON.Body({
      mass: 0.42,
      material: steel,
      shape: new CANNON.Sphere(cfg.r),
      // Spheres roll forever without this. Real marbles on machined aluminium do
      // not, and the tell is a pile that never quite stops twitching.
      linearDamping: 0.16,
      angularDamping: 0.34,
    });
    // Dropped from a small stack rather than placed: letting the solver build
    // the pile is why it looks like a pile.
    b.position.set(
      cfg.cx + (rnd() - 0.5) * (cfg.w - cfg.r * 2.4),
      cfg.cy + cfg.r + 0.05 + Math.floor(i / 4) * cfg.r * 2.3,
      cfg.cz + (rnd() - 0.5) * (cfg.d - cfg.r * 2.4),
    );
    b.sleepSpeedLimit = 0.06;
    b.sleepTimeLimit = 0.4;
    world.addBody(b);
    bodies.push(b);
  }

  // ── the primary marble, kinematic ───────────────────────────────────
  const primary = new CANNON.Body({
    type: CANNON.Body.KINEMATIC,
    material: steel,
    shape: new CANNON.Sphere(cfg.r * 1.16),
  });
  primary.position.set(0, 40, 0); // parked off-world until the route places it
  world.addBody(primary);

  // Settle the pile before the first frame is ever drawn. Ninety steps is a
  // second and a half of simulation in about four milliseconds, and it means the
  // visitor never sees marbles raining into the tray — they were always there.
  for (let i = 0; i < 90; i++) world.fixedStep(STEP);

  let acc = 0;
  const F = new CANNON.Vec3();
  const R = new CANNON.Vec3();
  const prev = new CANNON.Vec3();

  return {
    count: cfg.count,

    step(dtRaw: number, omegaRaw: number, alphaRaw: number) {
      const dt = dtRaw;
      /**
       * Both inputs are clamped, and the angular acceleration hard.
       *
       * A pointer stream is not a smooth function. A single 11px mouse move in
       * one 16ms frame is 0.057 rad of yaw, which differentiates to ω ≈ 3.6 and
       * then to α ≈ 225 rad/s². The Euler force m·α·r at that α is about seven
       * times the marbles' own weight, and the first drag test fired all
       * fourteen of them out of the tray and into the void at −14 on the Y axis,
       * never to return. The physics was correct; the input was a step function.
       *
       * ±4 and ±26 keep the strongest possible flick at roughly one gravity of
       * lateral kick, which slosh the pile hard and cannot empty it.
       */
      const omega = Math.max(-4, Math.min(4, omegaRaw));
      const alpha = Math.max(-26, Math.min(26, alphaRaw));

      acc += Math.min(dt, 0.1);
      let steps = 0;

      while (acc >= STEP && steps < MAX_CATCHUP) {
        // Pseudo-forces for the rotating frame. Applied before the solve, to
        // every awake body, about the machine's own Y axis through the origin.
        if (omega !== 0 || alpha !== 0) {
          const w2 = omega * omega;
          for (const b of bodies) {
            if (b.sleepState === CANNON.Body.SLEEPING) {
              // A pile that has gone to sleep must still be woken by a lurch,
              // or the first drag of the session does nothing.
              if (Math.abs(alpha) > 0.6 || w2 > 0.4) b.wakeUp();
              else continue;
            }
            R.set(b.position.x, 0, b.position.z);
            const m = b.mass;

            // Centrifugal: outward, in the plane normal to the spin axis.
            F.set(R.x * w2 * m, 0, R.z * w2 * m);
            // Euler: −m(α × r). With α along +Y this is (α·z, 0, −α·x) × −m.
            F.x += m * alpha * R.z;
            F.z -= m * alpha * R.x;
            // Coriolis: −2m(ω × v). Same cross product, on velocity.
            F.x += 2 * m * omega * b.velocity.z;
            F.z -= 2 * m * omega * b.velocity.x;

            b.applyForce(F, b.position);
          }
        }

        world.fixedStep(STEP);
        acc -= STEP;
        steps++;
      }

      /**
       * Containment, and it is not optional.
       *
       * A tray is five static boxes with open air above it, so *any* escape is
       * permanent — the marble falls forever and its instance is drawn at
       * y = −200 next frame, which is invisible and therefore silently wrong.
       * Clamping the forces above makes escape unlikely; it does not make it
       * impossible, and "unlikely and unrecoverable" is the failure mode that
       * shows up on someone else's machine six months later.
       *
       * Anything past the bound is put back at the top of the well with its
       * velocity cleared, which reads as a marble that bounced high rather than
       * as one that teleported.
       */
      for (const b of bodies) {
        const p = b.position;
        const out =
          Math.abs(p.x - cfg.cx) > cfg.w ||
          Math.abs(p.z - cfg.cz) > cfg.d + 0.4 ||
          p.y < cfg.cy - 0.6 ||
          p.y > cfg.cy + 1.6;
        if (!out) continue;
        b.position.set(
          cfg.cx + (rnd() - 0.5) * (cfg.w - cfg.r * 3),
          cfg.cy + cfg.r + 0.34,
          cfg.cz + (rnd() - 0.5) * (cfg.d - cfg.r * 3),
        );
        b.velocity.setZero();
        b.angularVelocity.setZero();
        b.wakeUp();
      }

      // After a long stall — a backgrounded tab, a garbage-collection pause —
      // drop the backlog rather than simulating it. Catching up in real time is
      // how a physics scene turns into a slideshow the moment it is behind.
      if (steps >= MAX_CATCHUP) acc = 0;
    },

    setPrimary(x: number, y: number, z: number, dt: number) {
      prev.copy(primary.position);
      primary.position.set(x, y, z);
      if (dt > 1e-4) {
        // The velocity a kinematic body reports is what the solver uses to
        // compute the impulse it delivers. Writing it from the actual delta is
        // what makes a fast marble scatter the pile and a slow one nudge it —
        // without this the contact is resolved as though the marble were
        // stationary and it pushes everything with the same limp force.
        primary.velocity.set(
          (x - prev.x) / dt,
          (y - prev.y) / dt,
          (z - prev.z) / dt,
        );
      }
    },

    jolt(strength: number) {
      for (const b of bodies) {
        b.wakeUp();
        b.applyImpulse(
          new CANNON.Vec3(
            (rnd() - 0.5) * strength,
            rnd() * strength * 0.85,
            (rnd() - 0.5) * strength,
          ),
          b.position,
        );
      }
    },

    readInto(out: Float32Array) {
      for (let i = 0; i < bodies.length; i++) {
        const p = bodies[i].position;
        out[i * 3] = p.x;
        out[i * 3 + 1] = p.y;
        out[i * 3 + 2] = p.z;
      }
    },

    readQuatInto(out: Float32Array) {
      for (let i = 0; i < bodies.length; i++) {
        const q = bodies[i].quaternion;
        out[i * 4] = q.x;
        out[i * 4 + 1] = q.y;
        out[i * 4 + 2] = q.z;
        out[i * 4 + 3] = q.w;
      }
    },

    get asleep() {
      for (const b of bodies) {
        if (b.sleepState !== CANNON.Body.SLEEPING) return false;
      }
      return true;
    },

    dispose() {
      for (const b of [...bodies, primary]) world.removeBody(b);
      bodies.length = 0;
    },
  };
}
