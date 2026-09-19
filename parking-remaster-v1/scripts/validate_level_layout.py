#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPRITE_MANIFEST=json.loads((ROOT/"VP_SPRITE_PRODUCTION_RESULT.json").read_text(encoding="utf-8"))

def req(x,msg):
    if not x: raise AssertionError(msg)

def hitbox(body):
    x1,y1,x2,y2=body
    cx=(x1+x2)/2;cy=(y1+y2)/2
    w=max(112,x2-x1);h=max(112,y2-y1)
    return [cx-w/2,cy-h/2,cx+w/2,cy+h/2]

def overlap(a,b):
    return not (a[2]<=b[0] or a[0]>=b[2] or a[3]<=b[1] or a[1]>=b[3])

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("level",type=Path)
    ap.add_argument("--compare",type=Path)
    a=ap.parse_args()
    level=json.loads(a.level.read_text(encoding="utf-8"))
    W=level["board"]["width"];H=level["board"]["height"]
    bounds=level["board"]["movement_bounds"]
    ids=[v["id"] for v in level["vehicles"]]
    req(len(ids)==len(set(ids)),"duplicate vehicle id")
    if level["tutorial"].get("first_focus_vehicle") is not None:
        req(level["tutorial"]["first_focus_vehicle"] in ids,"tutorial focus is not a vehicle")
    boxes=[]
    for v in level["vehicles"]:
        x1,y1,x2,y2=v["body"];sx1,sy1,sx2,sy2=v["sprite"]
        req(x1<x2 and y1<y2,f"{v['id']} invalid body")
        req(sx1<sx2 and sy1<sy2,f"{v['id']} invalid sprite")
        req(bounds["left"]<=x1 and x2<=bounds["right"] and bounds["top"]<=y1 and y2<=bounds["bottom"],f"{v['id']} body outside movement bounds")
        req(0<=sx1<sx2<=W and 0<=sy1<sy2<=H,f"{v['id']} sprite outside board")
        if v["dir"] in ("up","down"):
            req((sy2-sy1)>(sx2-sx1),f"{v['id']} vertical direction but nonvertical sprite")
        else:
            req((sx2-sx1)>(sy2-sy1),f"{v['id']} horizontal direction but nonhorizontal sprite")
        sp=ROOT/"assets"/"sprites"/f"{v['id']}.webp"
        req(sp.exists(),f"{v['id']} production sprite missing")
        expected=SPRITE_MANIFEST["sprites"][v["id"]]["sha256"]
        req(sha(sp)==expected,f"{v['id']} sprite hash mismatch")
        boxes.append((v["id"],hitbox(v["body"])))
    for i,(ida,a1) in enumerate(boxes):
        for idb,b1 in boxes[i+1:]:
            req(not overlap(a1,b1),f"ambiguous expanded hitboxes: {ida} vs {idb}")
    comparison={}
    if a.compare:
        prev=json.loads(a.compare.read_text(encoding="utf-8"))
        prev_rects={tuple(v["body"]) for v in prev["vehicles"]}
        exact=[v["id"] for v in level["vehicles"] if tuple(v["body"]) in prev_rects]
        comparison={"exact_body_rect_matches":exact,"count":len(exact)}
        req(len(exact)<len(level["vehicles"]),"layout duplicates previous level exactly")
    print(json.dumps({"status":"PASS","level_id":level["id"],"vehicle_count":len(ids),"comparison":comparison},indent=2))
    return 0
if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr);raise SystemExit(1)
