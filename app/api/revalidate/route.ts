import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

/**
 * The fast path for content freshness.
 *
 * `lib/sanity/content.ts` tags its reads with the document `_type`, so a
 * webhook carrying `{"tags": [_type]}` invalidates exactly the surfaces that
 * read that type and nothing else. The one-hour revalidate window on those
 * same reads is the slow path underneath it: if this route is misconfigured,
 * unreachable, or fired mid-deploy, the site heals itself within the hour
 * instead of serving stale copy until the next push.
 *
 * Configure at sanity.io/manage -> pnvu1x7w -> API -> Webhooks:
 *   URL        https://vertexapps.dev/api/revalidate
 *   Dataset    production
 *   Trigger    create, update, delete
 *   Filter     _type in ["project", "lab"]
 *   Projection {"tags": [_type]}
 *   Secret     the same value as SANITY_REVALIDATE_SECRET
 */

const KNOWN_TAGS = new Set(["project", "lab"]);

type WebhookPayload = { tags?: unknown };

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return new Response("Revalidation secret is not configured.", { status: 500 });
  }

  try {
    // `true` delays verification long enough for Sanity's CDN to catch up —
    // the webhook fires before the API edge has the new document, so
    // revalidating immediately would re-cache the value we are replacing.
    const { isValidSignature, body } = await parseBody<WebhookPayload>(req, secret, true);

    if (!isValidSignature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((tag): tag is string => typeof tag === "string" && KNOWN_TAGS.has(tag))
      : [];

    if (tags.length === 0) {
      // A 400 rather than a silent 200: an empty list means the projection is
      // wrong, and Sanity's webhook log is the only place that shows it.
      return new Response("No known tags in payload.", { status: 400 });
    }

    for (const tag of tags) {
      // Next 16 requires the profile argument. `updateTag` would be the
      // read-your-writes form, but it throws outside a Server Action, so a
      // webhook route has to use this one.
      revalidateTag(tag, "max");
    }

    return NextResponse.json({ revalidated: tags, now: Date.now() });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
}
