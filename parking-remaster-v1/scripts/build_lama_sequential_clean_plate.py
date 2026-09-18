#!/usr/bin/env python3
"""Sequential local LaMa clean-plate candidate.

Removes one car region at a time so each inference sees strong local parking-lot
context. The red tutorial car uses a larger mask that also removes its baked
yellow arrow/glow. Build-time experiment only.
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
OUT=ROOT/".qa"/"lama_sequential"
MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
MODEL_SHA="1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6"
NORMAL_MARGIN=7
CONTEXT=110

def sha256(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for c in iter(lambda:f.read(1024*1024),b""): h.update(c)
    return h.hexdigest()

def clamp_rect(r,w,h):
    x1,y1,x2,y2=[int(round(v)) for v in r]
    return [max(0,x1),max(0,y1),min(w,x2),min(h,y2)]

def expanded(r,m,w,h):
    x1,y1,x2,y2=r
    return clamp_rect([x1-m,y1-m,x2+m,y2+m],w,h)

def make_session():
    so=ort.SessionOptions()
    so.intra_op_num_threads=4
    return ort.InferenceSession(str(MODEL),sess_options=so,providers=["CPUExecutionProvider"])

def infer_local(sess, work_bgr, full_mask, rect):
    h,w=work_bgr.shape[:2]
    x1,y1,x2,y2=rect
    cx=(x1+x2)/2.0; cy=(y1+y2)/2.0
    side=int(max(x2-x1,y2-y1)+2*CONTEXT)
    side=max(side,256)

    sx1=int(round(cx-side/2)); sy1=int(round(cy-side/2))
    sx2=sx1+side; sy2=sy1+side

    # Reflect-pad source so the crop remains square near boundaries.
    pl=max(0,-sx1); pt=max(0,-sy1); pr=max(0,sx2-w); pb=max(0,sy2-h)
    padded=cv2.copyMakeBorder(work_bgr,pt,pb,pl,pr,cv2.BORDER_REFLECT_101)
    padded_mask=cv2.copyMakeBorder(full_mask,pt,pb,pl,pr,cv2.BORDER_CONSTANT,value=0)
    ax1=sx1+pl; ay1=sy1+pt
    crop=padded[ay1:ay1+side,ax1:ax1+side]
    cmask=padded_mask[ay1:ay1+side,ax1:ax1+side]

    rgb=cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)
    image=cv2.resize(rgb,(512,512),interpolation=cv2.INTER_AREA).astype(np.float32)/255.0
    mask512=(cv2.resize(cmask,(512,512),interpolation=cv2.INTER_NEAREST)>127).astype(np.float32)
    image=np.transpose(image,(2,0,1))[None,...]
    mask512=mask512[None,None,...]

    t0=time.perf_counter()
    out=sess.run(None,{"image":image,"mask":mask512})[0]
    elapsed=time.perf_counter()-t0
    arr=out[0].transpose(1,2,0)
    if float(np.nanmax(arr))<=2.0: arr*=255.0
    arr=np.clip(arr,0,255).astype(np.uint8)
    pred=cv2.resize(arr,(side,side),interpolation=cv2.INTER_CUBIC)
    pred=cv2.cvtColor(pred,cv2.COLOR_RGB2BGR)

    # Write only the actual mask into padded work, then unpad.
    pwork=padded.copy()
    local=cmask>0
    target=pwork[ay1:ay1+side,ax1:ax1+side]
    target[local]=pred[local]
    return pwork[pt:pt+h,pl:pl+w], elapsed, {
        "crop_side":side,"crop_xyxy":[sx1,sy1,sx2,sy2],
        "padding":[pl,pt,pr,pb]
    }

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA: raise SystemExit("FAIL master hash")
    if sha256(MODEL)!=MODEL_SHA: raise SystemExit("FAIL model hash")

    level=json.loads(LEVEL.read_text())
    master=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    h,w=master.shape[:2]
    sess=make_session()
    if {i.name for i in sess.get_inputs()}!={"image","mask"}:
        raise SystemExit("FAIL unexpected model inputs")

    work=master.copy()
    union=np.zeros((h,w),np.uint8)
    steps=[]
    total_sec=0.0

    # Process top-to-bottom for repeatability.
    vehicles=sorted(level["vehicles"],key=lambda v:(v["sprite"][1],v["sprite"][0]))
    for v in vehicles:
        if v["id"]=="red_top":
            # Includes baked tutorial arrow/glow around the highlighted first car.
            rect=clamp_rect([330,420,550,790],w,h)
            mask_kind="tutorial_car_plus_arrow_glow"
        else:
            rect=expanded(v["sprite"],NORMAL_MARGIN,w,h)
            mask_kind="car_sprite_rect_expanded"
        x1,y1,x2,y2=rect
        m=np.zeros((h,w),np.uint8); m[y1:y2,x1:x2]=255
        union=np.maximum(union,m)
        work,sec,meta=infer_local(sess,work,m,rect)
        total_sec+=sec
        steps.append({"vehicle":v["id"],"mask_kind":mask_kind,"rect":rect,
                      "seconds":round(sec,3),**meta})

    outside=union==0
    changed=int(np.count_nonzero(np.any(work[outside]!=master[outside],axis=1)))
    out_path=OUT/"clean_plate_lama_sequential.png"
    cv2.imwrite(str(out_path),work)

    # Review sheet.
    mt=cv2.resize(master,(470,836),interpolation=cv2.INTER_AREA)
    wt=cv2.resize(work,(470,836),interpolation=cv2.INTER_AREA)
    sheet=np.hstack([mt,wt])
    cv2.rectangle(sheet,(0,0),(sheet.shape[1]-1,48),(18,18,18),-1)
    cv2.putText(sheet,"MASTER",(12,34),cv2.FONT_HERSHEY_SIMPLEX,0.85,(255,255,255),2,cv2.LINE_AA)
    cv2.putText(sheet,"LAMA_SEQUENTIAL",(482,34),cv2.FONT_HERSHEY_SIMPLEX,0.76,(255,255,255),2,cv2.LINE_AA)
    review=OUT/"sequential_compare.jpg"
    cv2.imwrite(str(review),sheet,[cv2.IMWRITE_JPEG_QUALITY,90])
    cv2.imwrite(str(OUT/"sequential_union_mask.png"),union)

    qa={
      "gate":"VP_LAMA_SEQUENTIAL_CLEAN_PLATE",
      "status":"VISUAL_REVIEW_REQUIRED",
      "source":{"sha256":sha256(MASTER),"width":w,"height":h},
      "model":{"source":"Carve/LaMa-ONNX lama_fp32.onnx","license":"apache-2.0",
               "sha256":sha256(MODEL),"runtime":"onnxruntime CPUExecutionProvider"},
      "method":{"strategy":"sequential local inpainting","context_px":CONTEXT,
                "normal_margin_px":NORMAL_MARGIN,"step_count":len(steps)},
      "steps":steps,
      "mask":{"fraction":round(float(np.count_nonzero(union))/(w*h),6)},
      "total_inference_seconds":round(total_sec,3),
      "hard_checks":{"changed_pixels_outside_union_mask":changed,
                     "unchanged_outside_union_mask":changed==0,
                     "model_hash_match":sha256(MODEL)==MODEL_SHA},
      "output":{"sha256":sha256(out_path),"bytes":out_path.stat().st_size},
      "decision_rule":"Visual QA authoritative. Compare line continuity, asphalt texture, shadow plausibility, removal of all cars and tutorial glow/arrow."
    }
    (OUT/"sequential_qa.json").write_text(json.dumps(qa,indent=2)+"\n")
    print(json.dumps(qa,indent=2))

if __name__=="__main__": main()
