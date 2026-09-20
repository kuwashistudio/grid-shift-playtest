#!/usr/bin/env python3
"""Dependency-free regression tests for level_fingerprint.py."""
from copy import deepcopy

from level_fingerprint import fingerprint


def base():
    return {
        "schema_version": "1.0",
        "level_id": "level-a",
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


def main():
    original = base()

    # Identity metadata and input array order must not hide an exact duplicate.
    reordered = deepcopy(original)
    reordered["level_id"] = "renamed-copy"
    reordered["cars"].reverse()
    reordered["exits"].reverse()
    assert fingerprint(original) == fingerprint(reordered)

    # A real structural change must produce a different fingerprint.
    changed = deepcopy(original)
    changed["cars"][0]["x"] = 1
    assert fingerprint(original) != fingerprint(changed)

    # Board geometry is part of structural identity.
    resized = deepcopy(original)
    resized["board"]["width"] = 7
    assert fingerprint(original) != fingerprint(resized)

    print("PASS: Level Data fingerprint regression fixtures")


if __name__ == "__main__":
    main()
