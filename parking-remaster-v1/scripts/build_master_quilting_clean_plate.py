#!/usr/bin/env python3
"""MASTER-only Image Quilting clean-plate experiment.

Uses bmquilting pinned to a reviewed MIT commit. The only texture source is
the approved Parking Remaster MASTER itself. All car/shadow/tutorial regions
are marked invalid both in the target mask and in the source texture, so no
vehicle pixels can be selected as replacement patches.

QA experiment only; never promotes production assets automatically.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import cv2
import numpy as np

from bmquilting.circular import fill_cphl, CircularPatchingConfig
from bmquilting.utils import set_invalid_texture_area

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
OUT=ROOT/".qa"/"quilting"

MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"

# Bounded repair research showed shadows must be included, not only car bodies.
MARGIN=26
TUTORIAL_RECT=[340,445,545,790]
# Work only in the lot ROI; unchanged outside is copied from MASTER.
ROI=[50,420,890,1360]
SEED=20260919


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def expand(rect,margin,w,h):
    x1,y1,x2,y2=[int(round(v)) for v in rect]
    return [max(0,x1-margin),max(0,y1-margin),min(w,x2+margin),min(h,y2+margin)]


def build_keep_mask(level,w,h):
    keep=np.full((h,w),255,np.uint8)
    rects={}
    for v in level["vehicles"]:
        r=expand(v["sprite"],MARGIN,w,h)
        rects[v["id"]]=r
        x1,y1,x2,y2=r
        keep[y1:y2,x1:x2]=0
    x1,y1,x2,y2=TUTORIAL_RECT
    keep[y1:y2,x1:x2]=0
    return keep,rects


def run_candidate(target,keep,source,config,name):
    t0=time.perf_counter()
    out,seams=fill_cphl(
        target_tex=target,
        mask=keep,
        src_texs=[source],
        patching_config=config,
        seed=SEED,
    )
    sec=time.perf_counter()-t0
    # Hard invariant: preserve every non-hole pixel exactly.
    out[keep>0]=target[keep>0]
    path=OUT/f"clean_plate_quilt_{name}.png"
    seam_path=OUT/f"seams_{name}.png"
    cv2.imwrite(str(path),out)
    cv2.imwrite(str(seam_path),seams)
    return out,path,seam_path,sec


def make_review(master,a,b):
    panels=[]
    for label,img in [("MASTER",master),("QUILT_SEAMS",a),("QUILT_FEATHER",b)]:
        t=cv2.resize(img,(314,558),interpolation=cv2.INTER_AREA)
        cv2.rectangle(t,(0,0),(t.shape[1]-1,42),(18,18,18),-1)
        cv2.putText(t,label,(8,29),cv2.FONT_HERSHEY_SIMPLEX,.58,(255,255,255),2,cv2.LINE_AA)
        panels.append(t)
    cv2.imwrite(str(OUT/"quilting_compare.jpg"),np.hstack(panels),[cv2.IMWRITE_JPEG_QUALITY,91])


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA:
        raise SystemExit("FAIL master hash")
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    master=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if master is None:
        raise SystemExit("FAIL master decode")
    h,w=master.shape[:2]

    keep_full,rects=build_keep_mask(level,w,h)
    rx1,ry1,rx2,ry2=ROI
    target=master[ry1:ry2,rx1:rx2].copy()
    keep=keep_full[ry1:ry2,rx1:rx2].copy()

    # No replacement patch may overlap a car/tutorial hole.
    source=set_invalid_texture_area(target,keep)

    # Structured white parking lines: minimum-error seams.
    seams_cfg=CircularPatchingConfig.with_seams(
        diameter=49,overlap_ratio=.5,tolerance=.05,spacing_factor=1.0,blend=True
    )
    # Stochastic asphalt: smooth feathered overlap.
    feather_cfg=CircularPatchingConfig.with_feathering(
        diameter=49,overlap_ratio=.5,tolerance=.05,spacing_factor=1.0
    )

    seams_roi,seams_path,seams_map,seams_sec=run_candidate(target,keep,source,seams_cfg,"seams")
    feather_roi,feather_path,feather_map,feather_sec=run_candidate(target,keep,source,feather_cfg,"feather")

    seams_full=master.copy(); seams_full[ry1:ry2,rx1:rx2]=seams_roi
    feather_full=master.copy(); feather_full[ry1:ry2,rx1:rx2]=feather_roi
    seams_full[keep_full>0]=master[keep_full>0]
    feather_full[keep_full>0]=master[keep_full>0]

    full_seams=OUT/"clean_plate_quilt_seams_full.png"
    full_feather=OUT/"clean_plate_quilt_feather_full.png"
    cv2.imwrite(str(full_seams),seams_full)
    cv2.imwrite(str(full_feather),feather_full)
    cv2.imwrite(str(OUT/"quilting_keep_mask.png"),keep_full)
    make_review(master,seams_full,feather_full)

    outside=keep_full>0
    changed_seams=int(np.count_nonzero(np.any(seams_full[outside]!=master[outside],axis=1)))
    changed_feather=int(np.count_nonzero(np.any(feather_full[outside]!=master[outside],axis=1)))

    qa={
      "gate":"VP_MASTER_ONLY_IMAGE_QUILTING",
      "status":"VISUAL_REVIEW_REQUIRED",
      "source":{"sha256":sha256(MASTER),"width":w,"height":h},
      "library":{
        "name":"bmquilting",
        "version":"2.1.0",
        "pinned_commit":"9fd5f97bef7472580e68fdadc15822f7ac896203",
        "license":"MIT",
      },
      "method":{
        "source":"approved MASTER lot ROI only",
        "source_holes_invalidated":True,
        "margin_px":MARGIN,
        "tutorial_rect":TUTORIAL_RECT,
        "roi":ROI,
        "seed":SEED,
        "diameter":49,
        "overlap_ratio":0.5,
        "tolerance":0.05,
      },
      "mask":{
        "fill_fraction":round(float(np.count_nonzero(keep_full==0))/(w*h),6),
        "rects":rects,
      },
      "timing_seconds":{
        "seams":round(seams_sec,3),
        "feather":round(feather_sec,3),
      },
      "hard_checks":{
        "seams_changed_pixels_outside_mask":changed_seams,
        "feather_changed_pixels_outside_mask":changed_feather,
        "unchanged_outside_mask":changed_seams==0 and changed_feather==0,
        "external_image_source_used":False,
        "ai_model_used":False,
      },
      "outputs":{
        "seams":{"sha256":sha256(full_seams),"bytes":full_seams.stat().st_size},
        "feather":{"sha256":sha256(full_feather),"bytes":full_feather.stat().st_size},
        "review":"quilting_compare.jpg",
      },
      "decision_rule":"Direct visual QA controls. Reject if repeated tiles, misplaced parking lines, obvious seams, vehicle-colored patches, or perspective/lighting mismatch are visible."
    }
    (OUT/"quilting_qa.json").write_text(json.dumps(qa,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(qa,indent=2))


if __name__=="__main__":
    main()
