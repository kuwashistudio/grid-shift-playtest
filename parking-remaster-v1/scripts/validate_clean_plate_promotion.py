#!/usr/bin/env python3
"""VP-2F production clean-plate promotion integrity validator."""
from __future__ import annotations
import hashlib, json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
CAND=ROOT/"assets"/"candidates"/"clean_plate_structured_v1.webp"
PROD=ROOT/"assets"/"clean_plate.webp"
QA=ROOT/"VP2E_VISUAL_QA_RESULT.json"
OUT=ROOT/"VP2F_CLEAN_PLATE_INTEGRITY_RESULT.json"
EXPECTED_SHA="5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175"
EXPECTED_BYTES=1652822
EXPECTED_SIZE=(941,1672)

def sha256(p:Path)->str:
    h=hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    qa=json.loads(QA.read_text())
    if qa.get("status")!="PASS_CANDIDATE":
        raise SystemExit("FAIL: VP-2E candidate is not visually approved")
    if qa["source"]["candidate_sha256"]!=EXPECTED_SHA:
        raise SystemExit("FAIL: VP-2E approved SHA changed")
    if not CAND.exists() or not PROD.exists():
        raise SystemExit("FAIL: candidate or production file missing")
    cand_bytes=CAND.read_bytes()
    prod_bytes=PROD.read_bytes()
    cand_sha=sha256(CAND); prod_sha=sha256(PROD)
    cand_size=CAND.stat().st_size; prod_size=PROD.stat().st_size
    if cand_bytes!=prod_bytes:
        raise SystemExit("FAIL: production bytes differ from approved candidate")
    if cand_sha!=EXPECTED_SHA or prod_sha!=EXPECTED_SHA:
        raise SystemExit("FAIL: SHA mismatch")
    if cand_size!=EXPECTED_BYTES or prod_size!=EXPECTED_BYTES:
        raise SystemExit("FAIL: byte-size mismatch")
    with Image.open(CAND) as c, Image.open(PROD) as p:
        c.load(); p.load()
        if c.format!="WEBP" or p.format!="WEBP":
            raise SystemExit("FAIL: not WebP")
        if c.size!=EXPECTED_SIZE or p.size!=EXPECTED_SIZE:
            raise SystemExit("FAIL: dimensions")
        if c.mode!="RGB" or p.mode!="RGB":
            raise SystemExit(f"FAIL: unexpected modes {c.mode} {p.mode}")
        # Decode both fully and compare decoded RGB as a second invariant.
        if c.convert("RGB").tobytes()!=p.convert("RGB").tobytes():
            raise SystemExit("FAIL: decoded RGB mismatch")

    result={
      "gate":"VP_2F_CLEAN_PLATE_PROMOTION_INTEGRITY",
      "status":"PASS",
      "approved_candidate":"assets/candidates/clean_plate_structured_v1.webp",
      "production":"assets/clean_plate.webp",
      "sha256":EXPECTED_SHA,
      "bytes":EXPECTED_BYTES,
      "width":EXPECTED_SIZE[0],
      "height":EXPECTED_SIZE[1],
      "candidate_production_byte_identical":True,
      "decoded_rgb_identical":True,
      "webp_decode":"PASS",
      "vp2e_visual_qa":"PASS_CANDIDATE",
      "runtime_changed":False,
      "level2_changed":False,
      "next_gate":"VP_2G_RUNTIME_CLEAN_PLATE_MIGRATION"
    }
    OUT.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
