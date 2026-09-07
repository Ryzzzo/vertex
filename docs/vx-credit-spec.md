# VX site credit — spec for building agents

Paste this whole file into any agent that is building a client site for Vertex Business Solutions. It defines the one approved way to credit VX on a client's site.

## The call

Use a **quiet footer credit**, not a "Powered by" badge.

- "Powered by X" means a *platform* runs the site (Webflow, Shopify, Squarespace). Their floating corner badges are what their **free tier** forces on you — visitors read a corner badge as "template / free plan". That is the opposite of the signal VX wants.
- Studios whose work reads as expensive credit themselves with a small line in the footer: "Site by …", "Made by …". The restraint *is* the signal — the site speaks for the studio, the credit just answers "who built this?" for the one visitor who asks.
- Wording: **"Built by Vertex"** (or **"Site by Vertex"** when VX only did the website). Never "Powered by". Never "Vertex Business Solutions" spelled out in the visible credit — the link's accessible name carries the full name (see snippet).

Where it earns business: the visitor who is a business owner, likes the site, scrolls to the bottom, and clicks. The link tracks that click, and the full-name accessible label + normal (dofollow) link gives vertexapps.dev a backlink from a real client domain with the right anchor text.

## Placement rules

1. Footer, in the legal/copyright row. Left-aligned after the copyright if there is room; otherwise a second line under it. Never fixed/floating, never in the header, never on hero.
2. One instance per site. Not on every page section, not in the 404, not in emails.
3. Size: the client's footer small-text size (usually 12–13px). Mark height = the text's cap height (~14px at 13px text). It must never be the largest thing in the footer.
4. Colour: **inherits the client's footer text colour**, at their muted/secondary level. The only colour that is allowed to be VX's is the indigo period in the mark (`#5E6AD2`). If indigo clashes with the client palette, set `--vx-accent` to the client's own accent — the dot must stay a *different* colour from the letters, that is all.
5. Hover: text steps up to the client's primary text colour, mark stays. No underline animation, no scale, no glow. 200ms.
6. Light backgrounds: the mark's badge fill becomes the page background and the border a hairline in the client's border colour. The SVG already does this through the `--vx-*` variables — set them, don't restyle the paths.
7. Never place a separate VX logo image, colour logo, or "VX" lockup anywhere on a client site. The credit is the only appearance.

## Consent

Only add the credit when the client's agreement includes the portfolio/credit clause, or the client has said yes in writing. If neither, build the site with the credit **omitted** and leave a `TODO(vx-credit)` comment where it would go. Do not ask the client mid-build; Ryan handles that conversation.

## The snippet (copy verbatim, edit only `CLIENT_SLUG`)

```html
<!-- VX site credit — one per site, footer legal row only. See vx-credit-spec.md -->
<a class="vx-credit"
   href="https://vertexapps.dev/?utm_source=CLIENT_SLUG&utm_medium=site-credit&utm_campaign=client-sites"
   aria-label="Built by Vertex Business Solutions — custom web applications"
   rel="noopener">
  <svg class="vx-credit-mark" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
    <rect x="1.5" y="1.5" width="509" height="509" rx="123"
          fill="var(--vx-surface, transparent)" stroke="var(--vx-border, currentColor)" stroke-width="12"/>
    <g transform="translate(77.86,332.75) scale(0.105,-0.105)">
      <path fill="currentColor" d="M581 0H919L1441 1490H1149L893 716C851 583 806 420 752 213C697 418 649 584 607 716L343 1490H50Z"/>
    </g>
    <g transform="translate(230.01,332.75) scale(0.105,-0.105)">
      <path fill="currentColor" d="M53 0H360L590 334C664 441 695 499 737 577C779 497 810 441 881 334L1107 0H1421L893 771L1382 1490H1080L896 1218C820 1104 784 1030 740 944C696 1030 661 1103 586 1218L405 1490H96L588 762Z"/>
    </g>
    <g transform="translate(365.58,332.75) scale(0.105,-0.105)">
      <path fill="var(--vx-accent, #5E6AD2)" d="M326 -17C416 -17 487 53 487 143C487 232 416 302 326 302C236 302 166 232 166 143C166 53 236 -17 326 -17Z"/>
    </g>
  </svg>
  <span>Built by Vertex</span>
</a>
```

```css
/* Inherit the footer's muted text colour; only the accent dot is ours. */
.vx-credit {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font: inherit;            /* the footer's small-text size */
  color: inherit;           /* the footer's muted colour */
  text-decoration: none;
  transition: color 200ms cubic-bezier(0.32, 0.72, 0, 1);
  --vx-accent: #5E6AD2;     /* swap to the client accent only if indigo clashes */
  --vx-surface: transparent;
  --vx-border: currentColor;
}
.vx-credit-mark { width: 1.05em; height: 1.05em; flex: none; }
.vx-credit:hover,
.vx-credit:focus-visible { color: var(--client-text-primary, inherit); }
@media (prefers-reduced-motion: reduce) { .vx-credit { transition: none; } }
```

React/Next: same markup as a `VxCredit` component with `clientSlug` prop; keep the CSS in the client's global stylesheet under their footer rules.

## Do-not list

- No "Powered by". No floating badge. No colour VX logo. No VX indigo on the text.
- No `rel="nofollow"` — the backlink is part of the point.
- No opening in a new tab by default (`target="_blank"` only if the client's other external links do).
- No credit on the site until consent exists (see above).

## Slugs already in use

civic-strategy-partners · villa-lestagne · fm24 · revoix · true-colors · parenting-plan-pro (only after PPP consent)
