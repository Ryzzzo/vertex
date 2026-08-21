import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import "./credits.css";

/**
 * The colophon.
 *
 * The Rejala line is a licence obligation, not a courtesy: CC-BY requires attribution
 * wherever the work appears, and it appears in the Bridge render. It is reproduced here
 * verbatim, exactly as `docs/credits.md` records it — that file is the source of truth
 * and this page is its published form. If one changes, change both.
 *
 * The Poly Haven entries are CC0 and legally need nothing. They are listed anyway,
 * because provenance is worth more than the two lines it costs.
 */

export const metadata: Metadata = {
  title: "Credits",
  description:
    "Attribution for third-party assets used in Vertex Business Solutions renders and on this site.",
};

export default function CreditsPage() {
  return (
    <>
      <main className="shell credits">
        <p className="credits-eyebrow">Colophon</p>
        <h1>Credits</h1>
        <p>
          Attribution for every third-party asset that appears in a shipped
          render or on this site.
        </p>

        <h2>CC-BY 4.0</h2>
        <p className="credits-attribution">
          &ldquo;Sci-fi Ship interior - Modular asset pack&rdquo; (
          <a
            href="https://skfb.ly/oInVB"
            target="_blank"
            rel="noreferrer noopener"
          >
            https://skfb.ly/oInVB
          </a>
          ) by Rejala is licensed under{" "}
          <a
            href="http://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Creative Commons Attribution
          </a>
          .
        </p>
        <p>
          Used as the modular kit for the{" "}
          <Link href="/ship/bridge">Bridge</Link> compartment: wall bays, the
          octagonal shell, console housings and greebles. The kit was
          re-materialled and re-lit; no texture from it survives in the final
          frame.
        </p>

        <h2>CC0 / public domain</h2>
        <p>
          These require no attribution. They are listed for provenance.
        </p>
        <ul>
          <li>
            <a
              href="https://polyhaven.com/a/metal_plate_02"
              target="_blank"
              rel="noreferrer noopener"
            >
              metal_plate_02
            </a>{" "}
            — Poly Haven. Diffuse, normal, roughness, metalness and AO at 2K;
            carries every physical surface channel in the Bridge.
          </li>
          <li>
            <a
              href="https://polyhaven.com/a/boiler_room"
              target="_blank"
              rel="noreferrer noopener"
            >
              boiler_room
            </a>{" "}
            — Poly Haven. 4K HDRI, ambient fill only.
          </li>
        </ul>

        <h2>Generated</h2>
        <p>
          The gas giant on the viewscreen is an AI-generated video plate. The
          Bridge itself was assembled, lit and path-traced in Blender/Cycles —
          the frame is a 3840×2160 render, not a real-time scene.
        </p>

        <p>
          <Link href="/">Return to the standard site</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
