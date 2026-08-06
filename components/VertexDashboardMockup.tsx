"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calculator,
  ChevronDown,
  CircleUser,
  Command,
  Compass,
  FileText,
  FlaskConical,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";

/**
 * The VX operating console — a composite dashboard reading across every product
 * in the studio at once. No such screen exists; the argument it makes is that
 * it could, which is the same argument the headline makes. It is real DOM
 * rather than a screenshot so the panels can arrive independently, and so the
 * whole thing stays crisp at any zoom once it is rotated in 3D.
 *
 * Figures are demo values on an obviously fictional internal tool. There are no
 * people in it: activity rows name the work, not a person doing the work, and
 * the account chip is initials rather than an invented face.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const NAV_WORKSPACE = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "ConsultBase", icon: Users, count: "12" },
  { label: "Parenting Plan Pro", icon: FileText, count: "147" },
  { label: "Northstar", icon: Compass },
  { label: "Villa L’Estagne", icon: Home, count: "28" },
];

const NAV_LABS = [
  { label: "Labs", icon: FlaskConical },
  { label: "Fee Engine", icon: Calculator, count: "312" },
];

const KPIS = [
  { label: "ConsultBase MRR", value: "$4,280", delta: "+12.4%", up: true, sub: "vs. last month" },
  { label: "Plans generated", value: "147", delta: "+8.1%", up: true, sub: "Parenting Plan Pro" },
  { label: "Villa nights booked", value: "28", delta: "−3.2%", up: false, sub: "next 90 days" },
  { label: "Fee Engine sessions", value: "312", delta: "+41.7%", up: true, sub: "since launch" },
];

const ACTIVITY = [
  { dot: "#5E6AD2", text: "Ops queue triage shipped to Labs", meta: "Deploy · 2h ago" },
  { dot: "#3FB68B", text: "New consultant workspace provisioned", meta: "ConsultBase · 5h ago" },
  { dot: "#E3A33C", text: "Villa gallery updated — 14 assets", meta: "Villa L’Estagne · 9h ago" },
  { dot: "#5E6AD2", text: "Fee Engine demo published", meta: "Labs · 1d ago" },
  { dot: "#8A8F98", text: "pg_cron nightly reconcile passed", meta: "Infrastructure · 1d ago" },
  { dot: "#3FB68B", text: "Plan export CI gate green on 240 fixtures", meta: "Parenting Plan Pro · 2d ago" },
];

/** Deterministic — a random walk here would change on every render. */
const BARS = [34, 52, 41, 63, 48, 71, 58, 82, 67, 91, 76, 88];
const SPARK = [18, 24, 21, 30, 27, 38, 33, 45, 40, 52, 47, 61, 55, 68];

const TAGS = ["supabase", "stripe", "pg_cron", "resend", "vercel"];

/** Panels arrive on the stagger the outer stage sets, sliding in from up-right. */
const panel = {
  hidden: { opacity: 0, x: 100, y: -80 },
  shown: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 1.2, ease: EASE },
  },
};

function Spark() {
  const w = 148;
  const h = 40;
  const max = Math.max(...SPARK);
  const pts = SPARK.map((v, i) => `${(i / (SPARK.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke="#5E6AD2" strokeWidth="1.5" strokeLinecap="round" />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill="rgba(94,106,210,0.10)"
        stroke="none"
      />
    </svg>
  );
}

export default function VertexDashboardMockup() {
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
          {NAV_WORKSPACE.map((n) => (
            <li key={n.label} className={n.active ? "vx-nav-item vx-nav-on" : "vx-nav-item"}>
              <n.icon size={13} />
              <span>{n.label}</span>
              {n.count && <span className="vx-nav-count">{n.count}</span>}
            </li>
          ))}
        </ul>

        <p className="vx-side-label">Labs</p>
        <ul className="vx-nav">
          {NAV_LABS.map((n) => (
            <li key={n.label} className="vx-nav-item">
              <n.icon size={13} />
              <span>{n.label}</span>
              {n.count && <span className="vx-nav-count">{n.count}</span>}
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
            <span className="vx-avatar">VX</span>
            <div className="vx-account-txt">
              <span className="vx-account-name">Studio workspace</span>
              <span className="vx-account-sub">Owner · 1 seat</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <motion.section className="vx-main" variants={panel}>
        <header className="vx-topbar">
          <div className="vx-crumb">
            <span className="vx-crumb-strong">Overview</span>
            <span className="vx-dim">/</span>
            <span>This week</span>
          </div>
          <div className="vx-topbar-right">
            <span className="vx-chip">
              Last 7 days
              <ChevronDown size={11} />
            </span>
            <span className="vx-icon-btn">
              <Bell size={13} />
            </span>
            <span className="vx-icon-btn">
              <Plus size={13} />
            </span>
            <span className="vx-avatar vx-avatar-sm">VX</span>
          </div>
        </header>

        <div className="vx-body">
          <div className="vx-kpis">
            {KPIS.map((k) => (
              <div key={k.label} className="vx-kpi">
                <div className="vx-kpi-top">
                  <span className="vx-kpi-label">{k.label}</span>
                  <MoreHorizontal size={12} className="vx-dim" />
                </div>
                <div className="vx-kpi-value">{k.value}</div>
                <div className="vx-kpi-foot">
                  <span className={k.up ? "vx-delta vx-up" : "vx-delta vx-down"}>
                    {k.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {k.delta}
                  </span>
                  <span className="vx-kpi-sub">{k.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="vx-split">
            {/* chart */}
            <div className="vx-card">
              <div className="vx-card-head">
                <div>
                  <p className="vx-card-title">Revenue this quarter</p>
                  <p className="vx-card-sub">Across four products</p>
                </div>
                <span className="vx-chip">
                  Monthly
                  <ChevronDown size={11} />
                </span>
              </div>
              <div className="vx-chart">
                {BARS.map((b, i) => (
                  <span
                    key={i}
                    className={i === BARS.length - 1 ? "vx-bar vx-bar-on" : "vx-bar"}
                    style={{ height: `${b}%` }}
                  />
                ))}
              </div>
              <div className="vx-axis">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              <div className="vx-card-foot">
                <Spark />
                <div className="vx-tags">
                  {TAGS.map((t) => (
                    <span key={t} className="vx-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* activity */}
            <div className="vx-card">
              <div className="vx-card-head">
                <div>
                  <p className="vx-card-title">Recent activity</p>
                  <p className="vx-card-sub">Six events</p>
                </div>
                <span className="vx-icon-btn">
                  <MoreHorizontal size={13} />
                </span>
              </div>
              <ul className="vx-feed">
                {ACTIVITY.map((a) => (
                  <li key={a.text} className="vx-feed-row">
                    <span className="vx-feed-dot" style={{ background: a.dot }} />
                    <div className="vx-feed-txt">
                      <span className="vx-feed-main">{a.text}</span>
                      <span className="vx-feed-meta">{a.meta}</span>
                    </div>
                    <CircleUser size={13} className="vx-dim" />
                  </li>
                ))}
              </ul>
              <div className="vx-card-foot vx-card-foot-center">
                <span className="vx-link">View all activity</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
