import VxMark from "@/components/VxMark";

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
          <a className="site-nav-link" href="/labs">
            Labs
          </a>
        </nav>
      </div>
    </header>
  );
}
