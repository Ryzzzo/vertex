import { lookup, MAX_ADDRESS_LENGTH } from "@/lib/precinct/lookup";
import { allowLookup } from "@/lib/precinct/rate-limit";
import type { LookupError } from "@/lib/precinct/types";

/**
 * POST /api/precinct  { address: string }
 *
 * Node runtime because the lookup reads the statewide precinct file from disk
 * and keeps it decoded in memory between requests.
 *
 * Privacy: the address is never logged, stored or cached. It is forwarded once
 * to the Census geocoder and returned to the visitor who sent it. Responses are
 * marked no-store so no shared cache between here and the browser keeps one.
 */
export const runtime = "nodejs";

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const STATUS: Record<LookupError["code"], number> = {
  empty: 400,
  too_long: 400,
  bad_request: 400,
  po_box: 422,
  no_match: 404,
  outside_nc: 422,
  no_precinct: 404,
  rate_limited: 429,
  geocoder_unavailable: 503,
};

function reply(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}

export async function POST(request: Request) {
  const limit = allowLookup(request.headers);
  if (!limit.allowed) {
    const body: LookupError = {
      ok: false,
      code: "rate_limited",
      message: `That's a lot of lookups in a few minutes. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
    return reply(body, 429, { "retry-after": String(limit.retryAfterSeconds) });
  }

  let address: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_ADDRESS_LENGTH * 4) throw new Error("oversized");
    address = (JSON.parse(text) as { address?: unknown }).address;
  } catch {
    address = undefined;
  }
  if (typeof address !== "string") {
    const body: LookupError = {
      ok: false,
      code: "bad_request",
      message: "Send JSON like {\"address\": \"600 E 4th St, Charlotte, NC\"}.",
    };
    return reply(body, 400);
  }

  try {
    const result = await lookup(address);
    return reply(result, result.ok ? 200 : STATUS[result.code]);
  } catch (err) {
    // The error class only — never the address, never the message, which can echo input.
    console.error("precinct lookup failed:", err instanceof Error ? err.name : "unknown");
    const body: LookupError = {
      ok: false,
      code: "geocoder_unavailable",
      message: "Something went wrong on our side. Try again in a moment.",
    };
    return reply(body, 500);
  }
}
