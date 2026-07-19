import type { CSSProperties } from "react";

const SHA = "4f9c2ae10b7d3856e1c04a9fb2d75e83c6a1d0b4";

export default function DeployPanels() {
  return (
    <div
      className="deploy"
      role="img"
      aria-label="Three panels: the remote's commit hash, the local branch's commit hash, and a Vercel deployment reading ready with a matching hash."
    >
      <div className="deploy-panel" style={{ "--i": 0 } as CSSProperties}>
        <p className="deploy-cmd">
          <span className="deploy-prompt">$</span> git ls-remote origin
          refs/heads/main
        </p>
        <p className="deploy-out">
          <span className="deploy-sha">{SHA}</span>
          <span className="deploy-ref">refs/heads/main</span>
        </p>
      </div>

      <div className="deploy-panel" style={{ "--i": 1 } as CSSProperties}>
        <p className="deploy-cmd">
          <span className="deploy-prompt">$</span> git log -1 --format=%H
        </p>
        <p className="deploy-out">
          <span className="deploy-sha">{SHA}</span>
        </p>
      </div>

      <div className="deploy-panel" style={{ "--i": 2 } as CSSProperties}>
        <p className="deploy-cmd">
          <span className="deploy-prompt">›</span> vercel · production
        </p>
        <p className="deploy-out">
          <span className="deploy-status">READY · sha match</span>
        </p>
      </div>
    </div>
  );
}
