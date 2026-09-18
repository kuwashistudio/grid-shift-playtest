#!/usr/bin/env python3
"""LaMa ONNX clean-plate candidate for Parking Remaster.

Build-time experiment only. The model is never shipped with the game.
"""
from __future__ import annotations
import hashlib, json, time
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
MODEL=ROOT/".qa"/"models"/"lama_fp32.onnx"
OUT=ROOT/".qa"/"lama_onnx"
EXPECTED_MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
EXPECTED_MODEL_SHA="1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6"
MARGIN=3

def sha256(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for c in iter(lambda:f.read(1024*1024),b""): h.update(c)
    return h.hexdigest()

def expand(rect,m,w,h):
    x1,y1,x2,y2=[int(round(v)) for v in rect]
    return [max(0,x1-m),max(0,y1-m),min(w,x2+m),min(h,y2+m)]

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=EXPECTED_MASTER_SHA: raise SystemExit("FAIL master hash")
    if sha256(MODEL)!=EXPECTED_MODEL_SHA: raise SystemExit("FAIL model hash")

    level=json.loads(LEVEL.read_text())
    bgr=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    h,w=bgr.shape[:2]
    mask=np.zeros((h,w),np.uint8)
    rects={}
    for v in level["vehicles"]:
        r=expand(v["sprite"],MARGIN,w,h); rects[v["id"]]=r
        x1,y1,x2,y2=r; mask[y1:y2,x1:x2]=255

    ys,xs=np.where(mask>0)
    y1=max(0,int(ys.min())-56); y2=min(h,int(ys.max())+1+56)
    # Full image width gives road/lot context and avoids arbitrary horizontal crop.
    x1,x2=0,w
    roi=bgr[y1:y2,x1:x2].copy()
    roi_mask=mask[y1:y2,x1:x2].copy()

    # Pad to an exact square before 512 resize: no aspect-ratio distortion.
    rh,rw=roi.shape[:2]
    side=max(rh,rw)
    top=(side-rh)//2; bottom=side-rh-top
    left=(side-rw)//2; right=side-rw-left
    roi_rgb=cv2.cvtColor(roi,cv2.COLOR_BGR2RGB)
    sq=cv2.copyMakeBorder(roi_rgb,top,bottom,left,right,cv2.BORDER_REFLECT_101)
    sqm=cv2.copyMakeBorder(roi_mask,top,bottom,left,right,cv2.BORDER_CONSTANT,value=0)

    image=cv2.resize(sq,(512,512),interpolation=cv2.INTER_AREA).astype(np.float32)/255.0
    m=cv2.resize(sqm,(512,512),interpolation=cv2.INTER_NEAREST)
    m=(m>127).astype(np.float32)
    image=np.transpose(image,(2,0,1))[None,...]
    m=m[None,None,...]

    so=ort.SessionOptions()
    so.intra_op_num_threads=4
    sess=ort.InferenceSession(str(MODEL),sess_options=so,providers=["CPUExecutionProvider"])
    inputs={i.name:i for i in sess.get_inputs()}
    if set(inputs)!={"image","mask"}:
        raise SystemExit("FAIL unexpected model inputs: "+str(list(inputs)))
    t0=time.perf_counter()
    out=sess.run(None,{"image":image,"mask":m})[0]
    sec=time.perf_counter()-t0
    arr=out[0].transpose(1,2,0)
    if float(np.nanmax(arr))<=2.0: arr=arr*255.0
    arr=np.clip(arr,0,255).astype(np.uint8)

    pred_sq=cv2.resize(arr,(side,side),interpolation=cv2.INTER_CUBIC)
    pred=pred_sq[top:top+rh,left:left+rw]
    pred_bgr=cv2.cvtColor(pred,cv2.COLOR_RGB2BGR)

    final=bgr.copy()
    target=final[y1:y2,x1:x2]
    target[roi_mask>0]=pred_bgr[roi_mask>0]

    outside=mask==0
    changed=int(np.count_nonzero(np.any(final[outside]!=bgr[outside],axis=1)))
    out_path=OUT/"clean_plate_lama_onnx.png"
    cv2.imwrite(str(out_path),final)

    # Side-by-side visual review.
    master_thumb=cv2.resize(bgr,(470,836),interpolation=cv2.INTER_AREA)
    final_thumb=cv2.resize(final,(470,836),interpolation=cv2.INTER_AREA)
    sheet=np.hstack([master_thumb,final_thumb])
    cv2.rectangle(sheet,(0,0),(sheet.shape[1]-1,48),(18,18,18),-1)
    cv2.putText(sheet,"MASTER",(12,34),cv2.FONT_HERSHEY_SIMPLEX,0.85,(255,255,255),2,cv2.LINE_AA)
    cv2.putText(sheet,"LAMA_ONNX",(482,34),cv2.FONT_HERSHEY_SIMPLEX,0.85,(255,255,255),2,cv2.LINE_AA)
    review=OUT/"lama_compare.jpg"
    cv2.imwrite(str(review),sheet,[cv2.IMWRITE_JPEG_QUALITY,90])

    qa={
      "gate":"VP_LAMA_ONNX_CLEAN_PLATE_EXPERIMENT",
      "status":"VISUAL_REVIEW_REQUIRED",
      "source":{"sha256":sha256(MASTER),"width":w,"height":h},
      "model":{
        "source":"Carve/LaMa-ONNX lama_fp32.onnx",
        "license":"apache-2.0",
        "sha256":sha256(MODEL),
        "input_shape":[1,3,512,512],
        "mask_shape":[1,1,512,512],
        "runtime":"onnxruntime CPUExecutionProvider"
      },
      "mask":{"type":"sprite rectangles + fixed margin","margin_px":MARGIN,
              "fraction":round(float(np.count_nonzero(mask))/(w*h),6),"rects":rects},
      "roi":{"xyxy":[x1,y1,x2,y2],"raw_wh":[rw,rh],"square_side":side,
             "padding":[left,top,right,bottom],"aspect_distortion":False},
      "inference_seconds":round(sec,3),
      "hard_checks":{"changed_pixels_outside_mask":changed,
                     "unchanged_outside_mask":changed==0,
                     "model_hash_match":sha256(MODEL)==EXPECTED_MODEL_SHA},
      "output":{"sha256":sha256(out_path),"bytes":out_path.stat().st_size},
      "decision_rule":"Visual QA is authoritative. Reject if parking lines, asphalt, walls, shadows, EXIT geometry or perspective are visibly implausible."
    }
    (OUT/"lama_qa.json").write_text(json.dumps(qa,indent=2)+"\n")
    print(json.dumps(qa,indent=2))

if __name__=="__main__": main()
