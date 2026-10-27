"""Coverage check for the OSM outdoor fitness data (not used by the page).

Merges features within MERGE_M metres into one site, assigns each site to an ABS 2025 council by
point-in-polygon, and prints site counts and rates per 100k residents by state, plus the councils with
the most sites and the share of people living in councils with no mapped site.

It also compares OSM with an official council inventory: City of Gold Coast "Fitness Stations" (2015 extract
of 266 equipment records, CC BY 3.0 AU, data.gov.au), converted from the council's KMZ to
data/raw/goldcoast/gold_coast_fitness_stations.json. That comparison supports the page's completeness caveat.

    python scripts/check_osm.py
"""
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from matplotlib.path import Path as Poly

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MERGE_M = 60

osm = json.loads((RAW / "osm" / "fitness_stations_raw.json").read_text(encoding="utf-8"))
lga = json.loads((RAW / "abs_lga" / "lga_erp_2025.geojson").read_text(encoding="utf-8"))

pts = []
for el in osm["elements"]:
    lat = el.get("lat", el.get("center", {}).get("lat"))
    lon = el.get("lon", el.get("center", {}).get("lon"))
    if lat is not None:
        pts.append((lat, lon, el["type"], el.get("tags", {})))
print("features", len(pts), Counter(p[2] for p in pts))
print("has fitness_station=* subtag", sum(1 for p in pts if "fitness_station" in p[3]))


def dist_m(a, b):
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


# Greedy clustering on a coarse grid: features within MERGE_M of a site centre join that site
grid, sites = defaultdict(list), []
for lat, lon, _, _ in sorted(pts, key=lambda p: (p[0], p[1])):
    key = (round(lat * 500), round(lon * 500))  # cells about 200 m
    near = [s for k in [(key[0] + i, key[1] + j) for i in (-1, 0, 1) for j in (-1, 0, 1)] for s in grid[k]]
    hit = next((s for s in near if dist_m(sites[s], (lat, lon)) <= MERGE_M), None)
    if hit is None:
        sites.append((lat, lon))
        grid[key].append(len(sites) - 1)
print(f"sites after merging features within {MERGE_M} m:", len(sites))

polys = []
for f in lga["features"]:
    g, p = f["geometry"], f["properties"]
    rings = g["coordinates"] if g["type"] == "Polygon" else [r for poly in g["coordinates"] for r in poly]
    for ring in rings:
        xs = [c[0] for c in ring]
        ys = [c[1] for c in ring]
        polys.append((min(xs), min(ys), max(xs), max(ys), Poly(ring), p))

per_lga, unmatched = Counter(), 0
for lat, lon in sites:
    hit = next((p for x0, y0, x1, y1, poly, p in polys
                if x0 <= lon <= x1 and y0 <= lat <= y1 and poly.contains_point((lon, lat))), None)
    if hit:
        per_lga[hit["lga_code_2025"]] += 1
    else:
        unmatched += 1
print("sites outside every council polygon:", unmatched)

props = {f["properties"]["lga_code_2025"]: f["properties"] for f in lga["features"]}
state_sites, state_pop = Counter(), Counter()
for code, p in props.items():
    state_pop[p["state_name_2021"]] += p["erp_2025"] or 0
    state_sites[p["state_name_2021"]] += per_lga[code]
print("\nstate, sites, per 100k")
for s in sorted(state_pop, key=lambda s: -state_pop[s]):
    print(f"  {s:30} {state_sites[s]:5}  {100000 * state_sites[s] / max(state_pop[s], 1):6.1f}")

pop_zero = sum((p["erp_2025"] or 0) for c, p in props.items() if per_lga[c] == 0)
print(f"\ncouncils with at least one site: {sum(1 for c in props if per_lga[c])} of {len(props)}")
print(f"share of people in councils with no mapped site: {pop_zero / sum(state_pop.values()):.1%}")
big = sorted(props.values(), key=lambda p: -(p["erp_2025"] or 0))[:25]
print("\n25 most populous councils: sites, per 100k")
for p in big:
    n = per_lga[p["lga_code_2025"]]
    print(f"  {p['lga_name_2025'][:28]:28} {p['state_name_2021'][:3]} {n:4}  {100000 * n / p['erp_2025']:5.1f}")


# ------------------------------------------------------------------------------------------------
# Gold Coast: how many of the council's own outdoor-gym sites appear in OSM?
# ------------------------------------------------------------------------------------------------
def merge(points, metres):
    out = []
    for p in points:
        if not any(dist_m(p, q) <= metres for q in out):
            out.append(p)
    return out


gc = json.loads((RAW / "goldcoast" / "gold_coast_fitness_stations.json").read_text(encoding="utf-8"))
council_sites = merge([(f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]) for f in gc["features"]], MERGE_M)
box = (-28.3, 153.0, -27.65, 153.6)  # lat_min, lon_min, lat_max, lon_max
osm_gc = merge([(lat, lon) for lat, lon, _, _ in pts if box[0] <= lat <= box[2] and box[1] <= lon <= box[3]], MERGE_M)
matched = sum(1 for s in council_sites if any(dist_m(s, o) <= 150 for o in osm_gc))
print()
print(f"Gold Coast: council sites (2015) {len(council_sites)}, OSM sites in the same area {len(osm_gc)}; "
      f"council sites with an OSM site within 150 m: {matched} ({matched / len(council_sites):.0%})")
