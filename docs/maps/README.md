# Political map boundary provenance

`src/data/political-map-geometry.js` contains actual administrative boundaries, **not election constituency boundaries**. Do not label a district polygon as an Assembly or provincial-council constituency. The source also includes ordinary city wards and Jeju administrative cities, so the 256 polygons do not mean 256 elected basic local governments.

Source: [Statistics Korea SGIS](https://sgis.kostat.go.kr/), processed by [vuski/admdongkor](https://github.com/vuski/admdongkor) (`ver20260701`), then dissolved and simplified by [DevMinGeonPark/mapcn-kr](https://github.com/DevMinGeonPark/mapcn-kr/tree/06c7a3456dd82965bd29042130441515717519ab/data). Boundary data is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The upstream attribution is preserved verbatim in `LICENSE-DATA`. Source URLs, immutable revision and SHA-256 hashes are recorded in `source-manifest.json`.

The upstream snapshot contains 16 provinces/metropolitan governments and 256 administrative districts, dated July 1, 2026. In particular, the upstream data already combines Gwangju and Jeonnam as 전남광주통합특별시. The display key for that region is `전남광주`. This is the source's administrative geography, not independent verification of election or officeholder data.

Local changes: convert geographic coordinates to a common Mercator projection fitted inside `0 0 600 720` with at least 16 units of margin; round to 0.1 SVG units; serialize polygons as SVG paths; attach short display names, bounding boxes and label anchors. Islands remain at their geographic positions. No invented boundary segments or constituency divisions are added. Upstream province and district layers were simplified separately, so small differences between their shared edges can remain.

API: `MAP_VIEWBOX`, `MAP_BOUNDARY_DATE`, `MAP_REGIONS`, `MAP_DISTRICTS`. Each region has `code`, `name`, `fullName`, `d`, `center: [x,y]`, and `bounds: [x,y,width,height]`. Each district has `code`, `name`, `region` (short province key), `regionCode`, `d`, `center`, and `bounds`. Render paths with `fill-rule="evenodd"` to preserve polygon holes. Label centers are anchored in the largest polygon where possible; region bounds include offshore islands.

Rebuild from the pinned source with `node docs/maps/build-political-map-geometry.mjs`. No runtime or generation packages are required. Keep a visible map attribution such as “경계: 통계청 SGIS · vuski/admdongkor · mapcn-kr / CC BY 4.0” linked to this source/license when redistributing.
