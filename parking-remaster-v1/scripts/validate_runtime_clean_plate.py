#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/"index.html"
LEVEL=ROOT/"levels"/"level_001.json"
LOGIC=ROOT/"game_logic.js"
CLEAN=ROOT/"assets"/"clean_plate.webp"
MANIFEST=ROOT/"VP_CLEAN_PLATE_PRODUCTION_RESULT.json"

EXPECTED_CLEAN_SHA="5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175"
EXPECTED_LOGIC_BLOB="15cca8544b9ac624a0916127ada292601507f588"
EXPECTED_LEVEL_BLOB="75654d67cbdbbc1abe3c2be89ff4174a29d19141"

def req(x,msg):
    if not x: raise AssertionError(msg)

def sha256(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def git_blob(p):
    data=p.read_bytes()
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()

def main():
    html=HTML.read_text(encoding="utf-8")
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
    req(manifest["status"]=="PASS_LOCKED","production clean plate not locked")
    req(sha256(CLEAN)==EXPECTED_CLEAN_SHA,"production clean plate SHA changed")
    req(manifest["sha256"]==EXPECTED_CLEAN_SHA,"manifest clean plate SHA changed")
    req('href="assets/clean_plate.webp"' in html,"clean plate preload missing")
    req('src="assets/clean_plate.webp"' in html,"clean plate board image missing")
    req('src="assets/master.webp"' not in html,"runtime still renders car-baked MASTER")
    for stale in ("assets/patches/","tutorial_cover.webp","function patch(","className='patch'",".patch{"):
        req(stale not in html,f"obsolete reveal dependency remains: {stale}")
    req("if(c.spriteEl)return c.spriteEl" in html,"sprite elements are not persistent/idempotent")
    req("im.src=`assets/sprites/${c.id}.webp`" in html,"runtime sprite path missing")
    req("cars.set(c.id,c);sprite(c)" in html,"production sprites are not mounted from Level Data")
    req("const s=c.spriteEl||sprite(c)" in html,"movement does not reuse persistent sprite element")
    req("s.remove();c.spriteEl=null" in html,"exited sprite cleanup missing")
    req("function mountFirstFocusHint()" in html,"dynamic first-focus hint builder missing")
    req("document.querySelector('#hintPulse')?.remove()" in html,"first-focus hint cleanup missing")
    ids=[v["id"] for v in level["vehicles"]]
    req(len(ids)==10,"unexpected Level 1 vehicle count")
    missing=[x for x in ids if not (ROOT/"assets"/"sprites"/f"{x}.webp").exists()]
    req(not missing,"missing production sprites: "+",".join(missing))
    req(git_blob(LOGIC)==EXPECTED_LOGIC_BLOB,"game_logic.js changed during visual/progression migration")
    req(git_blob(LEVEL)==EXPECTED_LEVEL_BLOB,"level_001.json changed during progression migration")
    print("PASS clean-plate runtime structure: locked background + persistent sprites; Level 1 logic/data unchanged")
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr);raise SystemExit(1)
