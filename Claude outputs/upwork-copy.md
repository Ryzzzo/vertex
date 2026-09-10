# NC Housing Terminal — Upwork portfolio copy

**Title** (37/40 OK):
Live housing choropleth, every NC ZIP

**Role** (85/100 OK):
Design and build — Mapbox GL, Next.js, a build-time data pipeline, deployed on Vercel

**Description** (286/300 OK):
A Bloomberg-style housing terminal: every North Carolina ZIP code drawn as a live choropleth of Zillow home-value change. The colour scale is clamped and diverging, so a red in Asheville means the same thing as a red in Charlotte. Hover resolves the ZIP, county and year-on-year figure.

**Description, long alt** (592/600 OK):
A Bloomberg-style housing terminal for North Carolina: every ZIP code drawn as a live choropleth of Zillow home-value change, on a real Mapbox basemap. Two decisions carry it. The colour scale is clamped and diverging, so a given red means the same thing in Asheville as in Charlotte — unclamped, one outlier county flattens the rest into noise. And Zillow's raw series is reshaped into ZIP-indexed data by a build-time pipeline, so the map ships static and the browser never waits on a request. Labels are zoom-gated and detail resolves on hover. Designed, built and deployed in one evening.

**Skills:** Mapbox, Data Visualization, Next.js, React, Geospatial

**URL:** https://housing.vertexapps.dev


## Image captions (<=140 each)

**01-hero.png** (131/140 OK):
North Carolina by ZIP code, coloured by year-on-year home value. Hover resolves the ZIP, its town and county, and the exact figure.

**02-per-zip-readout.png** (132/140 OK):
Several hundred ZIP polygons, each its own value — not county averages. Zoom-gated labels keep the state legible instead of crowded.

**03-diverging-scale.png** (133/140 OK):
The scale is clamped and diverging: a red in Asheville reads the same as a red in Charlotte, so one outlier cannot flatten the state.

**04-context.png** (115/140 OK):
A real basemap at continental zoom, with one state carrying data — the map is a terminal, not a picture of a state.

**05-mobile.png** (85/140 OK):
The terminal reflows to the phone: same data, same scale, legend and sourcing intact.
