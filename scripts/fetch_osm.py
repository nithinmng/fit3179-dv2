"""Download every OpenStreetMap outdoor fitness station (leisure=fitness_station) in Australia.

Australia is split into bounding-box tiles so each Overpass request stays small. Results are
deduplicated by OSM type and id and written to data/raw/osm/fitness_stations_raw.json, with the
OSM snapshot timestamp kept for citation. Data (c) OpenStreetMap contributors, ODbL.

    python scripts/fetch_osm.py
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "osm" / "fitness_stations_raw.json"
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# south, west, north, east: mainland and Tasmania in 4 x 3 tiles
LATS = [-44.0, -35.0, -26.0, -9.0]
LONS = [112.0, 123.0, 134.0, 143.0, 154.5]


def query(bbox):
    s, w, n, e = bbox
    q = (f'[out:json][timeout:170];('
         f'node["leisure"="fitness_station"]({s},{w},{n},{e});'
         f'way["leisure"="fitness_station"]({s},{w},{n},{e});'
         f'relation["leisure"="fitness_station"]({s},{w},{n},{e}););out center tags;')
    body = urllib.parse.urlencode({"data": q}).encode()
    for attempt in range(6):
        url = ENDPOINTS[attempt % len(ENDPOINTS)]
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": "FIT3179-student-project/1.0"})
            with urllib.request.urlopen(req, timeout=200) as r:
                return json.load(r)
        except Exception as err:
            print(f"  tile {bbox} attempt {attempt + 1} on {url.split('/')[2]} failed: {err}")
            time.sleep(15 * (attempt + 1))
    raise RuntimeError(f"tile {bbox} failed on every endpoint")


def main():
    found, stamp = {}, None
    for i in range(len(LATS) - 1):
        for j in range(len(LONS) - 1):
            bbox = (LATS[i], LONS[j], LATS[i + 1], LONS[j + 1])
            data = query(bbox)
            stamp = stamp or data.get("osm3s", {}).get("timestamp_osm_base")
            for el in data["elements"]:
                found[(el["type"], el["id"])] = el
            print(f"tile {bbox}: {len(data['elements'])} features, {len(found)} unique so far")
            time.sleep(5)
    OUT.write_text(json.dumps({"osm_timestamp": stamp, "elements": list(found.values())}), encoding="utf-8")
    print(f"saved {len(found)} features, OSM snapshot {stamp}")


if __name__ == "__main__":
    main()
