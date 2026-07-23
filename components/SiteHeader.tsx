import VxMark from "@/components/VxMark";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <a href="#hero-heading" className="wordmark">
          <VxMark />
          <span>Vertex Business Solutions</span>
        </a>
      </div>
    </header>
  );
}
