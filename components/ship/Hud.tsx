"use client";

/**
 * The ship computer — and the site's primary navigation.
 *
 * This is the onboarding. There is no modal, no tour and no coach mark: a
 * persistent panel listing every compartment with the current one marked is a
 * menu, and a menu does not need explaining. If the interface needed a
 * tutorial, the interface would be the problem.
 *
 * Built on `<details>`/`<summary>` rather than a JavaScript disclosure. Native
 * disclosure is keyboard-operable and screen-reader-announced for free, and —
 * the part that matters — it is server-rendered `open`, so with JavaScript off
 * every compartment is visible and every link works. The only thing JS does is
 * collapse it on narrow screens, where an expanded five-row panel covered the
 * room and the copy card together.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ROOMS, DEFAULT_ROOM, preloadRoom } from "@/lib/ship/rooms";

export default function Hud() {
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean)[1] ?? DEFAULT_ROOM;
  const room = ROOMS.find((r) => r.slug === current);
  const ref = useRef<HTMLDetailsElement>(null);

  // Collapse on narrow viewports only, and only once — reopening it on every
  // resize would fight a visitor who deliberately opened it.
  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches && ref.current) {
      ref.current.open = false;
    }
  }, []);

  // Adjacency preloading: warm the rooms either side of this one. With five
  // compartments this is nearly academic — the discipline exists so that room
  // nine does not require an architecture change.
  useEffect(() => {
    const i = ROOMS.findIndex((r) => r.slug === current);
    for (const n of [i - 1, i + 1]) {
      const adjacent = ROOMS[n];
      if (adjacent && adjacent.status === "open") preloadRoom(adjacent.slug);
    }
  }, [current]);

  return (
    <details className="hud" ref={ref} open>
      <summary className="hud-title">
        <span className="hud-title-mark" aria-hidden="true" />
        <span className="hud-title-text">Ship computer</span>
        <span className="hud-title-current">{room?.designation ?? ""}</span>
      </summary>

      <nav aria-label="Ship compartments">
        <ol className="hud-list">
          {ROOMS.map((r) => {
            const active = r.slug === current;
            if (r.status === "sealed") {
              return (
                <li key={r.slug} className="hud-item is-sealed">
                  <span className="hud-designation">{r.designation}</span>
                  <span className="hud-status">
                    Sealed
                    {r.opens ? (
                      <span className="hud-opens"> · opens {r.opens}</span>
                    ) : null}
                  </span>
                </li>
              );
            }
            return (
              <li key={r.slug} className="hud-item">
                <Link
                  href={`/ship/${r.slug}`}
                  className="hud-link"
                  aria-current={active ? "page" : undefined}
                >
                  <span className="hud-designation">{r.designation}</span>
                  <span className="hud-status">
                    {active ? "You are here" : "Open"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </details>
  );
}
