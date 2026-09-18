#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
LEVEL = ROOT / "levels" / "level_001.json"
BUNDLE = ROOT / "levels.generated.js"
LOGIC = ROOT / "game_logic.js"


def require(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    html = HTML.read_text(encoding="utf-8")
    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    bundle = BUNDLE.read_text(encoding="utf-8")
    logic = LOGIC.read_text(encoding="utf-8")

    prefix = "window.__PARKING_LEVELS__="
    line = next((x for x in bundle.splitlines() if x.startswith(prefix)), None)
    require(line is not None and line.endswith(";"), "generated level payload missing")
    generated = json.loads(line[len(prefix):-1])
    require(generated == {level["id"]: level}, "generated bundle differs from canonical JSON")

    require('<script src="game_logic.js"></script>' in html, "relative logic include missing")
    require('<script src="levels.generated.js"></script>' in html, "relative generated bundle include missing")
    require("const defs=[" not in html, "hard-coded runtime defs still present")
    require("level.vehicles.map" in html, "runtime does not consume level vehicles")
    require("level.tutorial.first_focus_vehicle" in html, "runtime does not consume tutorial focus")
    require("logic.blockerId" in html, "runtime does not delegate collision logic to functional core")
    require("level.board.movement_bounds" in logic, "functional core does not consume movement bounds")
    require("level.board.corridor_inset" in logic, "functional core does not consume corridor inset")
    require("fetch(" not in html, "runtime JSON/network fetch introduced")

    print("PASS LDP-2: canonical JSON -> generated local JS + pure logic -> runtime; no hard-coded defs/fetch")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
