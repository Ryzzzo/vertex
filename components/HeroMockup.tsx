import type { CSSProperties } from "react";

type Message = { from: string; time: string; body: string };
type Card = { title: string; tag: string; state?: "todo" | "doing" | "done" };

const thread: Message[] = [
  {
    from: "Ryan",
    time: "09:14",
    body: "Overlap backstop is in. Two requests for the same night can’t both win now, even if they land in the same second.",
  },
  {
    from: "Dana",
    time: "09:16",
    body: "Tried it from two tabs. Second one bounces clean, and the message actually explains why.",
  },
  {
    from: "Ryan",
    time: "09:18",
    body: "Good. The migration ships with the rebuild that expects it — not ahead of it.",
  },
  {
    from: "Dana",
    time: "09:21",
    body: "Then I’ll hold the palette rollout until after. No reason to move two things at once.",
  },
];

const columns: { name: string; cards: Card[] }[] = [
  {
    name: "Todo",
    cards: [
      { title: "Row-level policy audit", tag: "security", state: "todo" },
      { title: "Zoom-gated label pass", tag: "maps", state: "todo" },
    ],
  },
  {
    name: "In Progress",
    cards: [
      { title: "Wire booking overlap backstop", tag: "booking", state: "doing" },
      { title: "Cool palette rollout", tag: "design", state: "doing" },
    ],
  },
  {
    name: "Done",
    cards: [{ title: "Protected-text registry", tag: "documents", state: "done" }],
  },
];

const stateColor: Record<NonNullable<Card["state"]>, string> = {
  todo: "var(--text-tertiary)",
  doing: "var(--accent)",
  done: "#4a8f6a",
};

/**
 * Decorative composition — a chat thread laid over a kanban fragment.
 * Hidden from assistive tech: the content is illustrative, not informational.
 */
export default function HeroMockup() {
  let cardIndex = 0;

  return (
    <div className="mockup" aria-hidden="true">
      {/* Kanban fragment, behind */}
      <div className="mockup-board">
        {columns.map((col) => (
          <div key={col.name} className="mockup-col">
            <div className="mockup-col-head">
              <span>{col.name}</span>
              <span className="mockup-count">{col.cards.length}</span>
            </div>
            {col.cards.map((card) => {
              const i = cardIndex++;
              return (
                <div
                  key={card.title}
                  className="mockup-card assemble-card"
                  style={{ "--i": i } as CSSProperties}
                >
                  <span
                    className="mockup-pill"
                    style={{ background: stateColor[card.state ?? "todo"] }}
                  />
                  <p className="mockup-card-title">{card.title}</p>
                  <span className="mockup-chip">{card.tag}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Chat thread, in front */}
      <div className="mockup-chat">
        {thread.map((m, i) => (
          <div
            key={m.body}
            className="mockup-msg assemble-line"
            style={{ "--i": i } as CSSProperties}
          >
            <div className="mockup-msg-meta">
              <span className="mockup-msg-from">{m.from}</span>
              <span className="mockup-msg-time">{m.time}</span>
            </div>
            <p className="mockup-msg-body">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
