import Link from "next/link";
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
          {/* Not an affordance — a licence obligation. CC-BY requires the attribution
              to be reachable from wherever the work appears, so it lives in the
              colophon on every page that renders this footer. */}
          <li>
            <Link className="link" href="/legal/credits">
              Credits
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
