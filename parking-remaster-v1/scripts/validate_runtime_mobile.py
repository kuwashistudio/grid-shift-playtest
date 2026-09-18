#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"

EXPECTED_CARS = 10
MIN_MASTER_HITBOX = 112

CAR_RE = re.compile(
    r"\{id:'([^']+)'.*?body:\[([0-9]+),([0-9]+),([0-9]+),([0-9]+)\]",
    re.S,
)


def expand(box: tuple[int, int, int, int]) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = box
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    w = max(MIN_MASTER_HITBOX, x2 - x1)
    h = max(MIN_MASTER_HITBOX, y2 - y1)
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def overlaps(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    html = HTML.read_text(encoding="utf-8")

    cars = [
        (m.group(1), tuple(map(int, m.groups()[1:])))
        for m in CAR_RE.finditer(html)
    ]
    require(len(cars) == EXPECTED_CARS, f"expected {EXPECTED_CARS} cars, found {len(cars)}")

    boxes = [(name, expand(box)) for name, box in cars]
    for name, box in boxes:
        require(box[2] - box[0] >= MIN_MASTER_HITBOX, f"{name}: hitbox width regressed")
        require(box[3] - box[1] >= MIN_MASTER_HITBOX, f"{name}: hitbox height regressed")

    for i, (name_a, box_a) in enumerate(boxes):
        for name_b, box_b in boxes[i + 1 :]:
            require(not overlaps(box_a, box_b), f"ambiguous hitboxes: {name_a} overlaps {name_b}")

    require("function hitbox(body)" in html, "runtime hitbox expansion missing")
    require("Math.max(112,x2-x1)" in html and "Math.max(112,y2-y1)" in html, "112px minimum hitbox missing")
    require("touch-action:none" in html, "touch-action:none missing on car targets")
    require("addEventListener('pointerdown'" in html, "pointerdown input path missing")
    require("if(c.moved||c.bumping)return" in html, "rapid-tap bump lock missing")
    require("translate3d(${tx}px,${ty}px,0) rotate(${a}rad)" in html, "transform-only exit motion missing")
    require("will-change:transform,left,top" not in html, "layout-affecting will-change regression")

    # Apple 44pt target check for common iPhone portrait CSS widths.
    for width in (375, 390, 393, 430):
        scale = width / 941
        minimum_css_px = MIN_MASTER_HITBOX * scale
        require(minimum_css_px >= 44, f"{width}px viewport target falls below 44px: {minimum_css_px:.2f}")

    print("PASS runtime mobile QA: 10 cars, >=44px touch targets, no hitbox overlap, guarded pointer input")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
