import VxMark from "@/components/VxMark";
import HeaderNav from "@/components/HeaderNav";

/**
 * `wordmarkHref` defaults to the site root so the mark navigates home from any
 * routed page; the single-page homepage passes "#hero-heading" so it scrolls to
 * the top rather than triggering a navigation.
 */
export default function SiteHeader({
  wordmarkHref = "/",
}: {
  wordmarkHref?: string;
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
          <a className="site-nav-link site-nav-page" href="/labs">
            All labs
          </a>
        </nav>
      </div>
      {/* Reading progress, one hairline. Width is --progress from HeaderNav. */}
      <span className="site-progress" aria-hidden="true" />
    </header>
  );
}
