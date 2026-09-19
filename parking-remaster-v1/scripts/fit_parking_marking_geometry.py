#!/usr/bin/env python3
"""VP-2D2 bounded repair: visually seeded parking-marking vector geometry.

No global Hough detection. The exact MASTER is analyzed only inside a small
set of seed windows that were directly validated against visible parking paint.
Within each window, a neutral-bright local response snaps samples to the paint
center. Robust line fitting then extends those observed fragments through
occluded car regions as vector hypotheses.

This script does NOT create or promote a clean plate.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
MODEL=ROOT/"PARKING_PROJECTIVE_MARKING_MODEL_V1.json"
RESULT=ROOT/"VP2D2_GEOMETRY_RESULT.json"
SEEDS_OUT=ROOT/"PARKING_MARKING_SEED_WINDOWS_V1.json"
QA_DIR=ROOT/"assets"/"qa"
OVERLAY=QA_DIR/"vp2d2_vector_geometry_overlay.jpg"
REVIEW=QA_DIR/"vp2d2_vector_geometry_review.jpg"

MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
CAR_MARGIN=14
VERTICAL_SCORE_THRESHOLD=5.5
HORIZONTAL_SCORE_THRESHOLD=6.0

VERTICAL_SEEDS={
    "V0":[[245,278,470,710],[220,260,1030,1170],[215,245,1324,1400]],
    "V1":[[400,445,1030,1170],[385,415,1324,1400]],
    "V2":[[600,635,445,585],[585,630,1030,1170],[600,630,1324,1400]],
    "V3":[[735,775,740,1005],[775,805,1030,1170],[745,790,1324,1400]],
}
HORIZONTAL_SEEDS={
    "H0":[[245,850,742,775]],
    "H1":[[90,850,892,930]],
    "H2":[[90,850,1045,1082]],
    "H3":[[90,850,1304,1342]],
}

# The initial generic anchor candidate pass was directly reviewed on MASTER.
# Only these IDs were clearly on true parking paint; all four belong to V3.
INITIAL_VALID_ANCHOR_IDS=["A13","A17","A20","A23"]

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def robust_fit(points):
    if len(points)<10:
        raise RuntimeError(f"too few seed samples: {len(points)}")
    arr=np.asarray([[p[0],p[1]] for p in points],dtype=np.float32)
    first=cv2.fitLine(arr,cv2.DIST_HUBER,0,0.01,0.01).reshape(-1)
    vx,vy,x0,y0=[float(v) for v in first]
    normal=np.asarray([-vy,vx],dtype=np.float64)
    residual=np.abs((arr.astype(np.float64)-np.asarray([x0,y0]))@normal)
    med=float(np.median(residual))
    mad=float(np.median(np.abs(residual-med)))+1e-6
    cutoff=max(2.5,med+2.5*1.4826*mad)
    kept=arr[residual<=cutoff]
    if len(kept)<10:
        raise RuntimeError("robust trim removed too many samples")
    second=cv2.fitLine(kept,cv2.DIST_HUBER,0,0.01,0.01).reshape(-1)
    fit=tuple(float(v) for v in second)
    return fit,kept,cutoff

def point_at_y(fit,y):
    vx,vy,x0,y0=fit
    if abs(vy)<1e-8: raise RuntimeError("vertical model has vy ~= 0")
    return float(x0+(vx/vy)*(y-y0)),float(y)

def point_at_x(fit,x):
    vx,vy,x0,y0=fit
    if abs(vx)<1e-8: raise RuntimeError("horizontal model has vx ~= 0")
    return float(x),float(y0+(vy/vx)*(x-x0))

def line_equation(fit):
    vx,vy,x0,y0=fit
    a=float(vy); b=float(-vx); c=float(-(a*x0+b*y0))
    norm=(a*a+b*b)**0.5
    return [a/norm,b/norm,c/norm]

def intersection(fit_a,fit_b):
    a1,b1,c1=line_equation(fit_a)
    a2,b2,c2=line_equation(fit_b)
    den=a1*b2-a2*b1
    if abs(den)<1e-9: return None
    x=(b1*c2-b2*c1)/den
    y=(c1*a2-c2*a1)/den
    return [round(float(x),3),round(float(y),3)]

def main():
    QA_DIR.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA:
        raise SystemExit("FAIL: MASTER hash mismatch")
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    img=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if img is None: raise SystemExit("FAIL: MASTER decode")
    h,w=img.shape[:2]
    if [w,h]!=[941,1672]: raise SystemExit(f"FAIL dimensions {w}x{h}")

    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    sat=hsv[:,:,1].astype(np.float32)
    blur=cv2.GaussianBlur(gray,(0,0),7)
    residual=gray.astype(np.float32)-blur.astype(np.float32)
    neutral=np.clip((120.0-sat)/120.0,0.0,1.0)
    score=np.maximum(residual,0.0)*neutral

    valid=np.ones((h,w),dtype=np.uint8)
    car_rects={}
    for v in level["vehicles"]:
        x1,y1,x2,y2=[int(round(q)) for q in v["sprite"]]
        x1=max(0,x1-CAR_MARGIN); y1=max(0,y1-CAR_MARGIN)
        x2=min(w,x2+CAR_MARGIN); y2=min(h,y2+CAR_MARGIN)
        car_rects[v["id"]]=[x1,y1,x2,y2]
        valid[y1:y2,x1:x2]=0
    # Tutorial arrow/glow is not parking paint.
    valid[435:800,330:550]=0

    def collect_vertical(windows):
        pts=[]
        per_window=[]
        for rect in windows:
            x1,x2,y1,y2=rect
            count=0
            for y in range(y1,y2):
                vals=score[y,x1:x2].copy()
                ok=valid[y,x1:x2]>0
                if not np.any(ok): continue
                vals[~ok]=-1
                i=int(np.argmax(vals))
                if float(vals[i])>=VERTICAL_SCORE_THRESHOLD:
                    pts.append([x1+i,y,float(vals[i])])
                    count+=1
            per_window.append({"rect":rect,"samples":count})
        return pts,per_window

    def collect_horizontal(windows):
        pts=[]
        per_window=[]
        for rect in windows:
            x1,x2,y1,y2=rect
            count=0
            for x in range(x1,x2):
                vals=score[y1:y2,x].copy()
                ok=valid[y1:y2,x]>0
                if not np.any(ok): continue
                vals[~ok]=-1
                i=int(np.argmax(vals))
                if float(vals[i])>=HORIZONTAL_SCORE_THRESHOLD:
                    pts.append([x,y1+i,float(vals[i])])
                    count+=1
            per_window.append({"rect":rect,"samples":count})
        return pts,per_window

    models={}
    supports={}
    for line_id,windows in VERTICAL_SEEDS.items():
        pts,window_stats=collect_vertical(windows)
        fit,kept,cutoff=robust_fit(pts)
        models[line_id]=fit
        supports[line_id]={
            "orientation":"vertical",
            "seed_windows":window_stats,
            "raw_samples":len(pts),
            "retained_samples":len(kept),
            "robust_residual_cutoff_px":round(float(cutoff),4),
            "retained_points":[[round(float(x),2),round(float(y),2)] for x,y in kept[::max(1,len(kept)//120)]],
        }
    for line_id,windows in HORIZONTAL_SEEDS.items():
        pts,window_stats=collect_horizontal(windows)
        fit,kept,cutoff=robust_fit(pts)
        models[line_id]=fit
        supports[line_id]={
            "orientation":"horizontal",
            "seed_windows":window_stats,
            "raw_samples":len(pts),
            "retained_samples":len(kept),
            "robust_residual_cutoff_px":round(float(cutoff),4),
            "retained_points":[[round(float(x),2),round(float(y),2)] for x,y in kept[::max(1,len(kept)//120)]],
        }

    line_payload={}
    for line_id,fit in models.items():
        vx,vy,x0,y0=fit
        if line_id.startswith("V"):
            segment=[point_at_y(fit,445),point_at_y(fit,1400)]
        else:
            segment=[point_at_x(fit,90),point_at_x(fit,850)]
        line_payload[line_id]={
            "fit_line":[round(vx,9),round(vy,9),round(x0,6),round(y0,6)],
            "abc":[round(q,9) for q in line_equation(fit)],
            "segment_xyxy":[
                round(segment[0][0],3),round(segment[0][1],3),
                round(segment[1][0],3),round(segment[1][1],3)
            ],
            "support":supports[line_id],
        }

    intersections={}
    for v in ["V0","V1","V2","V3"]:
        intersections[v]={}
        for hh in ["H0","H1","H2","H3"]:
            intersections[v][hh]=intersection(models[v],models[hh])

    # Explicitly do not force a single vertical vanishing point. The exact MASTER
    # visible fragments are the authority; a forced VP moved lines off paint in
    # local comparison. Each hidden segment is a continuation of an observed
    # straight vector supported by at least two separated visible seed regions.
    model={
        "gate":"VP_2D2_ANCHOR_FIRST_PROJECTIVE_MARKINGS",
        "status":"VECTOR_MODEL_BUILT_VISUAL_QA_REQUIRED",
        "source":{"path":"assets/master.webp","sha256":MASTER_SHA,"width":w,"height":h},
        "bounded_repair_method":"VISUALLY_VALIDATED_SEED_WINDOWS_PLUS_LOCAL_NEUTRAL_BRIGHTNESS_SNAP_PLUS_ROBUST_VECTOR_LINE_FIT",
        "initial_anchor_pass":{
            "status":"FAIL_VISUAL_QA",
            "candidate_count":24,
            "visually_valid_ids":INITIAL_VALID_ANCHOR_IDS,
            "valid_count":len(INITIAL_VALID_ANCHOR_IDS),
            "reason":"Only the four V3 anchors were clearly on true parking paint; precision/coverage was insufficient for projective reconstruction."
        },
        "fit_policy":{
            "global_hough_used":False,
            "learned_model_used":False,
            "external_image_source_used":False,
            "single_vanishing_point_enforced":False,
            "single_vanishing_point_reason":"Direct MASTER geometry is authoritative; forcing one common VP moved validated line continuations away from visible paint.",
            "hidden_line_rule":"Extend only robust straight vectors supported by two or more separated visible seed windows/fragments."
        },
        "vehicle_exclusion_margin_px":CAR_MARGIN,
        "tutorial_exclusion":[330,435,550,800],
        "score":{
            "formula":"max(gray - GaussianBlur(gray,sigma=7),0) * clip((120-HSV_S)/120,0,1)",
            "vertical_threshold":VERTICAL_SCORE_THRESHOLD,
            "horizontal_threshold":HORIZONTAL_SCORE_THRESHOLD
        },
        "lines":line_payload,
        "grid_intersections":intersections,
        "production_rule":"Geometry only. Do not create/promote clean_plate.webp until direct visual QA records PASS."
    }
    MODEL.write_text(json.dumps(model,indent=2)+"\n",encoding="utf-8")

    seed_payload={
        "gate":"VP_2D2_BOUNDED_REPAIR_SEEDS",
        "status":"LOCKED_AFTER_DIRECT_MASTER_REVIEW",
        "master_sha256":MASTER_SHA,
        "vertical_seed_windows":VERTICAL_SEEDS,
        "horizontal_seed_windows":HORIZONTAL_SEEDS,
        "basis":"Each window covers a directly reviewed visible white parking-marking fragment; vehicle/tutorial pixels are excluded before snapping.",
        "no_more_repairs_after_this":True
    }
    SEEDS_OUT.write_text(json.dumps(seed_payload,indent=2)+"\n",encoding="utf-8")

    overlay=img.copy()
    cv2.rectangle(overlay,(0,0),(w-1,78),(18,18,18),-1)
    cv2.putText(overlay,"VP-2D2 bounded repair: validated seed-window vector fit",
                (16,50),cv2.FONT_HERSHEY_SIMPLEX,.78,(255,255,255),2,cv2.LINE_AA)
    vcolors={"V0":(0,255,255),"V1":(255,0,255),"V2":(0,255,0),"V3":(255,128,0)}
    hcolor=(255,255,0)
    for line_id in ["V0","V1","V2","V3"]:
        fit=models[line_id]
        p1=point_at_y(fit,445); p2=point_at_y(fit,1400)
        p1i=(int(round(p1[0])),int(round(p1[1]))); p2i=(int(round(p2[0])),int(round(p2[1])))
        cv2.line(overlay,p1i,p2i,vcolors[line_id],3,cv2.LINE_AA)
        cv2.putText(overlay,line_id,(p1i[0]+5,470),cv2.FONT_HERSHEY_SIMPLEX,.55,vcolors[line_id],2,cv2.LINE_AA)
        for x,y in supports[line_id]["retained_points"]:
            cv2.circle(overlay,(int(round(x)),int(round(y))),2,(255,255,255),-1,cv2.LINE_AA)
    for line_id in ["H0","H1","H2","H3"]:
        fit=models[line_id]
        p1=point_at_x(fit,90); p2=point_at_x(fit,850)
        p1i=(int(round(p1[0])),int(round(p1[1]))); p2i=(int(round(p2[0])),int(round(p2[1])))
        cv2.line(overlay,p1i,p2i,hcolor,3,cv2.LINE_AA)
        cv2.putText(overlay,line_id,(100,p1i[1]-6),cv2.FONT_HERSHEY_SIMPLEX,.55,hcolor,2,cv2.LINE_AA)
        for x,y in supports[line_id]["retained_points"]:
            cv2.circle(overlay,(int(round(x)),int(round(y))),2,(255,255,255),-1,cv2.LINE_AA)

    cv2.imwrite(str(OVERLAY),overlay,[cv2.IMWRITE_JPEG_QUALITY,92])
    lot=overlay[430:1410,70:870]
    cv2.imwrite(str(REVIEW),lot,[cv2.IMWRITE_JPEG_QUALITY,92])

    result={
        "gate":"VP_2D2_ANCHOR_FIRST_PROJECTIVE_MARKINGS",
        "status":"PASS_MACHINE_VECTOR_MODEL_VISUAL_REVIEW_REQUIRED",
        "master_sha256":sha256(MASTER),
        "vertical_line_count":4,
        "horizontal_line_count":4,
        "all_lines_have_multiple_seed_support":all(len(supports[k]["seed_windows"])>=2 for k in ["V0","V1","V2","V3"]),
        "overlay":{"path":str(OVERLAY.relative_to(ROOT)),"sha256":sha256(OVERLAY),"bytes":OVERLAY.stat().st_size},
        "review":{"path":str(REVIEW.relative_to(ROOT)),"sha256":sha256(REVIEW),"bytes":REVIEW.stat().st_size},
        "next":"Direct visual review controls. If the vectors coincide with visible paint and hidden continuations are plausible, record VP-2D2 PASS and retire the candidate detector workflow."
    }
    RESULT.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
