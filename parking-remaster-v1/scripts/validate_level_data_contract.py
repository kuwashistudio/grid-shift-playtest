#!/usr/bin/env python3
"""Fail-closed pre-production validator for Parking Remaster Level Data.

This validator is intentionally structural only. It does not unlock P1-008,
prove solver/runtime parity, or approve human gameplay quality. It prepares a
small deterministic contract that future rebuilt levels must satisfy before
solver/runtime checks are allowed to run.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ALLOWED_ORIENTATIONS = {"horizontal", "vertical"}
ALLOWED_AXES = {"x", "y"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate(data: object) -> None:
    if not isinstance(data, dict):
        fail("root must be an object")
    if data.get("schema_version") != "1.0":
        fail("schema_version must be 1.0")
    level_id = data.get("level_id")
    if not isinstance(level_id, str) or not level_id.strip():
        fail("level_id must be a non-empty string")

    board = data.get("board")
    if not isinstance(board, dict):
        fail("board must be an object")
    for key in ("width", "height"):
        value = board.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            fail(f"board.{key} must be a positive integer")

    exits = data.get("exits")
    if not isinstance(exits, list) or not exits:
        fail("exits must be a non-empty array")
    exit_ids: set[str] = set()
    for i, exit_ in enumerate(exits):
        if not isinstance(exit_, dict):
            fail(f"exits[{i}] must be an object")
        eid = exit_.get("id")
        if not isinstance(eid, str) or not eid or eid in exit_ids:
            fail(f"exits[{i}].id must be unique and non-empty")
        exit_ids.add(eid)
        axis = exit_.get("axis")
        if axis not in ALLOWED_AXES:
            fail(f"exits[{i}].axis must be x or y")
        direction = exit_.get("direction")
        if direction not in (-1, 1):
            fail(f"exits[{i}].direction must be -1 or 1")

    cars = data.get("cars")
    if not isinstance(cars, list) or not cars:
        fail("cars must be a non-empty array")
    car_ids: set[str] = set()
    for i, car in enumerate(cars):
        if not isinstance(car, dict):
            fail(f"cars[{i}] must be an object")
        cid = car.get("id")
        if not isinstance(cid, str) or not cid or cid in car_ids:
            fail(f"cars[{i}].id must be unique and non-empty")
        car_ids.add(cid)
        orientation = car.get("orientation")
        if orientation not in ALLOWED_ORIENTATIONS:
            fail(f"cars[{i}].orientation must be horizontal or vertical")
        for key in ("x", "y", "length"):
            value = car.get(key)
            if not isinstance(value, int) or isinstance(value, bool):
                fail(f"cars[{i}].{key} must be an integer")
        if car["x"] < 0 or car["y"] < 0 or car["length"] <= 0:
            fail(f"cars[{i}] coordinates must be non-negative and length positive")
        span_x = car["length"] if orientation == "horizontal" else 1
        span_y = car["length"] if orientation == "vertical" else 1
        if car["x"] + span_x > board["width"] or car["y"] + span_y > board["height"]:
            fail(f"cars[{i}] extends outside board")
        exit_id = car.get("exit_id")
        if exit_id not in exit_ids:
            fail(f"cars[{i}].exit_id must reference a declared exit")
        expected_axis = "x" if orientation == "horizontal" else "y"
        if next(e for e in exits if e["id"] == exit_id)["axis"] != expected_axis:
            fail(f"cars[{i}] orientation axis must match its exit axis")

    occupied: dict[tuple[int, int], str] = {}
    for car in cars:
        cells = ((car["x"] + d, car["y"]) for d in range(car["length"])) if car["orientation"] == "horizontal" else ((car["x"], car["y"] + d) for d in range(car["length"]))
        for cell in cells:
            if cell in occupied:
                fail(f"cars overlap at {cell}: {occupied[cell]} and {car['id']}")
            occupied[cell] = car["id"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("level", type=Path)
    args = parser.parse_args()
    try:
        validate(json.loads(args.level.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print("PASS: Level Data structural contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
