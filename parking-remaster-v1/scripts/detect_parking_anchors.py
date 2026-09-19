#!/usr/bin/env python3
"""VP-2D2 anchor-first parking-marking candidate detector.

This deliberately avoids global Hough line detection. It extracts a small set
of candidate paint endpoints/corners from the exact MASTER, after excluding
cars/tutorial/outer curb zones. The candidate set must be visually reviewed
before any projective family is accepted.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
OUT=ROOT/"PARKING_MARKING_ANCHOR_CANDIDATES_V1.json"
RESULT=ROOT/"VP2D2_ANCHOR_RESULT.json"
QA_DIR=ROOT/"assets"/"qa"
OVERLAY=QA_DIR/"vp2d2_anchor_candidates_overlay.jpg"
REVIEW=QA_DIR/"vp2d2_anchor_candidates_review.jpg"
REVIEW_B64=QA_DIR/"vp2d2_anchor_candidates_review.b64"

MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
LOT=[90,445,850,1310]
INNER=[130,470,815,1275]
TUTORIAL=[330,435,550,800]
CAR_MARGIN=30
MAX_CANDIDATES=30

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def expand(rect,m,w,h):
    x1,y1,x2,y2=[int(round(v)) for v in rect]
    return [max(0,x1-m),max(0,y1-m),min(w,x2+m),min(h,y2+m)]

def skeletonize(mask):
    img=(mask>0).astype(np.uint8)*255
    skel=np.zeros_like(img)
    kernel=cv2.getStructuringElement(cv2.MORPH_CROSS,(3,3))
    while cv2.countNonZero(img)>0:
        opened=cv2.morphologyEx(img,cv2.MORPH_OPEN,kernel)
        temp=cv2.subtract(img,opened)
        eroded=cv2.erode(img,kernel)
        skel=cv2.bitwise_or(skel,temp)
        img=eroded
    return skel

def dist_to_rect(px,py,r):
    x1,y1,x2,y2=r
    dx=max(x1-px,0,px-x2)
    dy=max(y1-py,0,py-y2)
    return math.hypot(dx,dy)

def main():
    QA_DIR.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA:
        raise SystemExit("FAIL MASTER hash")
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    img=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if img is None: raise SystemExit("FAIL MASTER decode")
    h,w=img.shape[:2]
    if [w,h]!=[941,1672]: raise SystemExit("FAIL dimensions")

    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB)
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    H,S,V=cv2.split(hsv); L,_,_=cv2.split(lab)

    usable=np.zeros((h,w),np.uint8)
    ix1,iy1,ix2,iy2=INNER
    usable[iy1:iy2,ix1:ix2]=255

    car_rects={}
    exclude=np.zeros((h,w),np.uint8)
    for v in level["vehicles"]:
        r=expand(v["sprite"],CAR_MARGIN,w,h)
        car_rects[v["id"]]=r
        x1,y1,x2,y2=r
        exclude[y1:y2,x1:x2]=255
    tx1,ty1,tx2,ty2=TUTORIAL
    exclude[ty1:ty2,tx1:tx2]=255
    usable[exclude>0]=0

    # Bright, low/moderate saturation material. Cars are already excluded.
    valid_l=L[usable>0]
    bright_floor=max(105,int(np.percentile(valid_l,63)))
    paint=((usable>0)&(L>=bright_floor)&(S<=105)).astype(np.uint8)*255
    paint=cv2.morphologyEx(paint,cv2.MORPH_OPEN,np.ones((3,3),np.uint8),iterations=1)
    paint=cv2.morphologyEx(paint,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8),iterations=1)

    # Keep only connected paint fragments large enough to plausibly be markings,
    # but discard very large bright surfaces.
    n,labels,stats,cent=cv2.connectedComponentsWithStats(paint,8,cv2.CV_32S)
    keep=np.zeros_like(paint)
    component_meta={}
    for lab_id in range(1,n):
        area=int(stats[lab_id,cv2.CC_STAT_AREA])
        bw=int(stats[lab_id,cv2.CC_STAT_WIDTH]); bh=int(stats[lab_id,cv2.CC_STAT_HEIGHT])
        if area<18 or area>4200: continue
        if max(bw,bh)<8: continue
        keep[labels==lab_id]=255
        component_meta[int(lab_id)]={"area":area,"bbox":[int(stats[lab_id,0]),int(stats[lab_id,1]),bw,bh]}

    skel=skeletonize(keep)
    sk=(skel>0).astype(np.uint8)
    neigh=cv2.filter2D(sk,-1,np.ones((3,3),np.uint8),borderType=cv2.BORDER_CONSTANT)-sk
    endpoint_mask=((sk>0)&(neigh<=1)).astype(np.uint8)*255

    raw=[]
    # Skeleton endpoints are valuable because occluded line fragments terminate at cars.
    ny,nx=np.nonzero(endpoint_mask)
    for x,y in zip(nx.tolist(),ny.tolist()):
        lab_id=int(labels[y,x])
        meta=component_meta.get(lab_id)
        if not meta: continue
        score=2.0+min(meta["area"]/300.0,2.0)
        raw.append({"x":x,"y":y,"source":"skeleton_endpoint","score":score,"component_area":meta["area"]})

    # Shi-Tomasi supplies L/T/intersection-like paint corners that are not skeleton endpoints.
    corners=cv2.goodFeaturesToTrack(gray,maxCorners=80,qualityLevel=0.025,minDistance=18,
                                    mask=keep,blockSize=9,useHarrisDetector=False)
    if corners is not None:
        eig=cv2.cornerMinEigenVal(gray,blockSize=9,ksize=3)
        for c in corners[:,0,:]:
            x,y=int(round(float(c[0]))),int(round(float(c[1])))
            if not (0<=x<w and 0<=y<h) or keep[y,x]==0: continue
            q=float(eig[y,x])
            raw.append({"x":x,"y":y,"source":"shi_tomasi","score":1.0+min(q/1500.0,2.0),"corner_response":round(q,3)})

    # Merge nearby primitives; reward agreement between endpoint/corner sources.
    raw=sorted(raw,key=lambda a:a["score"],reverse=True)
    merged=[]
    for c in raw:
        hit=None
        for m in merged:
            if (c["x"]-m["x"])**2+(c["y"]-m["y"])**2<=16**2:
                hit=m; break
        if hit is None:
            merged.append({"x":c["x"],"y":c["y"],"score":c["score"],"sources":[c["source"]],"members":[c]})
        else:
            total=hit["score"]+c["score"]
            hit["x"]=int(round((hit["x"]*hit["score"]+c["x"]*c["score"])/total))
            hit["y"]=int(round((hit["y"]*hit["score"]+c["y"]*c["score"])/total))
            hit["score"]=total+0.5
            if c["source"] not in hit["sources"]: hit["sources"].append(c["source"])
            hit["members"].append(c)

    # Local geometry / safety scoring. Candidates too close to an excluded car region
    # are allowed only if they are genuine visible paint just outside the exclusion,
    # but are penalized so the review set stays small and interpretable.
    accepted=[]
    for m in merged:
        x,y=m["x"],m["y"]
        if usable[y,x]==0: continue
        x0=max(0,x-13); x1=min(w,x+14); y0=max(0,y-13); y1=min(h,y+14)
        occ=float(np.mean(keep[y0:y1,x0:x1]>0))
        if occ<0.025 or occ>0.72: continue
        car_d=min(dist_to_rect(x,y,r) for r in car_rects.values())
        boundary_d=min(x-ix1,ix2-x,y-iy1,iy2-y)
        if boundary_d<14: continue
        score=float(m["score"])+min(occ*3.0,1.2)+min(car_d/80.0,0.8)
        if len(m["sources"])>1: score+=1.0
        accepted.append({
            "x":int(x),"y":int(y),"score":round(score,4),
            "sources":m["sources"],
            "paint_occupancy_27px":round(occ,4),
            "nearest_car_exclusion_distance_px":round(float(car_d),2),
            "boundary_distance_px":round(float(boundary_d),2)
        })

    # Spatial diversity: no more than one anchor in a 32px radius unless the higher
    # scoring candidate was already selected.
    accepted.sort(key=lambda a:a["score"],reverse=True)
    selected=[]
    for a in accepted:
        if all((a["x"]-b["x"])**2+(a["y"]-b["y"])**2>32**2 for b in selected):
            selected.append(a)
        if len(selected)>=MAX_CANDIDATES: break
    selected=sorted(selected,key=lambda a:(a["y"],a["x"]))
    for i,a in enumerate(selected,1):
        a["candidate_id"]=f"A{i:02d}"

    payload={
        "gate":"VP_2D2_ANCHOR_FIRST_PROJECTIVE_MARKINGS",
        "status":"CANDIDATES_BUILT_VISUAL_REVIEW_REQUIRED",
        "source":{"path":"assets/master.webp","sha256":MASTER_SHA,"width":w,"height":h},
        "method":{
            "representation":"paint endpoints/corners only; no Hough line detection",
            "inner_roi":INNER,
            "car_exclusion_margin_px":CAR_MARGIN,
            "tutorial_rect":TUTORIAL,
            "paint_rule":{"Lab_L_floor":bright_floor,"HSV_S_max":105},
            "endpoint":"morphological skeleton endpoint",
            "corner":"Shi-Tomasi inside retained paint components",
            "candidate_cap":MAX_CANDIDATES
        },
        "candidate_count":len(selected),
        "candidates":selected,
        "rule":"Candidate IDs must be directly reviewed on MASTER. Only visually confirmed parking-paint anchors may enter projective fitting."
    }
    OUT.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")

    overlay=img.copy()
    # Dim outside the working inner ROI slightly for review clarity.
    shade=np.zeros_like(overlay)
    shade[:]=0
    dim=overlay.copy()
    cv2.rectangle(dim,(0,0),(w-1,h-1),(0,0,0),-1)
    alpha=np.full((h,w),0.22,np.float32)
    alpha[iy1:iy2,ix1:ix2]=0.0
    overlay=(overlay.astype(np.float32)*(1-alpha[...,None])).astype(np.uint8)

    # Exclusions in thin red; candidate paint mask in cyan tint.
    for r in car_rects.values():
        x1,y1,x2,y2=r
        cv2.rectangle(overlay,(x1,y1),(x2,y2),(60,60,220),1)
    cv2.rectangle(overlay,(tx1,ty1),(tx2,ty2),(60,60,220),1)
    contours,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(overlay,contours,-1,(255,220,0),1,cv2.LINE_AA)

    for a in selected:
        x,y=a["x"],a["y"]
        cv2.circle(overlay,(x,y),9,(0,0,255),2,cv2.LINE_AA)
        cv2.circle(overlay,(x,y),3,(255,255,255),-1,cv2.LINE_AA)
        cv2.putText(overlay,a["candidate_id"],(x+9,y-8),cv2.FONT_HERSHEY_SIMPLEX,.52,(10,10,10),3,cv2.LINE_AA)
        cv2.putText(overlay,a["candidate_id"],(x+9,y-8),cv2.FONT_HERSHEY_SIMPLEX,.52,(255,255,255),1,cv2.LINE_AA)

    cv2.rectangle(overlay,(0,0),(w-1,78),(18,18,18),-1)
    cv2.putText(overlay,f"VP-2D2 ANCHOR CANDIDATES n={len(selected)}",(14,50),cv2.FONT_HERSHEY_SIMPLEX,.82,(255,255,255),2,cv2.LINE_AA)
    cv2.imwrite(str(OVERLAY),overlay,[cv2.IMWRITE_JPEG_QUALITY,91])

    # Review crop concentrates on the parking lot and keeps IDs legible.
    lx1,ly1,lx2,ly2=LOT
    crop=overlay[ly1:ly2,lx1:lx2]
    rw=420
    rh=max(1,int(round(crop.shape[0]*rw/crop.shape[1])))
    review=cv2.resize(crop,(rw,rh),interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(REVIEW),review,[cv2.IMWRITE_JPEG_QUALITY,62])
    b64=base64.b64encode(REVIEW.read_bytes()).decode("ascii")
    REVIEW_B64.write_text("\n".join(b64[i:i+76] for i in range(0,len(b64),76))+"\n",encoding="ascii")

    result={
        "gate":"VP_2D2_ANCHOR_FIRST_PROJECTIVE_MARKINGS",
        "status":"PASS_MACHINE_CANDIDATES_VISUAL_REVIEW_REQUIRED",
        "candidate_count":len(selected),
        "overlay":{"path":str(OVERLAY.relative_to(ROOT)),"sha256":sha256(OVERLAY),"bytes":OVERLAY.stat().st_size},
        "review":{"path":str(REVIEW.relative_to(ROOT)),"sha256":sha256(REVIEW),"bytes":REVIEW.stat().st_size,"base64_path":str(REVIEW_B64.relative_to(ROOT))},
        "next":"Directly inspect numbered anchors on MASTER. Persist only visually valid parking-paint anchor IDs, then fit projective families from that validated subset."
    }
    RESULT.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
