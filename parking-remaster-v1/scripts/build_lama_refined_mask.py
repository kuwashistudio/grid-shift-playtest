#!/usr/bin/env python3
"""Refined-mask LaMa clean-plate candidate.

Uses the committed GrabCut-derived car/shadow mask instead of large rectangles,
then adds only the baked tutorial arrow/glow region.
"""
from __future__ import annotations
import hashlib,json,time
from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
BASE_MASK=ROOT/"assets"/"candidates"/"car_removal_mask.png"
MODEL=ROOT/".qa"/"models"/"lama_fp32.onnx"
OUT=ROOT/".qa"/"lama_refined_mask"
MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
MODEL_SHA="1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6"
EXTRA_DILATE=5
# Does not overlap the baked EXIT label; removes first-car arrow/glow and halo.
TUTORIAL_RECT=[340,445,545,790]

def sha256(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for c in iter(lambda:f.read(1024*1024),b""): h.update(c)
 return h.hexdigest()

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 if sha256(MASTER)!=MASTER_SHA: raise SystemExit("FAIL master hash")
 if sha256(MODEL)!=MODEL_SHA: raise SystemExit("FAIL model hash")
 bgr=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
 base=cv2.imread(str(BASE_MASK),cv2.IMREAD_GRAYSCALE)
 if bgr is None or base is None: raise SystemExit("FAIL source decode")
 h,w=bgr.shape[:2]
 if base.shape!=(h,w): raise SystemExit("FAIL mask dimensions")

 kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(EXTRA_DILATE*2+1,EXTRA_DILATE*2+1))
 mask=cv2.dilate(np.where(base>0,255,0).astype(np.uint8),kernel,iterations=1)
 tx1,ty1,tx2,ty2=TUTORIAL_RECT
 mask[ty1:ty2,tx1:tx2]=255
 cv2.imwrite(str(OUT/"refined_mask.png"),mask)

 ys,xs=np.where(mask>0)
 y1=max(0,int(ys.min())-56); y2=min(h,int(ys.max())+1+56)
 x1,x2=0,w
 roi=bgr[y1:y2,x1:x2]
 rm=mask[y1:y2,x1:x2]
 rh,rw=roi.shape[:2]
 side=max(rh,rw)
 top=(side-rh)//2; bottom=side-rh-top
 left=(side-rw)//2; right=side-rw-left
 rgb=cv2.cvtColor(roi,cv2.COLOR_BGR2RGB)
 sq=cv2.copyMakeBorder(rgb,top,bottom,left,right,cv2.BORDER_REFLECT_101)
 sqm=cv2.copyMakeBorder(rm,top,bottom,left,right,cv2.BORDER_CONSTANT,value=0)

 image=cv2.resize(sq,(512,512),interpolation=cv2.INTER_AREA).astype(np.float32)/255.0
 m=(cv2.resize(sqm,(512,512),interpolation=cv2.INTER_NEAREST)>127).astype(np.float32)
 image=np.transpose(image,(2,0,1))[None,...]
 m=m[None,None,...]

 so=ort.SessionOptions(); so.intra_op_num_threads=4
 sess=ort.InferenceSession(str(MODEL),sess_options=so,providers=["CPUExecutionProvider"])
 t0=time.perf_counter()
 out=sess.run(None,{"image":image,"mask":m})[0]
 sec=time.perf_counter()-t0
 arr=out[0].transpose(1,2,0)
 if float(np.nanmax(arr))<=2.0: arr*=255.0
 arr=np.clip(arr,0,255).astype(np.uint8)
 pred_sq=cv2.resize(arr,(side,side),interpolation=cv2.INTER_CUBIC)
 pred=pred_sq[top:top+rh,left:left+rw]
 pred_bgr=cv2.cvtColor(pred,cv2.COLOR_RGB2BGR)

 final=bgr.copy()
 target=final[y1:y2,x1:x2]
 target[rm>0]=pred_bgr[rm>0]
 outside=mask==0
 changed=int(np.count_nonzero(np.any(final[outside]!=bgr[outside],axis=1)))

 out_path=OUT/"clean_plate_lama_refined_mask.png"
 cv2.imwrite(str(out_path),final)
 mt=cv2.resize(bgr,(470,836),interpolation=cv2.INTER_AREA)
 ft=cv2.resize(final,(470,836),interpolation=cv2.INTER_AREA)
 sheet=np.hstack([mt,ft])
 cv2.rectangle(sheet,(0,0),(sheet.shape[1]-1,48),(18,18,18),-1)
 cv2.putText(sheet,"MASTER",(12,34),cv2.FONT_HERSHEY_SIMPLEX,0.85,(255,255,255),2,cv2.LINE_AA)
 cv2.putText(sheet,"LAMA_REFINED_MASK",(482,34),cv2.FONT_HERSHEY_SIMPLEX,0.68,(255,255,255),2,cv2.LINE_AA)
 cv2.imwrite(str(OUT/"refined_compare.jpg"),sheet,[cv2.IMWRITE_JPEG_QUALITY,90])

 qa={
  "gate":"VP_LAMA_REFINED_MASK",
  "status":"VISUAL_REVIEW_REQUIRED",
  "source":{"sha256":sha256(MASTER),"base_mask_sha256":sha256(BASE_MASK)},
  "model":{"license":"apache-2.0","sha256":sha256(MODEL)},
  "mask":{"base":"GrabCut alpha union + prior 7px dilation",
          "extra_dilate_px":EXTRA_DILATE,"tutorial_rect":TUTORIAL_RECT,
          "fraction":round(float(np.count_nonzero(mask))/(w*h),6)},
  "inference_seconds":round(sec,3),
  "hard_checks":{"changed_pixels_outside_mask":changed,
                 "unchanged_outside_mask":changed==0,
                 "model_hash_match":sha256(MODEL)==MODEL_SHA},
  "output":{"sha256":sha256(out_path),"bytes":out_path.stat().st_size},
  "decision_rule":"Visual QA authoritative. Reject if cars, tutorial glow, block artifacts, parking-line breaks or implausible texture remain."
 }
 (OUT/"refined_qa.json").write_text(json.dumps(qa,indent=2)+"\n")
 print(json.dumps(qa,indent=2))

if __name__=="__main__": main()
