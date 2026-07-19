"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import "./assistant.css";

type Role = "user" | "assistant";

type Message = {
  id: number;
  role: Role;
  content: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const SUGGESTIONS = [
  "What does Vertex build?",
  "How do you handle multi-tenancy?",
  "How do I get in touch?",
];

let nextId = 0;
const id = () => (nextId += 1);

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    toggleRef.current?.focus();
  }, []);

  // Focus the input as the panel opens, so a visitor can type immediately.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Keep the newest text in view as tokens arrive.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, error, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || streaming) return;

      const history = [...messages, { id: id(), role: "user" as const, content: question }];
      const replyId = id();

      setMessages([...history, { id: replyId, role: "assistant", content: "" }]);
      setDraft("");
      setError(null);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const appendToReply = (chunk: string) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === replyId
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        );
      };

      const fail = (message: string) => {
        setError(message);
        setMessages((current) =>
          current.filter((entry) => entry.id !== replyId || entry.content.length > 0),
        );
      };

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!response.ok || !response.body) {
          let message = "Something went wrong. Try again.";
          try {
            const payload = (await response.json()) as { error?: unknown };
            if (typeof payload.error === "string") message = payload.error;
          } catch {
            // Non-JSON error body; keep the default.
          }
          fail(message);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError: string | null = null;

        /** Applies one SSE frame; returns a message if the server reported an error. */
        const handleFrame = (frame: string): string | null => {
          const payload = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");

          if (!payload) return null;

          let event: StreamEvent;
          try {
            event = JSON.parse(payload) as StreamEvent;
          } catch {
            return null;
          }

          if (event.type === "delta") appendToReply(event.text);
          else if (event.type === "error") return event.message;
          return null;
        };

        // Frames are delimited by a blank line and can straddle chunk
        // boundaries, so the trailing partial is carried into the next read.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) streamError = handleFrame(frame) ?? streamError;
        }

        buffer += decoder.decode();
        if (buffer.trim()) streamError = handleFrame(buffer) ?? streamError;

        if (streamError) fail(streamError);
      } catch (caught) {
        if ((caught as { name?: string })?.name !== "AbortError") {
          fail("Couldn't reach the assistant. Try again.");
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(false);
      }
    },
    [messages, streaming],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(draft);
  };

  const empty = messages.length === 0;

  return (
    <>
      {open && (
        <div
          id="assistant-panel"
          className="assistant-panel"
          role="dialog"
          aria-label="Ask about Vertex"
        >
          <header className="assistant-head">
            <p className="assistant-label">Vertex assistant</p>
            <button
              type="button"
              className="assistant-close"
              onClick={close}
              aria-label="Close the assistant"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </header>

          <div className="assistant-log" ref={logRef} role="log" aria-live="polite">
            {empty && (
              <div className="assistant-empty">
                <p className="assistant-empty-copy">
                  Ask about the work, the stack, or the way a project gets built.
                </p>
                <ul className="assistant-suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="assistant-suggestion"
                        onClick={() => void ask(suggestion)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className="assistant-msg" data-role={message.role}>
                <p className="assistant-msg-from">
                  {message.role === "user" ? "You" : "Vertex"}
                </p>
                <p className="assistant-msg-body">
                  {message.content}
                  {message.role === "assistant" &&
                    streaming &&
                    message.content.length === 0 && (
                      <span className="assistant-caret" aria-hidden="true" />
                    )}
                </p>
              </article>
            ))}

            {error && (
              <p className="assistant-error" role="status">
                {error}
              </p>
            )}
          </div>

          <form className="assistant-compose" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="assistant-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a question"
              aria-label="Ask a question about Vertex"
              autoComplete="off"
              disabled={streaming}
            />
            <button
              type="submit"
              className="assistant-send"
              disabled={streaming || draft.trim().length === 0}
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M7 12V2M7 2L2.5 6.5M7 2l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        className="assistant-toggle"
        aria-label={open ? "Close the Vertex assistant" : "Ask the Vertex assistant"}
        aria-expanded={open}
        aria-controls="assistant-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M2.5 3.75h13v8.5H7.75L4 15.25v-3H2.5z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </button>
    </>
  );
}
