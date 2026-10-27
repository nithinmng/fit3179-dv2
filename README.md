# Outside is Australia's biggest gym

FIT3179 Data Visualisation 2 (Monash University, S2 2026), by Nithin Mangalath.

A single-page data story about outdoor fitness in Australia: where adults exercise, who heads outdoors, why, when, and how much room there is to move. Built with Vega-Lite and Vega, HTML, CSS and a little JavaScript, and published with GitHub Pages.

## Preview locally

The charts load their JSON files, so open the page through a small local web server rather than straight from disk:

```
python -m http.server 8000
```

then visit `http://localhost:8000`.

## Files

| Path | What it is |
|---|---|
| `index.html` | Page structure, story text, captions and sources |
| `css/style.css` | Layout, typography, colour and all motion (with a reduced-motion fallback) |
| `js/main.js` | Embeds each chart with a shared theme; scroll reveals, chart entrance animations, hero number count-up, reading progress |
| `specs/` | **One human-readable Vega-Lite (`.vl.json`) or Vega (`.vg.json`) file per chart or chart pair** |
| `data/` | Small chart-ready JSON files the specs load (about 180 KB gzipped with the page, specs, CSS and JS). `councils.json` is the full 548-council table, kept for checking; the page loads the slimmer `city_councils.json`, `council_swarm.json` and `dorling.json` |
| `scripts/build_data.py` | Rebuilds everything in `data/` from `data/raw/`, including the Dorling circle positions (see below) |
| `scripts/fetch_osm.py`, `scripts/fetch_abs_lga.py` | Download the OpenStreetMap and ABS council data |
| `scripts/check_osm.py` | OpenStreetMap coverage check against the City of Gold Coast Fitness Stations list (not used by the page) |

## Charts

| # | Spec | Idiom | Data |
|---|---|---|---|
| 1 | `01-venues-waffle.vl.json` | Isotype waffle (small multiples) | AusPlay 2025 T7 |
| 2 | `02-states-spikes-dumbbell.vl.json` (left) | Spike map (proportional symbol map) | AusPlay 2025 state T7 |
| 3 | `02-states-spikes-dumbbell.vl.json` (right) | Connected dot plot (dumbbell) | AusPlay 2025 state T7 |
| 4 | `04-activity-bump.vl.json` | Bump chart | AusPlay 2025 T17 |
| 5 | `05-public-space-pyramid.vl.json` | Population pyramid (butterfly) | AusPlay 2025 T7 |
| 6 | `06-income-mosaic.vl.json` | Mosaic (Marimekko) | AusPlay 2025 T1 |
| 7 | `07-activity-age-heatmap.vl.json` | Heatmap with marginal bars | AusPlay 2025 T7, T17 |
| 8 | `08-organised-sankey.vg.json` | Sankey diagram (raw Vega) | AusPlay 2025 T3 |
| 9 | `09-motivations-lollipop.vl.json` | Lollipop chart | AusPlay 2025 T12 |
| 10 | `10-barriers.vl.json` | Bar chart (basic) | AusPlay 2025 T13 |
| 11 | `11-climate-rose.vl.json` | Nightingale rose (small multiples) | BOM climate statistics |
| 12 | `12-tech-slope.vl.json` | Slope chart | AusPlay 2025 T11 |
| 13 | `13-frequency.vl.json` | Bar chart (basic) | AusPlay 2025 T9 |
| 14 | `14-osm-dot-map.vl.json` | Dot map | OpenStreetMap |
| 15 | `15-city-hexbin-parks.vl.json` (left) | Hexbin map (bin map) | OpenStreetMap |
| 16 | `15-city-hexbin-parks.vl.json` (right) | Choropleth map | ABS mesh blocks 2021 + ABS population 2025 |
| 17 | `17-council-dorling.vg.json` | Dorling cartogram (raw Vega) | ABS mesh blocks 2021 + ABS population 2025 |
| 18 | `18-park-swarm.vl.json` | Beeswarm | ABS mesh blocks, population, SEIFA 2021 |

### Idiom count (conservative)

Interactions: hover tooltips on every chart; state menu (charts 2 and 3); age menu (chart 9); kind-of-day menu (chart 11); city menu and a minimum-sites slider (charts 15 and 16); smallest and largest council sliders with a live count (chart 17).

18 charts (16 if each two-panel figure counts once). Counted against the unit's basic idiom list and staff rulings on Ed (#217, #449: the same idiom twice counts once; #282 and #294: all maps are advanced; #295: slope chart; #457: Nightingale rose):

- **12 confirmed advanced idioms:** isotype waffle, proportional symbol (spike) map, connected dot plot, butterfly chart, heatmap with marginal bars, Sankey, lollipop, Nightingale rose, dot map, hexbin map, choropleth, Dorling cartogram.
- **13 with the slope chart** (#295 suggests it counts).
- **Uncertain, not relied on:** bump chart (x is life stage, not time), mosaic and beeswarm (not ruled on).
- **5 map idioms:** proportional symbol, dot, bin, choropleth, cartogram.

## Design system

- **Type:** Besley (hero, section and closing headings; a warm Clarendon-style serif, chosen because classmates already use Fraunces) and DM Sans (everything else: chart titles, body, navigation, chart labels, legends and controls). Scale set as CSS tokens in `css/style.css` (`--fs-hero` to `--fs-small`); chart text uses tabular figures. Both fall back to system fonts (Rockwell/Georgia and system-ui/Segoe UI/Arial).
- **Page colour:** time-of-day bands (dawn sand, morning green, midday gold, late-afternoon peach) separated by hill edges, ending at dusk; cards stay white.
- **Chart colour, one meaning per hue where possible:** greens for park space and activity frequency (darker = more); coral for public space and mapped outdoor gyms; teal for the gym; taupe or grey for "none" or "not active"; blue shades for population density (chart 18) and rain (chart 11). Small coloured text uses darker shades so it passes 4.5:1 contrast.
- **Motion:** charts embed as they approach the screen and play a one-off entrance (CSS `scale` on each mark, cleaned up after about 3 seconds). Hero and dusk scenery pause off screen. Everything is still under `prefers-reduced-motion`.

## Data notes

- **Local parkland** = ABS mesh blocks classed as "Parkland" (2021) of 50 hectares or less, divided by the council's estimated resident population at 30 June 2025. The cut-off applies to mesh-block size, not park size, and small parks inside residential mesh blocks are not counted. The finding (park space per resident barely relates to SEIFA disadvantage, Spearman −0.10, but falls with density, −0.75) holds at cut-offs of 20 ha and 2 km² (−0.05 to −0.20 and −0.56 to −0.86; tie-aware ranks). Parkland area says nothing about access, quality, shade or safety.
- **OpenStreetMap** outdoor gyms are a volunteer-mapped snapshot (24 October 2026) and incomplete; they are shown only as mapped locations, never compared between councils. `scripts/check_osm.py` compares them with the City of Gold Coast Fitness Stations list (2015, CC BY 3.0 AU, data.gov.au): of 109 council sites, 39 (36%) have an OpenStreetMap site within 150 m.
- **Dorling cartogram (chart 17):** circle positions are precomputed in `build_data.py` (council centroids projected with the page's equal-area conic projection, then pushed apart for 900 steps with numpy) and saved in `dorling.json`, so the browser does no force simulation. Idea adapted from the Vega example gallery "Dorling Cartogram".
- **State outlines:** ABS ASGS 2021 State and Territory boundaries (CC BY 4.0), simplified, in `states.json`.
- **SEIFA 2021** matched 545 of 548 councils on 2025 boundaries; Groote Archipelago and East Arnhem have no score.
- **AusPlay** is self-reported; small groups have wide margins of error; not comparable with releases before the 2023 move to online collection.
- **BOM** monthly statistics are long-term averages over different periods per station.

## Rebuilding the data

`data/raw/ausplay/` (AusPlay workbooks), `data/raw/abs_mb/` (ABS allocation files, about 50 MB) and `data/raw/abs_lga/` (council boundaries with population, about 3.5 MB) are not committed. Get them from:

- AusPlay national, by-sport and state data tables (Jan to Dec 2025): https://www.ausport.gov.au/clearinghouse/research/ausplay/results
- `MB_2021_AUST.xlsx` and `LGA_2025_AUST.xlsx`: https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/allocation-files
- Council boundaries and population: `python scripts/fetch_abs_lga.py`

Then run `python scripts/build_data.py` (needs `openpyxl`, `matplotlib` and `numpy`).

## Credits

Sources and licences are listed at the bottom of the page.
