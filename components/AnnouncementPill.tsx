import Link from "next/link";
import { labs } from "@/lib/content";

/**
 * Reads the head of the same `labs` array the /labs index renders, so shipping
 * a new Lab item updates the hero without anyone remembering to. The page is
 * statically prerendered, which is fine — a new item arrives with a deploy.
 */
export default function AnnouncementPill() {
  const latest = labs[0];
  if (!latest) return null;

  const label = `New: ${latest.name}`;

  return (
    <Link
      className="pill"
      href={latest.href}
      {...(latest.external
        ? { target: "_blank", rel: "noreferrer noopener" }
        : {})}
    >
      <span className="pill-dot" aria-hidden="true" />
      <span className="pill-text">{label}</span>
      <span className="pill-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
