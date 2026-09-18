#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RESULT=ROOT/"VP_SPRITE_PRODUCTION_RESULT.json"
LEVEL=ROOT/"levels"/"level_001.json"
MASTER=ROOT/"assets"/"master.webp"
SPRITES=ROOT/"assets"/"sprites"


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def require(cond,msg):
    if not cond:
        raise AssertionError(msg)


def main():
    result=json.loads(RESULT.read_text(encoding="utf-8"))
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    ids=[v["id"] for v in level["vehicles"]]

    require(result["gate"]=="VP_SPRITE_PRODUCTION","wrong result gate")
    require(result["status"]=="PASS","sprite production result is not PASS")
    require(result["sprite_count"]==len(ids)==10,"sprite count mismatch")
    require(sha256(MASTER)==result["master_sha256"],"MASTER provenance hash mismatch")
    require(result["visual_approval"]=="2026-09-19_EfficientSAM_fullsheet_plus_red_distance_refine_1.5","unexpected visual approval token")

    files=sorted(SPRITES.glob("*.webp"))
    require(len(files)==10,f"expected 10 production WebP sprites, got {len(files)}")
    require({p.stem for p in files}==set(ids),"sprite IDs do not match Level 1 vehicle IDs")

    for vid in ids:
        p=SPRITES/f"{vid}.webp"
        rec=result["sprites"][vid]
        require(p.exists(),f"missing {p.relative_to(ROOT)}")
        require(p.stat().st_size==rec["bytes"],f"{vid}: byte size mismatch")
        require(sha256(p)==rec["sha256"],f"{vid}: SHA256 mismatch")

    red=result["sprites"]["red_top"]["refine"]
    require(red is not None,"red_top refinement metadata missing")
    require(red["distance_threshold_px"]==1.5,"red_top refinement threshold changed")
    require(red["removed_yellow_pixels"]>500,"red_top tutorial glow refinement unexpectedly weak")
    require(red["refined_body_coverage"]>0.85,"red_top body coverage too low")

    print("PASS VP Sprite Production: exact MASTER provenance + 10 hash-locked production sprites + red tutorial-glow refinement")
    return 0


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}",file=sys.stderr)
        raise SystemExit(1)
