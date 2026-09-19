#!/usr/bin/env python3
"""VP-2E structured clean-plate candidate.

Build-time only. Uses:
- exact MASTER
- locked production sprite alpha masks
- regular-grid MASTER-only asphalt illumination
- deterministic multi-band MASTER asphalt residual texture
- approved VP-2D2 parking-marking vectors

It writes a candidate under assets/candidates only. It never promotes
assets/clean_plate.webp.
"""
from __future__ import annotations
import hashlib, json, math
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
SPRITE_RESULT=ROOT/"VP_SPRITE_PRODUCTION_RESULT.json"
GEOMETRY=ROOT/"PARKING_PROJECTIVE_MARKING_MODEL_V1.json"
OUT_DIR=ROOT/"assets"/"candidates"
QA_DIR=ROOT/"assets"/"qa"
CANDIDATE=OUT_DIR/"clean_plate_structured_v1.webp"
RESULT=ROOT/"VP2E_RESULT.json"
MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
LOT=(70,430,870,1410)
TRUST_ROI=(95,455,845,1365)
GRID_STEP=40
SHADOW_RADIUS=32
SEED=20260919

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def gauss(a,s):
    return cv2.GaussianBlur(a,(0,0),s,borderType=cv2.BORDER_REFLECT)

def nearest_fill_grid(grid,known):
    out=grid.copy()
    ky,kx=np.nonzero(known)
    if len(kx)==0: raise RuntimeError("no known illumination cells")
    my,mx=np.nonzero(~known)
    known_xy=np.column_stack([ky,kx]).astype(np.float32)
    for y,x in zip(my.tolist(),mx.tolist()):
        d=((known_xy[:,0]-y)**2+(known_xy[:,1]-x)**2)
        j=int(np.argmin(d))
        out[y,x]=grid[int(ky[j]),int(kx[j])]
    return out

def alpha_composite_rgba(dst_rgb, src_rgba, x1,y1,x2,y2):
    src=np.asarray(src_rgba,dtype=np.float32)
    rgb=src[:,:,:3]
    a=src[:,:,3:4]/255.0
    region=dst_rgb[y1:y2,x1:x2].astype(np.float32)
    dst_rgb[y1:y2,x1:x2]=np.clip(region*(1-a)+rgb*a,0,255).astype(np.uint8)

def main():
    OUT_DIR.mkdir(parents=True,exist_ok=True); QA_DIR.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA: raise SystemExit("FAIL MASTER hash")
    level=json.loads(LEVEL.read_text())
    sprite_result=json.loads(SPRITE_RESULT.read_text())
    geom=json.loads(GEOMETRY.read_text())

    img=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if img is None: raise SystemExit("FAIL MASTER decode")
    h,w=img.shape[:2]
    if [w,h]!=[941,1672]: raise SystemExit(f"FAIL dimensions {w}x{h}")

    alpha_union=np.zeros((h,w),np.uint8)
    sprite_rgba={}
    sprite_checks={}
    for v in level["vehicles"]:
        vid=v["id"]; x1,y1,x2,y2=map(int,v["sprite"])
        p=ROOT/"assets"/"sprites"/f"{vid}.webp"
        expected=sprite_result["sprites"][vid]["sha256"]
        actual=sha256(p)
        if actual!=expected: raise SystemExit(f"FAIL sprite hash {vid}")
        im=Image.open(p).convert("RGBA")
        arr=np.asarray(im)
        if arr.shape[:2]!=(y2-y1,x2-x1): raise SystemExit(f"FAIL sprite dimensions {vid}")
        sprite_rgba[vid]=im
        a=(arr[:,:,3]>20).astype(np.uint8)*255
        alpha_union[y1:y2,x1:x2]=np.maximum(alpha_union[y1:y2,x1:x2],a)
        sprite_checks[vid]={"sha256":actual,"alpha_pixels":int(np.count_nonzero(a))}

    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*SHADOW_RADIUS+1,2*SHADOW_RADIUS+1))
    car_remove=cv2.dilate(alpha_union,kernel)

    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    H,S8,V=cv2.split(hsv)
    tutorial=np.zeros((h,w),np.uint8)
    tx1,ty1,tx2,ty2=340,455,540,800
    yy=((H[ty1:ty2,tx1:tx2]>=15)&(H[ty1:ty2,tx1:tx2]<=42)&
        (S8[ty1:ty2,tx1:tx2]>=70)&(V[ty1:ty2,tx1:tx2]>=90))
    tutorial[ty1:ty2,tx1:tx2]=yy.astype(np.uint8)*255
    tutorial=cv2.dilate(tutorial,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))

    lotmask=np.zeros((h,w),np.uint8)
    lx1,ly1,lx2,ly2=LOT; lotmask[ly1:ly2,lx1:lx2]=255
    remove=cv2.bitwise_and(np.maximum(car_remove,tutorial),lotmask)

    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB).astype(np.float32)
    L=lab[:,:,0]
    S=S8.astype(np.float32)
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32)
    gx=cv2.Sobel(gray,cv2.CV_32F,1,0,ksize=3)
    gy=cv2.Sobel(gray,cv2.CV_32F,0,1,ksize=3)
    grad=np.sqrt(gx*gx+gy*gy)

    trust=np.zeros((h,w),np.uint8)
    x1,y1,x2,y2=TRUST_ROI; trust[y1:y2,x1:x2]=1
    trust[remove>0]=0
    trust[(L<24)|(L>125)|(S>95)|(grad>75)]=0
    trust=cv2.erode(trust,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    if int(trust.sum())<50000: raise SystemExit("FAIL insufficient trusted asphalt")

    gh=math.ceil((ly2-ly1)/GRID_STEP); gw=math.ceil((lx2-lx1)/GRID_STEP)
    grid=np.full((gh,gw,3),np.nan,np.float32)
    counts=np.zeros((gh,gw),np.int32)
    for gy0 in range(gh):
        ya=ly1+gy0*GRID_STEP; yb=min(ly2,ya+GRID_STEP)
        for gx0 in range(gw):
            xa=lx1+gx0*GRID_STEP; xb=min(lx2,xa+GRID_STEP)
            m=trust[ya:yb,xa:xb]>0
            if int(m.sum())>=35:
                grid[gy0,gx0]=np.median(lab[ya:yb,xa:xb][m],axis=0)
                counts[gy0,gx0]=int(m.sum())
    known=np.isfinite(grid[:,:,0])
    if int(known.sum())<100: raise SystemExit("FAIL insufficient illumination cells")
    filled=nearest_fill_grid(grid,known)
    for c in range(3):
        filled[:,:,c]=cv2.GaussianBlur(filled[:,:,c],(0,0),1.0,borderType=cv2.BORDER_REPLICATE)

    field=lab.copy()
    for c in range(3):
        f=cv2.resize(filled[:,:,c],(lx2-lx1,ly2-ly1),interpolation=cv2.INTER_CUBIC)
        field[ly1:ly2,lx1:lx2,c]=f

    # MASTER-derived multi-band asphalt microtexture; deterministic and non-periodic.
    c1=L-gauss(L,1.0)
    c2=gauss(L,1.0)-gauss(L,3.5)
    c3=gauss(L,3.5)-gauss(L,10.0)
    sds=[float(np.std(c[trust>0])) for c in (c1,c2,c3)]
    rng=np.random.default_rng(SEED)
    def band(kind):
        n=rng.standard_normal((h,w)).astype(np.float32)
        if kind==1: z=n-gauss(n,1.0)
        elif kind==2: z=gauss(n,1.0)-gauss(n,3.5)
        else: z=gauss(n,3.5)-gauss(n,10.0)
        z-=float(z.mean()); z/=max(float(z.std()),1e-6)
        return z
    field[:,:,0]=np.clip(field[:,:,0]+band(1)*sds[0]*0.90+band(2)*sds[1]*0.90+band(3)*sds[2]*0.30,0,255)

    # Boundary colour correction is affine per major removal component.
    ncc,cc=cv2.connectedComponents((remove>0).astype(np.uint8),8)
    corrections=[]
    for cid in range(1,ncc):
        comp=(cc==cid).astype(np.uint8); area=int(comp.sum())
        if area<2000: continue
        ring=(cv2.dilate(comp,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))>0)&(
              cv2.dilate(comp,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))==0)&(trust>0)
        yy0,xx0=np.nonzero(ring)
        if len(xx0)<200: continue
        stride=max(1,len(xx0)//5000)
        yy0=yy0[::stride]; xx0=xx0[::stride]
        xn=(xx0-w/2)/(w/2); yn=(yy0-h/2)/(h/2)
        A=np.column_stack([np.ones_like(xn),xn,yn]).astype(np.float64)
        cy,cx=np.nonzero(comp)
        cxn=(cx-w/2)/(w/2); cyn=(cy-h/2)/(h/2)
        coeff=[]
        for ch in range(3):
            delta=(lab[yy0,xx0,ch]-field[yy0,xx0,ch]).astype(np.float64)
            lo,hi=np.percentile(delta,[10,90]); keep=(delta>=lo)&(delta<=hi)
            co=np.linalg.lstsq(A[keep],delta[keep],rcond=None)[0]
            field[cy,cx,ch]=np.clip(field[cy,cx,ch]+co[0]+co[1]*cxn+co[2]*cyn,0,255)
            coeff.append([round(float(v),6) for v in co])
        corrections.append({"component":cid,"area":area,"ring_samples":len(xx0),"lab_affine":coeff})

    dist=cv2.distanceTransform((remove>0).astype(np.uint8),cv2.DIST_L2,5)
    a=np.clip(dist/5.0,0,1)[:,:,None]
    merged=lab*(1-a)+field*a
    out=cv2.cvtColor(np.clip(merged,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR)

    lines={k:v["segment_xyxy"] for k,v in geom["lines"].items()}
    sample_mask=np.zeros((h,w),np.uint8)
    for seg in lines.values():
        xa,ya,xb,yb=[int(round(v)) for v in seg]
        cv2.line(sample_mask,(xa,ya),(xb,yb),255,9,cv2.LINE_AA)
    sel=(sample_mask>0)&(remove==0)&(L>115)&(S<80)
    if int(sel.sum())<1000: raise SystemExit("FAIL insufficient paint sample")
    paint=np.median(img[sel],axis=0).astype(np.float32)

    line_mask=np.zeros((h,w),np.uint8)
    for seg in lines.values():
        xa,ya,xb,yb=[int(round(v)) for v in seg]
        cv2.line(line_mask,(xa,ya),(xb,yb),255,6,cv2.LINE_AA)
    wear_rng=np.random.default_rng(SEED+1)
    wear=wear_rng.random((h,w)).astype(np.float32)
    wear=cv2.GaussianBlur(wear,(0,0),1.0)
    wear=(wear-float(wear.min()))/max(float(wear.max()-wear.min()),1e-6)
    line_a=(line_mask.astype(np.float32)/255.0)*(remove>0).astype(np.float32)*(0.48+0.28*wear)
    outf=out.astype(np.float32)
    for c in range(3):
        outf[:,:,c]=outf[:,:,c]*(1-line_a)+paint[c]*line_a
    out=np.clip(outf,0,255).astype(np.uint8)

    # Exact outside-mask invariant.
    out[remove==0]=img[remove==0]

    rgb=cv2.cvtColor(out,cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(CANDIDATE,format="WEBP",lossless=True,quality=100,method=6,exact=True)
    reread=np.asarray(Image.open(CANDIDATE).convert("RGB"))
    original_rgb=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    outside_max=int(np.abs(reread.astype(np.int16)-original_rgb.astype(np.int16))[remove==0].max())
    if outside_max!=0: raise SystemExit(f"FAIL outside changed {outside_max}")

    # Reviews.
    full_review=QA_DIR/"vp2e_structured_clean_plate_review.jpg"
    iphone_review=QA_DIR/"vp2e_structured_clean_plate_iphone.jpg"
    mask_review=QA_DIR/"vp2e_removal_mask_review.jpg"
    cv2.imwrite(str(full_review),out[420:1420,60:880],[cv2.IMWRITE_JPEG_QUALITY,92])
    iphone=cv2.resize(out,(390,round(h*390/w)),interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(iphone_review),iphone,[cv2.IMWRITE_JPEG_QUALITY,90])
    mask_vis=img.copy()
    mask_vis[remove>0]=(0.35*mask_vis[remove>0]+0.65*np.array([0,0,255])).astype(np.uint8)
    cv2.imwrite(str(mask_review),mask_vis,[cv2.IMWRITE_JPEG_QUALITY,88])

    # Initial Level-1 rebuild using locked production sprites.
    rebuild=np.asarray(Image.fromarray(rgb)).copy()
    for v in level["vehicles"]:
        x1,y1,x2,y2=map(int,v["sprite"])
        alpha_composite_rgba(rebuild,sprite_rgba[v["id"]],x1,y1,x2,y2)
    rebuild_bgr=cv2.cvtColor(rebuild,cv2.COLOR_RGB2BGR)
    rebuild_review=QA_DIR/"vp2e_level1_rebuild_review.jpg"
    rebuild_iphone=QA_DIR/"vp2e_level1_rebuild_iphone.jpg"
    cv2.imwrite(str(rebuild_review),rebuild_bgr,[cv2.IMWRITE_JPEG_QUALITY,92])
    cv2.imwrite(str(rebuild_iphone),cv2.resize(rebuild_bgr,(390,round(h*390/w)),interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,90])

    # Count original tutorial-yellow pixels that remain yellow after replacement.
    cand_hsv=cv2.cvtColor(out,cv2.COLOR_BGR2HSV)
    ch,cs,cv=cv2.split(cand_hsv)
    orig_tut=(tutorial>0)
    residual_yellow=orig_tut&(ch>=15)&(ch<=42)&(cs>=70)&(cv>=90)

    result={
      "gate":"VP_2E_STRUCTURED_ASPHALT_PLUS_VECTOR_MARKING_RECONSTRUCTION",
      "status":"CANDIDATE_BUILT_VISUAL_QA_REQUIRED",
      "master_sha256":MASTER_SHA,
      "candidate":{"path":str(CANDIDATE.relative_to(ROOT)),"sha256":sha256(CANDIDATE),"bytes":CANDIDATE.stat().st_size,"width":w,"height":h},
      "inputs":{"sprite_gate":"PASS","geometry_gate":"PASS","sprite_checks":sprite_checks},
      "method":{
        "shadow_radius_px":SHADOW_RADIUS,
        "regular_grid_step_px":GRID_STEP,
        "known_illumination_cells":int(known.sum()),
        "trusted_asphalt_pixels":int(trust.sum()),
        "texture_band_std_L":[round(v,6) for v in sds],
        "boundary_affine_corrections":corrections,
        "parking_line_count":len(lines),
        "paint_bgr_median":[round(float(v),2) for v in paint]
      },
      "invariants":{
        "outside_removal_mask_max_rgb_delta":outside_max,
        "external_image_source_used":False,
        "learned_inpainting_used":False,
        "global_hough_used":False,
        "poisson_or_seamless_clone_used":False,
        "production_clean_plate_written":False,
        "tutorial_yellow_pixels_before":int(np.count_nonzero(orig_tut)),
        "tutorial_yellow_pixels_remaining":int(np.count_nonzero(residual_yellow))
      },
      "reviews":{
        "full_lot":str(full_review.relative_to(ROOT)),
        "iphone":str(iphone_review.relative_to(ROOT)),
        "mask":str(mask_review.relative_to(ROOT)),
        "level1_rebuild":str(rebuild_review.relative_to(ROOT)),
        "level1_rebuild_iphone":str(rebuild_iphone.relative_to(ROOT))
      },
      "next":"Direct full-resolution clean-plate and iPhone-scale review, plus Level-1 rebuild review. Do not promote assets/clean_plate.webp unless all visual checks PASS."
    }
    RESULT.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
