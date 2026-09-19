#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
QA=(ROOT/"iphone_qa.js").read_text(encoding="utf-8")

def req(x,msg):
    if not x: raise AssertionError(msg)

def main():
    req('<script src="iphone_qa.js"></script>' in HTML,"iPhone QA script include missing")
    req("sfx:{engine:0,horn:0,win:0}" in HTML,"SFX evidence counters missing")
    for token in ("markSfx('engine')","markSfx('horn')","markSfx('win')"):
        req(token in HTML,f"missing {token}")
    req("params.get('qa')!=='iphone'" in QA,"QA mode is not opt-in")
    req("if(params.get('qa')!=='iphone')return;" in QA,"QA script does not exit immediately in normal mode")
    req("controls_ready_from_navigation_ms" in QA,"navigation-to-controls metric missing")
    req("controls_ready_target_ms:1000" in QA,"1s target missing")
    req("window.__parkingIPhoneQA" in QA,"QA snapshot hook missing")
    req("navigator.clipboard.writeText" in QA,"evidence copy path missing")
    req("physical_checks" in QA,"physical recording checklist missing")
    req("fresh_player" not in QA.lower(),"fresh-player observation must not be inferred by runtime")
    req('id="iphoneQaPanel"' not in HTML,"QA panel must not exist in normal HTML markup")
    print("PASS target-iPhone QA harness: opt-in only, timing/audio/SFX evidence exposed, normal runtime markup unchanged")
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr);raise SystemExit(1)
