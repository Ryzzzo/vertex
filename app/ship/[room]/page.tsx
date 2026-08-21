import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BridgeDrawing from "@/components/ship/BridgeDrawing";
import { ROOMS, getRoom } from "@/lib/ship/registry";

/**
 * One compartment.
 *
 * Statically generated from the registry — no dynamic rendering, so there is no
 * TTFB cost and the page stays bfcache-eligible.
 *
 * The important structural decision is that **the 3D is the frame and the
 * content is DOM.** Everything below is real HTML: a heading, prose, links. The
 * canvas is `aria-hidden`. A screen-reader user gets a well-structured page
 * about a ship's bridge rather than being told to imagine a rendering they
 * cannot see, and a crawler gets the same. That is also the entire SEO story,
 * and it cost nothing extra.
 */

/**
 * The bridge is deliberately absent from this list. It is served by the static segment
 * `app/ship/bridge/page.tsx` — the photoreal render — and generating it here as well
 * would emit two pages for one path. Every other compartment still renders procedurally
 * through the shared canvas.
 */
export function generateStaticParams() {
  return ROOMS.filter((r) => r.slug !== "bridge").map((r) => ({ room: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ room: string }>;
}): Promise<Metadata> {
  const { room: slug } = await params;
  const room = getRoom(slug);
  if (!room) return {};
  return {
    title: room.designation.replace(/^\d+\s·\s/, ""),
    description: `${room.title} ${room.blurb}`,
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();

  const isBridge = room.slug === "bridge";

  return (
    <>
      {/* The first paint on every client, and the whole room on Tier C. Inline
          SVG in the server-rendered HTML, so it is painted and measured long
          before the renderer is requested — which is what keeps LCP off the
          WebGPU critical path. */}
      {isBridge ? <BridgeDrawing id="bridge" /> : null}

      <div className="ship-content">
        <div className="ship-topbar">
          <span>Ryan Stacy — Vertex Business Solutions</span>
          <span>{room.designation}</span>
        </div>

        <div className="ship-copy">
          <p className="ship-eyebrow">{room.designation}</p>
          <h1 className="ship-title">
            Custom software <em>that ships.</em>
          </h1>
          <p className="ship-blurb">{room.blurb}</p>
          <div className="ship-actions">
            <a className="ship-btn ship-btn-primary" href="#readout">
              See what shipped
            </a>
            <a className="ship-btn" href="mailto:contact@vertexapps.dev">
              Start a project
            </a>
          </div>
        </div>
      </div>

      <section className="ship-readout" id="readout" aria-labelledby="readout-h">
        <div className="ship-readout-inner">
          <h2 id="readout-h">Compartment {room.designation.split(" · ")[0]}</h2>
          <p>{room.described}</p>
          <p>
            This is the bridge of a working ship rather than a set. Every
            surface here is generated from code at runtime — the panelling, the
            deck seams, the console readouts and the gas giant outside are all
            shader work rather than downloaded geometry, which is why the room
            costs kilobytes rather than megabytes.
          </p>
          <p>
            Four more compartments are under construction. The ship computer at
            the lower right lists them and says when each opens; the portfolio
            bay is next.
          </p>
          <p>
            <Link href="/">Return to the standard site</Link>
          </p>
        </div>
      </section>
    </>
  );
}
