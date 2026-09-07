import { affordances } from "@/lib/content";
import { getBuildSha, getShipLog } from "@/lib/shiplog";

export default function SiteFooter() {
  /* The one live number the page carries below the hero: what this build is.
     Read at build time from the same source as the hero's ship log. */
  const sha = getBuildSha().slice(0, 7);
  const shipped = getShipLog(1)[0]?.date;

  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-lead">
          <p className="footer-mark">Vertex Business Solutions</p>
          {sha ? (
            <p className="footer-build" title="The commit this deployment was built from">
              <span className="footer-build-dot" aria-hidden="true" />
              deployed {shipped ?? ""} · <span className="footer-build-sha">{sha}</span> · sha match
            </p>
          ) : null}
        </div>
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
