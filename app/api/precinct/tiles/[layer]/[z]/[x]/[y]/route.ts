import { tile, TILE_LAYERS, type TileLayer } from "@/lib/precinct/tiles";

/**
 * GET /api/precinct/tiles/:layer/:z/:x/:y — a Mapbox Vector Tile of precinct
 * or district boundaries. Public data, no address involved, so it is cached
 * hard: the client puts the data version in the query string, which makes
 * every URL immutable for the life of that data.
 */
export const runtime = "nodejs";

const CACHE = "public, max-age=86400, s-maxage=31536000, immutable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const { layer, z, x, y } = await params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  const ok =
    (TILE_LAYERS as readonly string[]).includes(layer) &&
    Number.isInteger(zi) && zi >= 0 && zi <= 16 &&
    Number.isInteger(xi) && Number.isInteger(yi) &&
    xi >= 0 && yi >= 0 && xi < 2 ** zi && yi < 2 ** zi;
  if (!ok) return new Response("Not a tile", { status: 400 });

  const body = tile(layer as TileLayer, zi, xi, yi);
  if (!body) return new Response(null, { status: 204, headers: { "cache-control": CACHE } });
  return new Response(body as unknown as BodyInit, {
    headers: { "content-type": "application/vnd.mapbox-vector-tile", "cache-control": CACHE },
  });
}
