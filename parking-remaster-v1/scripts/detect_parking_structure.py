#!/usr/bin/env python3
"""VP-2D Parking Structure Model — HISTORICAL REJECTED EXPERIMENT.

RETIRED after one bounded repair and direct visual QA on 2026-09-19.
Do not tune or reuse its Hough line/grid output as production geometry.
The JSON/overlay artifacts remain as diagnostic evidence.

Deterministic, MASTER-only analysis. This script does NOT create or promote a
clean plate. It extracts visible parking-marking geometry, line families,
candidate grid intersections, a known-asphalt illumination model, and safe
MASTER-only donor windows for the next reconstruction gate.

Visual QA remains authoritative.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets" / "master.webp"
LEVEL = ROOT / "levels" / "level_001.json"
MODEL_OUT = ROOT / "PARKING_STRUCTURE_MODEL_V1.json"
RESULT_OUT = ROOT / "VP2D_RESULT.json"
QA_DIR = ROOT / "assets" / "qa"
OVERLAY = QA_DIR / "vp2d_parking_structure_overlay.jpg"
OVERLAY_REVIEW = QA_DIR / "vp2d_parking_structure_review.jpg"
OVERLAY_B64 = QA_DIR / "vp2d_parking_structure_review.b64"

MASTER_SHA = "535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
LOT_ROI = [70, 430, 870, 1335]
TUTORIAL_RECT = [330, 435, 550, 800]
CAR_MARGIN = 28
DONOR_W, DONOR_H = 64, 64
SEED = 20260919

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def expand(rect, margin, w, h):
    x1,y1,x2,y2=[int(round(v)) for v in rect]
    return [max(0,x1-margin),max(0,y1-margin),min(w,x2+margin),min(h,y2+margin)]

def segment_angle_deg(line):
    x1,y1,x2,y2=[float(v) for v in line]
    a=math.degrees(math.atan2(y2-y1,x2-x1))
    while a >= 90.0: a -= 180.0
    while a < -90.0: a += 180.0
    return a

def line_length(line):
    x1,y1,x2,y2=[float(v) for v in line]
    return math.hypot(x2-x1,y2-y1)

def weighted_angle_clusters(lines, weights, k=3, iters=30):
    angles=np.array([segment_angle_deg(l) for l in lines],dtype=np.float64)
    pts=np.column_stack([np.cos(np.deg2rad(2*angles)),np.sin(np.deg2rad(2*angles))])
    order=np.argsort(angles)
    seeds=np.linspace(0,len(order)-1,k).round().astype(int)
    centers=pts[order[seeds]].copy()
    labels=np.zeros(len(lines),dtype=np.int32)
    wts=np.asarray(weights,dtype=np.float64)
    for _ in range(iters):
        d=((pts[:,None,:]-centers[None,:,:])**2).sum(axis=2)
        new_labels=np.argmin(d,axis=1)
        new_centers=[]
        for j in range(k):
            m=new_labels==j
            if not np.any(m):
                new_centers.append(centers[j])
                continue
            c=(pts[m]*wts[m,None]).sum(axis=0)/max(wts[m].sum(),1e-9)
            n=np.linalg.norm(c)
            new_centers.append(c/max(n,1e-9))
        new_centers=np.asarray(new_centers)
        if np.array_equal(new_labels,labels) and np.allclose(new_centers,centers,atol=1e-7):
            centers=new_centers; labels=new_labels; break
        centers=new_centers; labels=new_labels
    family=[]
    for j,c in enumerate(centers):
        a=.5*math.degrees(math.atan2(c[1],c[0]))
        while a >= 90: a-=180
        while a < -90: a+=180
        m=labels==j
        family.append({
            "family_id":int(j),
            "angle_deg":round(float(a),3),
            "segment_count":int(m.sum()),
            "total_length_px":round(float(wts[m].sum()),2)
        })
    idx=sorted(range(k), key=lambda j: family[j]["total_length_px"], reverse=True)
    remap={old:new for new,old in enumerate(idx)}
    labels=np.array([remap[int(x)] for x in labels],dtype=np.int32)
    family=[{**family[old],"family_id":new} for new,old in enumerate(idx)]
    return labels,family

def line_intersection(a,b):
    x1,y1,x2,y2=map(float,a); x3,y3,x4,y4=map(float,b)
    den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)
    if abs(den)<1e-7: return None
    px=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den
    py=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den
    return [px,py]

def representative_tracks(lines, labels, family_id):
    vals=[]
    for i,l in enumerate(lines):
        if int(labels[i])!=family_id: continue
        x1,y1,x2,y2=map(float,l)
        a=math.radians(segment_angle_deg(l))
        nx,ny=-math.sin(a),math.cos(a)
        mx,my=(x1+x2)/2,(y1+y2)/2
        rho=mx*nx+my*ny
        vals.append((rho,line_length(l),[int(x1),int(y1),int(x2),int(y2)]))
    vals.sort(key=lambda z:z[0])
    groups=[]
    gap=34.0
    for item in vals:
        if not groups or abs(item[0]-np.average([v[0] for v in groups[-1]],weights=[v[1] for v in groups[-1]]))>gap:
            groups.append([item])
        else:
            groups[-1].append(item)
    out=[]
    for g in groups:
        best=max(g,key=lambda z:z[1])
        out.append({
            "rho_px":round(float(np.average([z[0] for z in g],weights=[z[1] for z in g])),2),
            "support_segments":len(g),
            "support_length_px":round(float(sum(z[1] for z in g)),2),
            "representative_segment":best[2]
        })
    return out

def main():
    QA_DIR.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA:
        raise SystemExit("FAIL: MASTER hash mismatch")
    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    img=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit("FAIL: MASTER decode")
    h,w=img.shape[:2]
    if [w,h]!=[941,1672]:
        raise SystemExit(f"FAIL: dimensions {w}x{h}")

    x1,y1,x2,y2=LOT_ROI
    roi=np.zeros((h,w),np.uint8); roi[y1:y2,x1:x2]=255

    exclude=np.zeros((h,w),np.uint8)
    car_rects={}
    for v in level["vehicles"]:
        r=expand(v["sprite"],CAR_MARGIN,w,h)
        car_rects[v["id"]]=r
        a,b,c,d=r; exclude[b:d,a:c]=255
    a,b,c,d=TUTORIAL_RECT; exclude[b:d,a:c]=255

    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB)
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    H,S,V=cv2.split(hsv); L,_,_=cv2.split(lab)

    valid=(roi>0)&(exclude==0)
    lv=L[valid]
    l_lo=float(np.percentile(lv,18)); l_hi=float(np.percentile(lv,92))
    paint=((L>=max(125,l_lo+18))&(S<=82)&valid).astype(np.uint8)*255
    paint=cv2.morphologyEx(paint,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8),iterations=1)
    paint_d=cv2.dilate(paint,np.ones((7,7),np.uint8),iterations=1)

    clahe=cv2.createCLAHE(clipLimit=2.0,tileGridSize=(8,8))
    cg=clahe.apply(gray)
    edges=cv2.Canny(cg,45,130,apertureSize=3,L2gradient=True)
    edges=cv2.bitwise_and(edges,roi)
    edges[exclude>0]=0
    edges=cv2.bitwise_and(edges,paint_d)

    raw=cv2.HoughLinesP(edges,1,np.pi/360,threshold=24,minLineLength=38,maxLineGap=20)
    candidates=[]
    if raw is not None:
        for rr in raw[:,0,:]:
            l=[int(v) for v in rr]
            length=line_length(l)
            if length<38: continue
            mask=np.zeros((h,w),np.uint8)
            cv2.line(mask,(l[0],l[1]),(l[2],l[3]),255,7,cv2.LINE_AA)
            denom=max(1,int(np.count_nonzero(mask)))
            support=float(np.count_nonzero((mask>0)&(paint_d>0)))/denom
            exclusion_overlap=float(np.count_nonzero((mask>0)&(exclude>0)))/denom
            if support<0.34 or exclusion_overlap>0.02: continue
            angle=segment_angle_deg(l)
            candidates.append((l,length,support,angle))
    if len(candidates)<6:
        raise SystemExit(f"FAIL: too few marking segments {len(candidates)}")

    candidates.sort(key=lambda z:z[1]*z[2],reverse=True)
    candidates=candidates[:80]
    lines=[z[0] for z in candidates]
    weights=[z[1]*z[2] for z in candidates]
    labels,families=weighted_angle_clusters(lines,weights,k=3)

    tracks={}
    for fam in families:
        fid=fam["family_id"]
        tracks[str(fid)]=representative_tracks(lines,labels,fid)

    # Choose the family pair that produces the broadest plausible in-lot
    # intersection distribution rather than blindly using the two longest families.
    pair_trials=[]
    for fa in range(len(families)):
        for fb in range(fa+1,len(families)):
            aa=[lines[i] for i in range(len(lines)) if int(labels[i])==fa]
            bb=[lines[i] for i in range(len(lines)) if int(labels[i])==fb]
            pts=[]
            for la in aa:
                for lb in bb:
                    p=line_intersection(la,lb)
                    if p is None: continue
                    px,py=p
                    if x1<=px<x2 and y1<=py<y2 and exclude[int(py),int(px)]==0:
                        pts.append([float(px),float(py)])
            if pts:
                ar=np.asarray(pts,dtype=np.float64)
                spread=float(np.std(ar[:,0])+np.std(ar[:,1]))
                ad=abs(families[fa]["angle_deg"]-families[fb]["angle_deg"])
                ad=min(ad,180-ad)
                score=len(pts)*max(spread,1.0)*max(math.sin(math.radians(ad)),0.05)
            else:
                score=0.0
            pair_trials.append({"pair":[fa,fb],"raw_intersections":len(pts),"score":score,"points":pts})
    best_pair=max(pair_trials,key=lambda z:z["score"]) if pair_trials else {"pair":[],"points":[],"score":0.0,"raw_intersections":0}
    intersections=[[round(p[0],1),round(p[1],1)] for p in best_pair["points"]]
    # Deduplicate intersections spatially.
    grid_nodes=[]
    for p in sorted(intersections,key=lambda q:(q[1],q[0])):
        if all((p[0]-q[0])**2+(p[1]-q[1])**2>24**2 for q in grid_nodes):
            grid_nodes.append(p)
    grid_nodes=grid_nodes[:40]

    # Known asphalt: inside lot, away from vehicles/tutorial/paint, modest saturation,
    # and not extreme dark/light semantic objects.
    asphalt=(valid)&(paint_d==0)&(S<=92)&(L>=max(30,l_lo-15))&(L<=min(220,l_hi+15))
    asphalt_u8=asphalt.astype(np.uint8)*255
    asphalt_u8=cv2.erode(asphalt_u8,np.ones((3,3),np.uint8),iterations=1)
    asphalt=asphalt_u8>0

    yy,xx=np.nonzero(asphalt)
    if len(xx)<10000:
        raise SystemExit(f"FAIL: too few asphalt pixels {len(xx)}")
    step=max(1,len(xx)//60000)
    xx2=xx[::step].astype(np.float64); yy2=yy[::step].astype(np.float64)
    zz=L[yy[::step],xx[::step]].astype(np.float64)
    xn=(xx2-(x1+x2)/2)/max(1,(x2-x1)/2)
    yn=(yy2-(y1+y2)/2)/max(1,(y2-y1)/2)
    A=np.column_stack([np.ones_like(xn),xn,yn,xn*xn,xn*yn,yn*yn])
    coef,_,_,_=np.linalg.lstsq(A,zz,rcond=None)
    pred=A@coef
    resid=zz-pred
    illum={
        "basis":["1","x","y","x2","xy","y2"],
        "coordinate_normalization":{"x_center":(x1+x2)/2,"y_center":(y1+y2)/2,"x_halfspan":(x2-x1)/2,"y_halfspan":(y2-y1)/2},
        "coefficients_L":[round(float(v),6) for v in coef],
        "rmse_L":round(float(np.sqrt(np.mean(resid**2))),4),
        "residual_percentiles_L":{"p10":round(float(np.percentile(resid,10)),3),"p50":round(float(np.percentile(resid,50)),3),"p90":round(float(np.percentile(resid,90)),3)},
        "sample_count":int(len(zz))
    }

    # MASTER-only donor candidates.
    donors=[]
    for cy in range(y1+DONOR_H//2,y2-DONOR_H//2,32):
        for cx in range(x1+DONOR_W//2,x2-DONOR_W//2,32):
            ax=cx-DONOR_W//2; ay=cy-DONOR_H//2
            win=asphalt[ay:ay+DONOR_H,ax:ax+DONOR_W]
            cov=float(win.mean())
            if cov<0.78: continue
            pp=float((paint_d[ay:ay+DONOR_H,ax:ax+DONOR_W]>0).mean())
            if pp>0.03: continue
            lwin=L[ay:ay+DONOR_H,ax:ax+DONOR_W]
            vals=lwin[win]
            if len(vals)<DONOR_W*DONOR_H*.70: continue
            local_std=float(np.std(vals))
            local_med=float(np.median(vals))
            score=cov*2.2 + min(local_std/25.0,1.0)*0.45 - abs(local_med-float(np.median(zz)))/120.0
            donors.append({"rect":[ax,ay,ax+DONOR_W,ay+DONOR_H],"coverage":round(cov,4),"paint_fraction":round(pp,5),"L_median":round(local_med,2),"L_std":round(local_std,2),"score":round(score,5)})
    donors.sort(key=lambda d:d["score"],reverse=True)
    selected=[]
    for d in donors:
        cx=(d["rect"][0]+d["rect"][2])/2; cy=(d["rect"][1]+d["rect"][3])/2
        if all((cx-(s["rect"][0]+s["rect"][2])/2)**2+(cy-(s["rect"][1]+s["rect"][3])/2)**2>80**2 for s in selected):
            selected.append(d)
        if len(selected)>=10: break

    line_payload=[]
    for i,(l,length,support,angle) in enumerate(candidates):
        line_payload.append({
            "id":i,"xyxy":l,"length_px":round(float(length),2),
            "paint_support":round(float(support),4),
            "angle_deg":round(float(angle),3),
            "family_id":int(labels[i])
        })

    model={
        "gate":"VP_2D_PARKING_STRUCTURE_MODEL",
        "status":"MODEL_BUILT_VISUAL_QA_REQUIRED",
        "source":{"path":"assets/master.webp","sha256":MASTER_SHA,"width":w,"height":h},
        "lot_roi":LOT_ROI,
        "exclusions":{"car_margin_px":CAR_MARGIN,"tutorial_rect":TUTORIAL_RECT,"vehicle_rects":car_rects},
        "marking_detection":{
            "method":"low-saturation bright-paint mask + CLAHE/Canny + probabilistic Hough",
            "hough":{"rho_px":1,"theta_deg":0.5,"threshold":24,"min_line_length_px":38,"max_line_gap_px":20},
            "accepted_segment_count":len(line_payload),
            "segments":line_payload,
            "families":families,
            "tracks":tracks,
            "grid_pair_selection":{
                "chosen_pair":best_pair["pair"],
                "raw_intersections":best_pair["raw_intersections"],
                "score":round(float(best_pair["score"]),3),
                "trials":[{"pair":p["pair"],"raw_intersections":p["raw_intersections"],"score":round(float(p["score"]),3)} for p in pair_trials]
            },
            "grid_nodes":grid_nodes
        },
        "known_asphalt":{
            "pixel_count":int(np.count_nonzero(asphalt)),
            "fraction_of_lot":round(float(np.count_nonzero(asphalt))/float((x2-x1)*(y2-y1)),6),
            "selection":"lot ROI minus expanded vehicle/tutorial/paint; S<=92; robust L range; 3px erosion",
            "illumination_model":illum,
            "donor_window_size":[DONOR_W,DONOR_H],
            "donor_candidates":selected
        },
        "production_rule":"This artifact is geometry/statistics only. It may not promote clean_plate.webp. Next gate must reconstruct asphalt/markings and pass direct visual QA."
    }
    MODEL_OUT.write_text(json.dumps(model,indent=2)+"\n",encoding="utf-8")

    overlay=img.copy()
    cv2.rectangle(overlay,(x1,y1),(x2,y2),(255,255,255),3)
    colors=[(0,255,255),(255,0,255),(0,200,0)]
    for i,item in enumerate(line_payload):
        l=item["xyxy"]; color=colors[item["family_id"]%len(colors)]
        cv2.line(overlay,(l[0],l[1]),(l[2],l[3]),color,3,cv2.LINE_AA)
    for p in grid_nodes:
        cv2.circle(overlay,(int(round(p[0])),int(round(p[1]))),7,(255,255,0),-1,cv2.LINE_AA)
    for d in selected:
        a,b,c,d2=d["rect"]
        cv2.rectangle(overlay,(a,b),(c,d2),(0,128,255),2)
    for r in car_rects.values():
        a,b,c,d=r; cv2.rectangle(overlay,(a,b),(c,d),(80,80,255),1)
    cv2.rectangle(overlay,(TUTORIAL_RECT[0],TUTORIAL_RECT[1]),(TUTORIAL_RECT[2],TUTORIAL_RECT[3]),(80,80,255),1)
    cv2.rectangle(overlay,(0,0),(w-1,80),(18,18,18),-1)
    txt=f"VP-2D lines={len(line_payload)} families={len(families)} nodes={len(grid_nodes)} donors={len(selected)}"
    cv2.putText(overlay,txt,(18,52),cv2.FONT_HERSHEY_SIMPLEX,.86,(255,255,255),2,cv2.LINE_AA)
    cv2.imwrite(str(OVERLAY),overlay,[cv2.IMWRITE_JPEG_QUALITY,90])

    rw=140; rh=max(1,int(round(h*rw/w)))
    review=cv2.resize(overlay,(rw,rh),interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(OVERLAY_REVIEW),review,[cv2.IMWRITE_JPEG_QUALITY,48])
    b64=base64.b64encode(OVERLAY_REVIEW.read_bytes()).decode("ascii")
    OVERLAY_B64.write_text("\n".join(b64[i:i+76] for i in range(0,len(b64),76))+"\n",encoding="ascii")

    result={
        "gate":"VP_2D_PARKING_STRUCTURE_MODEL",
        "status":"PASS_MACHINE_ANALYSIS_VISUAL_REVIEW_REQUIRED",
        "master_sha256":sha256(MASTER),
        "accepted_segments":len(line_payload),
        "family_count":len(families),
        "grid_node_count":len(grid_nodes),
        "known_asphalt_pixels":int(np.count_nonzero(asphalt)),
        "donor_candidate_count":len(selected),
        "overlay":{"path":str(OVERLAY.relative_to(ROOT)),"sha256":sha256(OVERLAY),"bytes":OVERLAY.stat().st_size},
        "review":{"path":str(OVERLAY_REVIEW.relative_to(ROOT)),"sha256":sha256(OVERLAY_REVIEW),"bytes":OVERLAY_REVIEW.stat().st_size,"base64_path":str(OVERLAY_B64.relative_to(ROOT))},
        "next":"Directly inspect overlay. If parking marking families/lot geometry are materially correct, close VP-2D and proceed to structured asphalt + vector marking reconstruction; otherwise perform one bounded detector adjustment."
    }
    RESULT_OUT.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
