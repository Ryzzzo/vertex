import type { CSSProperties } from "react";
import { getBuildSha } from "@/lib/shiplog";

type Line =
  | { kind: "cmd"; text: string }
  | { kind: "out"; text: string }
  | { kind: "ok"; text: string };

/**
 * The Boxing Day check, verbatim: local HEAD, the remote ref, and the live
 * deployment all reconciled against one SHA. Chapter 4 claims this is the bar;
 * the panel shows the commands that actually enforce it.
 */
function linesFor(sha: string): Line[] {
  return [
    { kind: "cmd", text: "git rev-parse HEAD" },
    { kind: "out", text: sha },
    { kind: "cmd", text: "git ls-remote origin refs/heads/main" },
    { kind: "out", text: sha },
    { kind: "cmd", text: "vercel inspect --prod" },
    { kind: "ok", text: `Ready · deployed ${sha.slice(0, 7)}` },
  ];
}

export default function TerminalPanel() {
  /* The build's own commit — the check shown is the check this deploy passed. */
  const lines = linesFor(getBuildSha());
  /*
   * The session types itself out as the panel scrolls through the viewport.
   * Scroll-driven animations ignore animation-delay, so the per-line stagger is
   * expressed as a slice of the view range keyed off --i; --chars gives each
   * command line the width to type across.
   */
  return (
    <div className="terminal" aria-hidden="true">
      <div className="terminal-chrome">
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-title">deploy — verify</span>
      </div>

      <div className="terminal-body">
        {lines.map((line, i) => (
          <p
            key={`${line.kind}-${line.text}`}
            className={`terminal-line terminal-${line.kind}`}
            style={{ "--chars": line.text.length, "--i": i } as CSSProperties}
          >
            {line.kind === "cmd" ? <span className="terminal-prompt">$</span> : null}
            <span className="terminal-text">{line.text}</span>
          </p>
        ))}
        <span className="terminal-cursor" />
      </div>
    </div>
  );
}
