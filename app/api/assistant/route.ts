import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/assistant/prompt";
import { consume, fingerprintFrom } from "@/lib/assistant/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 8000;

type ChatMessage = { role: "user" | "assistant"; content: string };

/** One SSE frame. The client discriminates on `type`. */
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function json(body: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Returns the validated message list, or a string describing why the body is
 * unusable.
 */
function parseMessages(body: unknown): ChatMessage[] | string {
  if (typeof body !== "object" || body === null) return "Malformed request body.";

  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages)) return "`messages` must be an array.";
  if (messages.length === 0) return "`messages` must not be empty.";
  if (messages.length > MAX_MESSAGES) {
    return "This conversation is too long. Start a new one.";
  }

  const parsed: ChatMessage[] = [];
  let totalChars = 0;

  for (const entry of messages) {
    if (typeof entry !== "object" || entry === null) {
      return "Each message must be an object.";
    }
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return "Each message needs a role of `user` or `assistant`.";
    }
    if (typeof content !== "string") return "Each message needs string content.";

    const trimmed = content.trim();
    if (trimmed.length === 0) return "Messages cannot be empty.";

    totalChars += trimmed.length;
    if (totalChars > MAX_TOTAL_CHARS) return "That message is too long.";

    parsed.push({ role, content: trimmed });
  }

  return parsed;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(
      { error: "The assistant is not configured right now. Email contact@vertexapps.dev." },
      503,
    );
  }

  const limit = consume(fingerprintFrom(request.headers));
  if (!limit.allowed) {
    return json({ error: "Please try again shortly." }, 429, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request body." }, 400);
  }

  const messages = parseMessages(body);
  if (typeof messages === "string") {
    return json({ error: messages }, 400);
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Held so the ReadableStream's `cancel` hook can tear down the upstream
  // request when the browser disconnects mid-answer.
  let upstreamRef: { abort: () => void } | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already torn down by a cancelled consumer.
        }
      };

      const upstream = client.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        },
        { signal: request.signal },
      );

      // If the visitor closes the panel or navigates away, stop paying for
      // tokens nobody will read.
      upstreamRef = upstream;
      const onAbort = () => {
        upstream.abort();
        finish();
      };
      request.signal.addEventListener("abort", onAbort, { once: true });

      try {
        for await (const event of upstream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "delta", text: event.delta.text });
          }
        }
        send({ type: "done" });
      } catch (error) {
        // Most specific first: APIUserAbortError extends APIConnectionError,
        // which extends APIError.
        if (request.signal.aborted || error instanceof Anthropic.APIUserAbortError) {
          // Client hung up; there is nobody left to report to.
        } else if (error instanceof Anthropic.RateLimitError) {
          send({ type: "error", message: "The assistant is busy. Try again shortly." });
        } else if (error instanceof Anthropic.AuthenticationError) {
          send({
            type: "error",
            message: "The assistant is not configured right now. Email contact@vertexapps.dev.",
          });
        } else if (error instanceof Anthropic.InternalServerError) {
          send({ type: "error", message: "The assistant is unavailable. Try again shortly." });
        } else if (error instanceof Anthropic.APIConnectionError) {
          send({ type: "error", message: "Couldn't reach the assistant. Try again." });
        } else if (error instanceof Anthropic.APIError) {
          send({ type: "error", message: "The assistant hit an error. Try again." });
        } else {
          send({ type: "error", message: "Something went wrong. Try again." });
        }
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        upstreamRef = null;
        finish();
      }
    },
    cancel() {
      upstreamRef?.abort();
      upstreamRef = null;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
