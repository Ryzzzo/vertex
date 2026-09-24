import { precinctByIndex, precinctFeature, precinctInfo } from "@/lib/precinct/geo";

/**
 * GET /api/precinct/shape/:index — one precinct at full precision, with its
 * districts, for the map to raise when a visitor clicks it. Public data and
 * no address, so it caches like a tile.
 */
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ index: string }> }) {
  const { index } = await params;
  const p = precinctByIndex(Number(index));
  if (!p) return Response.json({ ok: false }, { status: 404 });
  return Response.json(
    { ok: true, info: precinctInfo(p), feature: precinctFeature(p) },
    { headers: { "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" } },
  );
}
