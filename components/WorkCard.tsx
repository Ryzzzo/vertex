"use client";

import { useState } from "react";
import Shot from "./Shot";
import type { WorkItem } from "@/lib/content";

function Chevron() {
  return (
    <svg
      className="card-chevron"
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 9.5 L9.5 3.5 M4.75 3.5 H9.5 V8.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Caret() {
  return (
    <svg
      className="card-caret"
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.25 L5.5 7.25 L8.5 4.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type View = "desktop" | "phone";

/**
 * Desktop / phone. Every phone capture is a real render of the live site at
 * 390 CSS px; the switch flips the plate in 3D rather than swapping images,
 * so the two are read as one object seen from two sides.
 */
function DeviceSwitch({
  view,
  onChange,
  label,
}: {
  view: View;
  onChange: (v: View) => void;
  label: string;
}) {
  return (
    <div className="card-devices" role="group" aria-label={`${label}: choose a device`}>
      {(
        [
          ["desktop", "Desktop"],
          ["phone", "Phone"],
        ] as const
      ).map(([v, text]) => (
        <button
          key={v}
          type="button"
          className="card-device"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Media({ item, view = "desktop" }: { item: WorkItem; view?: View }) {
  if (!item.shot) {
    return (
      <div className="card-media card-media-empty">
        <span className="card-media-note">{item.note ?? "Preview coming soon."}</span>
      </div>
    );
  }

  const desktop = (
    <Shot
      src={item.shot}
      alt={item.shotAlt ?? ""}
      sizes={item.featured ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 720px) 100vw, 50vw"}
      priority={item.featured}
    />
  );

  if (!item.shotMobile) {
    return <div className="card-media">{desktop}</div>;
  }

  return (
    <div className="card-media card-flip" data-view={view}>
      <div className="card-flip-inner">
        <div className="card-face card-face-front">{desktop}</div>
        <div className="card-face card-face-back" aria-hidden={view !== "phone"}>
          <div className="card-phone">
            {/* 780×1688 native; the frame shows the top and pans on hover. */}
            <img
              src={item.shotMobile}
              alt={item.shotAlt ? item.shotAlt.replace("on desktop", "on a phone") : ""}
              width={780}
              height={1688}
              loading="lazy"
              decoding="async"
              className="card-phone-shot"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stack + approach. The inner wrapper exists so the collapsed state can animate
 * on grid-template-rows (0fr → 1fr) without hard-coding a height.
 */
function Detail({
  item,
  id,
  fixed,
}: {
  item: WorkItem;
  id?: string;
  /** Always-open variant used by the featured card, which has room for it. */
  fixed?: boolean;
}) {
  return (
    <div className={fixed ? "card-detail card-detail-fixed" : "card-detail"} id={id}>
      <div className="card-detail-inner">
        <div className="card-detail-row">
          <p className="card-detail-label">Stack</p>
          <p className="card-detail-stack">{item.stack}</p>
        </div>
        <div className="card-detail-row">
          <p className="card-detail-label">Approach</p>
          <p className="card-detail-approach">{item.approach}</p>
        </div>
      </div>
    </div>
  );
}

function Title({ item }: { item: WorkItem }) {
  const heading = (
    <>
      {item.name}
      {item.url ? <Chevron /> : null}
    </>
  );

  return (
    <h3 className="h3 card-title">
      {item.url ? (
        /*
         * The ::after on this anchor stretches over the whole card, so the
         * media is clickable without nesting the disclosure button inside a
         * link. The button re-raises itself above it via z-index.
         */
        <a
          className="card-title-link"
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          {heading}
        </a>
      ) : (
        heading
      )}
    </h3>
  );
}

/**
 * The featured card has the room to state its case outright, so stack and
 * approach sit inline rather than behind an interaction.
 */
function FeaturedCard({ item }: { item: WorkItem }) {
  const [view, setView] = useState<View>("desktop");
  return (
    <article className="card card-featured reveal">
      <Media item={item} view={view} />
      <div className="card-body">
        <p className="marker card-eyebrow">Featured</p>
        <Title item={item} />
        <p className="body card-line">{item.line}</p>
        {item.shotMobile ? <DeviceSwitch view={view} onChange={setView} label={item.name} /> : null}
        <Detail item={item} fixed />
      </div>
    </article>
  );
}

function StandardCard({ item }: { item: WorkItem }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("desktop");
  const detailId = `card-detail-${item.slug}`;

  return (
    <article className="card" data-open={open ? "" : undefined}>
      <div className="card-frame">
        <Media item={item} view={view} />
        <Detail item={item} id={detailId} />
      </div>
      <div className="card-body">
        <Title item={item} />
        <p className="body card-line">{item.line}</p>
        <div className="card-controls">
        {item.shotMobile ? <DeviceSwitch view={view} onChange={setView} label={item.name} /> : null}
        <button
          type="button"
          className="card-toggle"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide detail" : "Stack & approach"}
          <Caret />
        </button>
        </div>
      </div>
    </article>
  );
}

export default function WorkCard({ item }: { item: WorkItem }) {
  /*
   * The reveal animation is a scroll-driven `.reveal`, which the featured card
   * opts into directly. Standard cards get it from the grid wrapper so the
   * stagger reads left-to-right rather than per-card.
   */
  return item.featured ? (
    <FeaturedCard item={item} />
  ) : (
    <div className="reveal card-slot">
      <StandardCard item={item} />
    </div>
  );
}
