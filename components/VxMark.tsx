/**
 * The VX mark, inlined rather than served as an <img> so the brand kit's
 * --vx-* variables resolve against the site's own tokens. Geometry, the indigo
 * baseline period, and the badge border are final — restyle nothing here.
 *
 * Decorative in every current placement: the wordmark beside it already names
 * the company, so announcing the mark too would read the name twice.
 */
export default function VxMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={
        {
          "--vx-surface": "var(--surface)",
          "--vx-border": "var(--hairline)",
          "--vx-fg": "var(--text-primary)",
          "--vx-accent": "var(--accent)",
        } as React.CSSProperties
      }
    >
      <rect
        x="1.5"
        y="1.5"
        width="509"
        height="509"
        rx="123"
        fill="var(--vx-surface,#101112)"
        stroke="var(--vx-border,#2A2C30)"
        strokeWidth="3"
      />
      <g transform="translate(77.86,332.75) scale(0.105000,-0.105000)">
        <path
          d="M581 0H919L1441 1490H1149L893 716C851 583 806 420 752 213C697 418 649 584 607 716L343 1490H50Z"
          fill="var(--vx-fg,#F7F8F8)"
        />
      </g>
      <g transform="translate(230.01,332.75) scale(0.105000,-0.105000)">
        <path
          d="M53 0H360L590 334C664 441 695 499 737 577C779 497 810 441 881 334L1107 0H1421L893 771L1382 1490H1080L896 1218C820 1104 784 1030 740 944C696 1030 661 1103 586 1218L405 1490H96L588 762Z"
          fill="var(--vx-fg,#F7F8F8)"
        />
      </g>
      <g transform="translate(365.58,332.75) scale(0.105000,-0.105000)">
        <path
          d="M326 -17C416 -17 487 53 487 143C487 232 416 302 326 302C236 302 166 232 166 143C166 53 236 -17 326 -17Z"
          fill="var(--vx-accent,#5E6AD2)"
        />
      </g>
    </svg>
  );
}
