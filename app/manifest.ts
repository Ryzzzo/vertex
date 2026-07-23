import type { MetadataRoute } from "next";

/**
 * Next serves this at /manifest.webmanifest and injects the <link rel="manifest">
 * itself, so the tag is not declared in the metadata export as well.
 *
 * `theme_color` / `background_color` are the site's ground token (#08090A) rather
 * than the mark's surface, so an installed shell opens onto the same near-black
 * the page paints on and there is no flash between chrome and content.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vertex Business Solutions",
    short_name: "Vertex",
    description:
      "One person carries your project from architecture to production — so nothing is lost between the person who heard you and the person who builds it.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
