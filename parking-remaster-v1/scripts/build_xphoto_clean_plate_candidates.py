#!/usr/bin/env python3
"""Model-free clean-plate experiment using OpenCV xphoto FSR.

This script intentionally does not promote assets. It writes QA-only outputs
for visual comparison in GitHub Actions artifacts.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets" / "master.webp"
LEVEL = ROOT / "levels" / "level_001.json"
OUT = ROOT / ".qa" / "xphoto"
QA = OUT / "xphoto_qa.json"
MARGIN = 3
ROI_MARGIN = 56


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def expand(rect, margin, width, height):
    x1, y1, x2, y2 = [int(round(v)) for v in rect]
    return [
        max(0, x1 - margin),
        max(0, y1 - margin),
        min(width, x2 + margin),
        min(height, y2 + margin),
    ]


def run_fsr(master, removal_mask, algorithm):
    ys, xs = np.where(removal_mask > 0)
    if not len(xs):
        raise ValueError("empty removal mask")
    h, w = master.shape[:2]
    x1=max(0,int(xs.min())-ROI_MARGIN); x2=min(w,int(xs.max())+1+ROI_MARGIN)
    y1=max(0,int(ys.min())-ROI_MARGIN); y2=min(h,int(ys.max())+1+ROI_MARGIN)

    src = master[y1:y2, x1:x2].copy()
    rem = removal_mask[y1:y2, x1:x2]
    valid = np.where(rem == 0, 255, 0).astype(np.uint8)

    distorted = np.zeros_like(src)
    src.copyTo if False else None
    distorted[valid > 0] = src[valid > 0]

    start=time.perf_counter()
    recon = np.empty_like(src)
    cv2.xphoto.inpaint(distorted, valid, recon, algorithm)
    elapsed=time.perf_counter()-start

    # Hard invariant: every originally valid pixel remains byte-identical.
    recon[valid > 0] = src[valid > 0]

    full=master.copy()
    roi=full[y1:y2,x1:x2]
    roi[rem > 0]=recon[rem > 0]
    return full, elapsed, [x1,y1,x2,y2]


def contact_sheet(master, fast, best, removal_mask):
    panels=[]
    for label, image in [("MASTER",master),("FSR_FAST",fast),("FSR_BEST",best)]:
        p=image.copy()
        cv2.rectangle(p,(0,0),(p.shape[1]-1,72),(18,18,18),-1)
        cv2.putText(p,label,(18,50),cv2.FONT_HERSHEY_SIMPLEX,1.35,(255,255,255),3,cv2.LINE_AA)
        panels.append(p)
    sheet=np.hstack(panels)
    cv2.imwrite(str(OUT/"xphoto_compare.jpg"),sheet,[cv2.IMWRITE_JPEG_QUALITY,92])

    overlay=master.copy()
    red=np.zeros_like(master); red[:,:,2]=255
    alpha=(removal_mask.astype(np.float32)/255.0*0.55)[:,:,None]
    overlay=(overlay.astype(np.float32)*(1-alpha)+red.astype(np.float32)*alpha).astype(np.uint8)
    cv2.imwrite(str(OUT/"removal_mask_overlay.jpg"),overlay,[cv2.IMWRITE_JPEG_QUALITY,92])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    master=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if master is None:
        raise SystemExit("FAIL could not decode master.webp")
    h,w=master.shape[:2]
    if [w,h] != [level["board"]["width"],level["board"]["height"]]:
        raise SystemExit("FAIL master/board dimensions differ")
    if not hasattr(cv2,"xphoto"):
        raise SystemExit("FAIL OpenCV xphoto module unavailable")

    removal=np.zeros((h,w),dtype=np.uint8)
    rects={}
    for v in level["vehicles"]:
        r=expand(v["sprite"],MARGIN,w,h)
        rects[v["id"]]=r
        x1,y1,x2,y2=r
        removal[y1:y2,x1:x2]=255

    fast, fast_sec, roi_fast=run_fsr(master,removal,cv2.xphoto.INPAINT_FSR_FAST)
    best, best_sec, roi_best=run_fsr(master,removal,cv2.xphoto.INPAINT_FSR_BEST)

    fast_path=OUT/"clean_plate_fsr_fast.png"
    best_path=OUT/"clean_plate_fsr_best.png"
    mask_path=OUT/"removal_mask_rects.png"
    cv2.imwrite(str(fast_path),fast)
    cv2.imwrite(str(best_path),best)
    cv2.imwrite(str(mask_path),removal)
    contact_sheet(master,fast,best,removal)

    outside=removal==0
    fast_out=int(np.count_nonzero(np.any(fast[outside]!=master[outside],axis=1)))
    best_out=int(np.count_nonzero(np.any(best[outside]!=master[outside],axis=1)))

    qa={
      "gate":"VP_XPHOTO_CLEAN_PLATE_EXPERIMENT",
      "status":"VISUAL_REVIEW_REQUIRED",
      "source":{"sha256":sha256(MASTER),"width":w,"height":h},
      "mask":{
        "type":"canonical sprite rectangles expanded by fixed margin",
        "margin_px":MARGIN,
        "rects":rects,
        "fraction":round(float(np.count_nonzero(removal))/(w*h),6)
      },
      "roi":roi_fast,
      "algorithms":{
        "fsr_fast":{"seconds":round(fast_sec,3),"sha256":sha256(fast_path),"bytes":fast_path.stat().st_size},
        "fsr_best":{"seconds":round(best_sec,3),"sha256":sha256(best_path),"bytes":best_path.stat().st_size}
      },
      "hard_checks":{
        "fast_changed_pixels_outside_mask":fast_out,
        "best_changed_pixels_outside_mask":best_out,
        "unchanged_outside_mask":fast_out==0 and best_out==0,
        "all_10_sprite_rects_masked":len(rects)==10
      },
      "decision_rule":"Visual QA decides promotion. If FSR cannot reconstruct the parking lot cleanly, retire model-free inpainting and test Apache-2.0 LaMa clean-plate-only."
    }
    QA.write_text(json.dumps(qa,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(qa,indent=2))


if __name__=="__main__":
    main()
