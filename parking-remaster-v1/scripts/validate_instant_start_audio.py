#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")

def req(cond,msg):
    if not cond:
        raise AssertionError(msg)

def main():
    req('src="assets/clean_plate.webp"' in HTML,"production clean plate background missing")
    req('href="assets/clean_plate.webp"' in HTML,"production clean plate preload missing")
    req('assets/patches/' not in HTML and 'tutorial_cover.webp' not in HTML,"obsolete patch/reveal dependency present")
    req("defs.forEach(add);startup.controlsReadyMs=performance.now()" in HTML,"controls-ready marker missing")
    req("startup.firstPlayerActionMs" in HTML,"first player action measurement missing")
    forbidden=['id="start"','id="menu"','id="mode-select"','id="modeSelect"','class="splash"','class="main-menu"','Tap to start','PLAY</button>']
    for token in forbidden:
        req(token not in HTML,f"pre-game gate detected: {token}")
    req("ensureAudioOnGesture();tap(c)" in HTML,"first car tap does not combine audio unlock + gameplay")
    req("audioCtx.state==='interrupted'" in HTML,"interrupted AudioContext state not handled")
    req("visibilitychange" in HTML and "pagehide" in HTML and "pageshow" in HTML,"focus/visibility audio recovery hooks missing")
    req("createDynamicsCompressor" in HTML,"master compressor missing")
    req("audioResetNeeded" in HTML,"audio reset state missing")
    req("window.__parkingAudioQA" in HTML,"audio QA hook missing")
    req('id="sound"' in HTML,"mute button missing")
    req("audioEnabled=!audioEnabled" in HTML,"mute toggle behavior missing")
    req("audioCtx.suspend()" in HTML,"audio suspension missing")
    print("PASS instant-start/audio gate: no pre-game screen; first car tap is gameplay+audio unlock; iOS interruption recovery present")
    return 0

if __name__=="__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"FAIL {e}",file=sys.stderr)
        raise SystemExit(1)
