"""Download ABS Regional Population 2025 by Local Government Area (LGA 2025), with boundaries.

Source: ABS, Regional population 2024-25 (ERP at 30 June 2025), ArcGIS feature service
LGA_Regional_Population_2025, layer 1. Geometry is lightly generalised on the server
(maxAllowableOffset, in degrees) to keep the file small; it is simplified further later for the web.

    python scripts/fetch_abs_lga.py
"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "abs_lga" / "lga_erp_2025.geojson"
URL = "https://geo.abs.gov.au/arcgis/rest/services/Hosted/LGA_Regional_Population_2025/FeatureServer/1/query"
FIELDS = "lga_code_2025,lga_name_2025,state_name_2021,erp_2024,erp_2025,area_km2,pop_density_2025_people_per_km2"


def page(offset):
    params = {
        "where": "1=1", "outFields": FIELDS, "outSR": 4326, "f": "geojson",
        "maxAllowableOffset": 0.002, "geometryPrecision": 4,
        "resultOffset": offset, "resultRecordCount": 100, "orderByFields": "objectid",
    }
    req = urllib.request.Request(URL + "?" + urllib.parse.urlencode(params), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def main():
    features, offset = [], 0
    while True:
        data = page(offset)
        batch = data.get("features", [])
        features += batch
        print(f"offset {offset}: {len(batch)} features")
        if len(batch) < 100:
            break
        offset += 100
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")
    print(f"saved {len(features)} LGAs to {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
