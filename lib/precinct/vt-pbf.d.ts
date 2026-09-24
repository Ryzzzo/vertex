/**
 * vt-pbf ships no types. This is the one call the tile route makes: encode
 * geojson-vt tiles, keyed by layer name, as a Mapbox Vector Tile.
 */
declare module "vt-pbf" {
  const vtpbf: {
    fromGeojsonVt(
      layers: Record<string, unknown>,
      options?: { version?: number; extent?: number },
    ): Uint8Array;
  };
  export default vtpbf;
}
