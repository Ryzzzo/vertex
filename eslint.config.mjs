import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    /*
     * `.claude/**` holds git worktrees — each a full second checkout of this
     * repo, node_modules and all. Without it, `eslint .` walks those too and
     * reports the same source several times over, plus every vendored file.
     */
    ignores: [
      ".next/**",
      "node_modules/**",
      ".claude/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
