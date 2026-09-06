"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  Command,
  Compass,
  FlaskConical,
  GitCommitHorizontal,
  Home,
  Landmark,
  LayoutDashboard,
  Map,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";
import CountUp from "./CountUp";
import type { Commit } from "@/lib/shiplog";

/**
 * The VX operating console — the studio's own engineering surface, read across
 * every product at once. Real DOM rather than a screenshot so the panels can
 * arrive independently, and so the whole thing stays crisp once it is rotated
 * in 3D.
 *
 * Everything on it is anchored. The four tiles are counts the site already
 * states in prose and a visitor can verify from the product; the deploy panel
 * reconciles this build's own commit; the ship log is this repository's own
 * git history, read at build time. No figure here is invented, and nothing
 * is read from a client repository.
 */

/* The site's one curve — see --easing-linear in globals.css. */
const EASE = [0.32, 0.72, 0, 1] as const;

const NAV_WORKSPACE = [
  { label: "Engineering", icon: LayoutDashboard, active: true },
  { label: "ConsultBase", icon: Users, note: "live" },
  { label: "Villa L’Estagne", icon: Home, note: "live" },
  { label: "Civic Strategy Partners", icon: Landmark, note: "live" },
  { label: "Revoix", icon: Mic, note: "live" },
  { label: "FM24", icon: ShieldCheck, note: "live" },
];

const NAV_LABS = [
  { label: "NC Housing Terminal", icon: Map, note: "live" },
  { label: "Query Grid", icon: Table2, note: "in dev" },
];

/**
 * One fact per product. Each is stated in that product's Selected Work entry
 * and checkable from the product itself — the schema, the network tab, the
 * game.
 */
const FACTS = [
  {
    label: "ConsultBase",
    value: "60 / 60",
    unit: "tables",
    sub: "row-level security on every one · pg_cron in-database",
  },
  {
    label: "Villa L’Estagne",
    value: "0",
    unit: "cookies",
    sub: "no analytics · no payment platform · RLS on booking requests",
  },
  {
    label: "Revoix",
    value: "0",
    unit: "third-party requests",
    sub: "4 locales · no cookies · no analytics · prerendered",
  },
  {
    label: "Query Grid",
    value: "0",
    unit: "servers",
    sub: "DuckDB in the browser · 5 levels live · 60 planned",
  },
];

const TAGS = ["next 16", "supabase", "stripe", "pg_cron", "resend", "vercel"];

/** Panels arrive on the stagger the outer stage sets, sliding in from up-right. */
const panel = {
  hidden: { opacity: 0, x: 60, y: -40 },
  shown: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.9, ease: EASE },
  },
};

/**
 * Boot order. The panels land, then the instruments come alive in the order a
 * real console would: the facts count up, the verify lines type, the log
 * fills. Delays are in ms from mount and read by the CSS `--boot` custom
 * property, so the whole sequence is one timeline authored in one place.
 */
const BOOT = { nav: 700, fact: 900, verify: 1150, log: 1250 };

const DOT: Record<string, string> = {
  feat: "#3FB68B",
  fix: "#8B96FF",
  docs: "#E3A33C",
  revert: "#D9737F",
};

function dotFor(subject: string) {
  const type = subject.match(/^([a-z]+)(\(|:)/i)?.[1]?.toLowerCase() ?? "";
  return DOT[type] ?? "#8A8F98";
}

export default function VertexDashboardMockup({
  shiplog,
  buildSha,
}: {
  shiplog: Commit[];
  buildSha: string;
}) {
  const short = buildSha.slice(0, 7);
  const verify = [
    { kind: "cmd", text: "git rev-parse HEAD" },
    { kind: "out", text: buildSha },
    { kind: "cmd", text: "git ls-remote origin refs/heads/main" },
    { kind: "out", text: buildSha },
    { kind: "cmd", text: "vercel inspect --prod" },
    { kind: "out", text: `Ready · deployed ${short}` },
  ] as const;

  return (
    <div className="vx-console" aria-hidden="true">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <motion.aside className="vx-side" variants={panel}>
        <div className="vx-side-head">
          <span className="vx-mark">VX</span>
          <span className="vx-side-title">Vertex</span>
          <ChevronDown size={13} className="vx-dim" />
        </div>

        <div className="vx-search">
          <Search size={12} className="vx-dim" />
          <span className="vx-search-text">Search…</span>
          <span className="vx-kbd">
            <Command size={9} />K
          </span>
        </div>

        <p className="vx-side-label">Workspace</p>
        <ul className="vx-nav">
          {NAV_WORKSPACE.map((n, i) => (
            <li
              key={n.label}
              className={n.active ? "vx-nav-item vx-nav-on vx-boot" : "vx-nav-item vx-boot"}
              style={{ ["--boot" as string]: `${BOOT.nav + i * 60}ms` }}
            >
              <n.icon size={13} />
              <span>{n.label}</span>
              {"note" in n && n.note ? <span className="vx-nav-count">{n.note}</span> : null}
            </li>
          ))}
        </ul>

        <p className="vx-side-label">Lab</p>
        <ul className="vx-nav">
          {NAV_LABS.map((n, i) => (
            <li
              key={n.label}
              className="vx-nav-item vx-boot"
              style={{ ["--boot" as string]: `${BOOT.nav + (NAV_WORKSPACE.length + i) * 60}ms` }}
            >
              <n.icon size={13} />
              <span>{n.label}</span>
              <span className="vx-nav-count">{n.note}</span>
            </li>
          ))}
        </ul>

        <div className="vx-side-foot">
          <p className="vx-side-label">Settings</p>
          <div className="vx-nav-item">
            <Settings size={13} />
            <span>Preferences</span>
          </div>
          <div className="vx-account">
            <span className="vx-avatar">RS</span>
            <div className="vx-account-txt">
              <span className="vx-account-name">Ryan Stacy</span>
              <span className="vx-account-sub">One developer</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <motion.section className="vx-main" variants={panel}>
        <header className="vx-topbar">
          <div className="vx-crumb">
            <span className="vx-crumb-strong">Engineering</span>
            <span className="vx-dim">/</span>
            <span>Across eight projects</span>
          </div>
          <div className="vx-topbar-right">
            <span className="vx-chip vx-chip-ok">
              <Check size={11} />
              production · sha match
            </span>
            <span className="vx-icon-btn">
              <Bell size={13} />
            </span>
            <span className="vx-avatar vx-avatar-sm">RS</span>
          </div>
        </header>

        <div className="vx-body">
          <div className="vx-kpis">
            {FACTS.map((k, i) => (
              <div
                key={k.label}
                className="vx-kpi vx-boot"
                style={{ ["--boot" as string]: `${BOOT.fact + i * 120}ms` }}
              >
                <div className="vx-kpi-top">
                  <span className="vx-kpi-label">{k.label}</span>
                  <Compass size={12} className="vx-dim" />
                </div>
                <div className="vx-kpi-value">
                  <CountUp value={k.value} delay={BOOT.fact + i * 120} />
                  <span className="vx-kpi-unit">{k.unit}</span>
                </div>
                <div className="vx-kpi-foot">
                  <span className="vx-kpi-sub vx-kpi-sub-mono">{k.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="vx-split">
            {/* deploy · verify */}
            <div className="vx-card">
              <div className="vx-card-head">
                <div>
                  <p className="vx-card-title">Deploy · verify</p>
                  <p className="vx-card-sub">vertexapps.dev — this page, this commit</p>
                </div>
                <span className="vx-chip">
                  <GitCommitHorizontal size={11} />
                  main
                </span>
              </div>
              <div className="vx-verify">
                {verify.map((line, i) => (
                  <p
                    key={`${line.kind}-${i}`}
                    className={`vx-verify-line vx-verify-${line.kind} vx-boot`}
                    style={{ ["--boot" as string]: `${BOOT.verify + i * 110}ms` }}
                  >
                    {line.kind === "cmd" ? <span className="vx-verify-prompt">$</span> : null}
                    <span>{line.text}</span>
                  </p>
                ))}
                <p
                  className="vx-verify-line vx-verify-ok vx-boot"
                  style={{ ["--boot" as string]: `${BOOT.verify + verify.length * 110}ms` }}
                >
                  <span>› READY · sha match</span>
                  <span className="vx-verify-when">read at build</span>
                </p>
              </div>
              <div className="vx-card-foot">
                <div className="vx-tags">
                  {TAGS.map((t) => (
                    <span key={t} className="vx-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ship log */}
            <div className="vx-card">
              <div className="vx-card-head">
                <div>
                  <p className="vx-card-title">Ship log</p>
                  <p className="vx-card-sub">Last {shiplog.length} commits to this site</p>
                </div>
                <span className="vx-chip">git log</span>
              </div>
              <ul className="vx-feed">
                {shiplog.map((c, i) => (
                  <li
                    key={c.sha}
                    className="vx-feed-row vx-boot"
                    style={{ ["--boot" as string]: `${BOOT.log + i * 90}ms` }}
                  >
                    <span className="vx-feed-dot" style={{ background: dotFor(c.subject) }} />
                    <div className="vx-feed-txt">
                      <span className="vx-feed-main">{c.subject}</span>
                      <span className="vx-feed-meta">{c.date}</span>
                    </div>
                    <span className="vx-feed-sha">{c.short}</span>
                  </li>
                ))}
              </ul>
              <div className="vx-card-foot vx-card-foot-center">
                <span className="vx-link">Refreshed on every deploy · never edited by hand</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
