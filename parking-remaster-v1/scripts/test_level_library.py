#!/usr/bin/env python3
from __future__ import annotations

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from level_library import build


def level(level_id: str, x: int = 0) -> dict:
    return {
        "schema_version": "1.0",
        "level_id": level_id,
        "board": {"width": 6, "height": 6},
        "exits": [{"id": "right", "axis": "x", "direction": 1}],
        "cars": [{"id": "car_a", "x": x, "y": 1, "length": 2, "orientation": "horizontal", "exit_id": "right"}],
    }


def patch_loader(fixtures: dict[str, dict]):
    import level_library
    old = level_library.load
    level_library.load = lambda p: copy.deepcopy(fixtures[p.name])
    return level_library, old


def expect_fail(fn, needle: str) -> None:
    try:
        fn()
    except ValueError as exc:
        assert needle in str(exc), (needle, str(exc))
    else:
        raise AssertionError(f"expected failure containing {needle!r}")


def main() -> int:
    fixtures = {"a.json": level("L01", 0), "b.json": level("L02", 2)}
    module, old = patch_loader(fixtures)
    try:
        manifest = build([Path("b.json"), Path("a.json")])
        assert manifest["level_count"] == 2
        assert [e["level_id"] for e in manifest["levels"]] == ["L01", "L02"]

        fixtures["b.json"] = level("L01", 2)
        expect_fail(lambda: build([Path("a.json"), Path("b.json")]), "duplicate level_id")

        fixtures["b.json"] = level("L02", 0)
        expect_fail(lambda: build([Path("a.json"), Path("b.json")]), "exact structural duplicate")

        fixtures["b.json"] = level("L02", 2)
        fixtures["b.json"]["cars"][0]["x"] = 5
        expect_fail(lambda: build([Path("a.json"), Path("b.json")]), "extends outside board")
    finally:
        module.load = old
    print("PASS: Level Library deterministic/fail-closed regression tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
