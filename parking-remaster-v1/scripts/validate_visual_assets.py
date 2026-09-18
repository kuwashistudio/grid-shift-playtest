#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
LEVEL = ROOT / "levels" / "level_001.json"


def require(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    ids = [v["id"] for v in level["vehicles"]]

    require((ASSETS / "master.webp").exists(), "canonical master.webp missing")

    clean = ASSETS / "clean_plate.webp"
    require(clean.exists(), "clean_plate.webp missing")

    missing = []
    for vid in ids:
        path = ASSETS / "sprites" / f"{vid}.webp"
        if not path.exists():
            missing.append(str(path.relative_to(ROOT)))

    require(not missing, "missing reusable sprites: " + ", ".join(missing))

    # Patch assets are intentionally NOT required by the production architecture.
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    require("assets/patches/" not in html, "runtime still depends on Level-1-only patch assets")
    require("assets/clean_plate.webp" in html, "runtime does not use clean plate")

    print("PASS Visual Production Gate asset structure: clean plate + reusable 10-car sprite set; no patch dependency")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
