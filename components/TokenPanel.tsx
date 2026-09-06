const swatches = [
  { hex: "#08090A", name: "bg" },
  { hex: "#101112", name: "surface" },
  { hex: "#F7F8F8", name: "text" },
  { hex: "#8A8F98", name: "muted" },
  { hex: "#5E6AD2", name: "accent" },
  { hex: "#1F2023", name: "hairline" },
];

const steps = [4, 8, 16, 24, 40];

export default function TokenPanel() {
  return (
    <div
      className="tokens"
      role="img"
      aria-label="A split panel: raw design tokens on the left — colour swatches, a type scale and a spacing scale — composed into a finished card on the right."
    >
      <div className="tokens-raw">
        <p className="tokens-label">tokens</p>

        <div className="tokens-swatches">
          {swatches.map((s) => (
            <div key={s.name} className="tokens-swatch" data-token={s.name}>
              <span
                className="tokens-chipcolor"
                style={{ background: s.hex }}
              />
              <span className="tokens-hex">{s.hex}</span>
            </div>
          ))}
        </div>

        <div className="tokens-type">
          <span className="tokens-type-a">Aa</span>
          <span className="tokens-type-b">Aa</span>
          <span className="tokens-type-c">Aa</span>
        </div>

        <div className="tokens-space">
          {steps.map((n) => (
            <span key={n} className="tokens-bar" style={{ width: n }} />
          ))}
        </div>
      </div>

      <div className="tokens-arrow" aria-hidden="true">
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path
            d="M0 6h17M13 2l4 4-4 4"
            stroke="var(--text-tertiary)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="tokens-applied">
        <p className="tokens-label">applied</p>
        {/* Hover a token on the left and the part of the card it lands on lights
            up — the mapping is the point of the panel. */}
        <div className="tokens-card">
          <p className="tokens-card-title">Retainer renewed</p>
          <p className="tokens-card-body">
            The next quarter is confirmed. Nothing further is needed from you.
          </p>
          <span className="tokens-card-cta">View agreement</span>
        </div>
        <p className="tokens-hint" aria-hidden="true">hover a token</p>
      </div>
    </div>
  );
}
