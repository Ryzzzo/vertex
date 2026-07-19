import { affordances } from "@/lib/content";

export default function Contact() {
  return (
    <section className="section" aria-labelledby="contact">
      <div className="shell">
        <header className="section-head reveal">
          <h2 id="contact" className="h2">
            Contact.
          </h2>
          <p className="body section-intro">
            The best fit is bounded work built with care — portals, internal
            tools, AI systems, and the businesses that need them done properly.
            Email is fastest; I reply within one business day.
          </p>
        </header>

        <ul className="affordances reveal">
          {affordances.map((a) => (
            <li key={a.label}>
              <a
                className="link affordance"
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
    </section>
  );
}
