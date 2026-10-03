import VxMark from "@/components/VxMark";
import HeaderNav from "@/components/HeaderNav";

/**
 * `wordmarkHref` defaults to the site root so the mark navigates home from any
 * routed page; the single-page homepage passes "#hero-heading" so it scrolls to
 * the top rather than triggering a navigation.
 */
export default function SiteHeader({
  wordmarkHref = "/",
  current,
}: {
  wordmarkHref?: string;
  /** Marks the routed page the header is on, for screen readers. */
  current?: "labs" | "games";
}) {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <a href={wordmarkHref} className="wordmark">
          <VxMark />
          <span>Vertex Business Solutions</span>
        </a>
        <nav className="site-nav" aria-label="Primary">
          <HeaderNav />
          <a
            className="site-nav-link site-nav-page"
            href="/labs"
            aria-current={current === "labs" ? "page" : undefined}
          >
            {/* "All labs" beside the in-page Lab link; plain "Labs" on phones,
                where the section links are hidden and the room is needed. */}
            <span className="site-nav-long">All labs</span>
            <span className="site-nav-short">Labs</span>
          </a>
          <a
            className="site-nav-link site-nav-page"
            href="/games"
            aria-current={current === "games" ? "page" : undefined}
          >
            Games
          </a>
        </nav>
      </div>
      {/* Reading progress, one hairline. Width is --progress from HeaderNav. */}
      <span className="site-progress" aria-hidden="true" />
    </header>
  );
}
