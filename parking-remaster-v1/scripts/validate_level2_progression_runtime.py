#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
BUNDLE=(ROOT/"levels.generated.js").read_text(encoding="utf-8")

def req(x,msg):
    if not x: raise AssertionError(msg)

def main():
    prefix="window.__PARKING_LEVELS__="
    line=next((x for x in BUNDLE.splitlines() if x.startswith(prefix)),None)
    req(line and line.endswith(";"),"level bundle missing")
    levels=json.loads(line[len(prefix):-1])
    req(set(levels)=={"level_001","level_002"},"progression proof must contain exactly Level 1 and Level 2")
    req("let level=levels?.level_001" in HTML,"runtime does not boot Level 1")
    req("loadLevel('level_001',{recordTransition:false})" in HTML,"initial load is not immediate Level 1")
    req("completedId==='level_001'&&levels.level_002" in HTML,"Level 1 completion progression guard missing")
    req("loadLevel('level_002')" in HTML,"automatic Level 2 transition missing")
    req("levelHud.textContent=`LEVEL ${level.sequence}`" in HTML,"dynamic level HUD missing")
    req('id="levelHud"' in HTML,"HUD element missing")
    req("function restartCurrentLevel()" in HTML,"current-level restart missing")
    req("loadLevel(id,{recordTransition:false})" in HTML,"restart does not preserve current level")
    req("location.reload()" not in HTML,"restart regressed to page reload / Level 1 reset")
    req("window.__parkingProgressQA" in HTML,"progression QA hook missing")
    req("level_003" not in BUNDLE,"Level 3 authored during Level 2 progression gate")
    print("PASS Level 2 progression structure: instant Level 1 -> automatic Level 2, dynamic HUD, current-level restart, Level 3 locked")
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr);raise SystemExit(1)
