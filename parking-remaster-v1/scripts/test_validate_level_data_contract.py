#!/usr/bin/env python3
"""Dependency-free regression tests for validate_level_data_contract.py."""
from validate_level_data_contract import validate


def base():
    return {
        "schema_version": "1.0",
        "level_id": "fixture",
        "board": {"width": 6, "height": 6},
        "exits": [
            {"id": "east", "axis": "x", "direction": 1},
            {"id": "south", "axis": "y", "direction": 1},
        ],
        "cars": [
            {"id": "a", "x": 0, "y": 0, "length": 2, "orientation": "horizontal", "exit_id": "east"},
            {"id": "b", "x": 4, "y": 1, "length": 2, "orientation": "vertical", "exit_id": "south"},
        ],
    }


def must_fail(mutator):
    data = base()
    mutator(data)
    try:
        validate(data)
    except ValueError:
        return
    raise AssertionError("fixture unexpectedly passed")


def main():
    validate(base())
    must_fail(lambda d: d["cars"].append({"id": "a", "x": 2, "y": 2, "length": 2, "orientation": "horizontal", "exit_id": "east"}))
    must_fail(lambda d: d["cars"].append({"id": "c", "x": 1, "y": 0, "length": 2, "orientation": "vertical", "exit_id": "south"}))
    must_fail(lambda d: d["cars"].append({"id": "c", "x": 5, "y": 5, "length": 2, "orientation": "horizontal", "exit_id": "east"}))
    must_fail(lambda d: d["cars"].__setitem__(0, {**d["cars"][0], "exit_id": "south"}))
    must_fail(lambda d: d["cars"].__setitem__(0, {**d["cars"][0], "exit_id": "missing"}))
    print("PASS: Level Data contract regression fixtures")


if __name__ == "__main__":
    main()
