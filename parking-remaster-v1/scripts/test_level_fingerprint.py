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

    # Vehicle IDs and exit IDs are referential labels, not gameplay geometry.
    # A copied board with all labels renamed must still collide.
    relabeled = deepcopy(original)
    relabeled["level_id"] = "copy-with-new-labels"
    relabeled["exits"][0]["id"] = "right_gate"
    relabeled["exits"][1]["id"] = "bottom_gate"
    relabeled["cars"][0]["id"] = "vehicle_99"
    relabeled["cars"][0]["exit_id"] = "right_gate"
    relabeled["cars"][1]["id"] = "vehicle_42"
    relabeled["cars"][1]["exit_id"] = "bottom_gate"
    relabeled["cars"].reverse()
    assert fingerprint(original) == fingerprint(relabeled)

    # Rewiring a car to a semantically different exit changes gameplay identity.
    rewired = deepcopy(original)
    rewired["cars"][0]["exit_id"] = "south"
    assert fingerprint(original) != fingerprint(rewired)

    # A real structural change must produce a different fingerprint.
    changed = deepcopy(original)
    changed["cars"][0]["x"] = 1
    assert fingerprint(original) != fingerprint(changed)

    # Board geometry is part of structural identity.
    resized = deepcopy(original)
    resized["board"]["width"] = 7
    assert fingerprint(original) != fingerprint(resized)

    print("PASS: Level Data fingerprint regression fixtures, including ID-renamed duplicates")


if __name__ == "__main__":
    main()
