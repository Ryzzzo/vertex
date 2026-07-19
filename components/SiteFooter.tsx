import { affordances } from "@/lib/content";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <p className="footer-mark">Vertex Business Solutions</p>
        <ul className="affordances footer-affordances">
          {affordances.map((a) => (
            <li key={a.label}>
              <a
                className="link"
                href={a.href}
                {...(a.href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                {a.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
