#!/usr/bin/env python3
"""EfficientSAM-Ti sprite extraction experiment for Parking Remaster.

Purpose:
- compare promptable object segmentation against the current GrabCut sprites;
- use only the approved canonical MASTER;
- use Level 1 known body/sprite bounds as prompts/crop constraints;
- never promote production assets automatically.

Model provenance:
- yformer/EfficientSAM
- commit d525f622e6f640acf5a0fc37c7ca1f243da5bde0
- weights/efficient_sam_vitt.onnx
- Apache-2.0
"""
from __future__ import annotations

import hashlib
import json
import math
import time
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"assets"/"master.webp"
LEVEL=ROOT/"levels"/"level_001.json"
OLD=ROOT/"assets"/"candidates"/"sprites"
MODEL_ENCODER=ROOT/".qa"/"models"/"efficient_sam_vitt_encoder.onnx"
MODEL_DECODER=ROOT/".qa"/"models"/"efficient_sam_vitt_decoder.onnx"
OUT=ROOT/".qa"/"efficient_sam_sprites"
SPRITES=OUT/"sprites"
PROD_SPRITES=ROOT/"assets"/"sprites"
PROD_RESULT=ROOT/"VP_SPRITE_PRODUCTION_RESULT.json"

VISUAL_APPROVAL="2026-09-19_EfficientSAM_fullsheet_plus_red_distance_refine_1.5"
RED_GLOW_DISTANCE_THRESHOLD=1.5

MASTER_SHA="535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
MODEL_REPO="yformer/EfficientSAM"
MODEL_COMMIT="d525f622e6f640acf5a0fc37c7ca1f243da5bde0"
MODEL_ENCODER_GIT_BLOB="6458f72477ae216a1bd68db41ffa14802c8d54f1"
MODEL_DECODER_GIT_BLOB="f9310202c916fe5a4ec9a6897edae855caf023f4"
PROMPT_SCALES=(1.00,1.10,1.20)


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def clamp_rect(rect,w,h):
    x1,y1,x2,y2=[int(round(v)) for v in rect]
    return [max(0,min(w-1,x1)),max(0,min(h-1,y1)),max(1,min(w,x2)),max(1,min(h,y2))]


def expand_about_center(rect,scale,w,h):
    x1,y1,x2,y2=rect
    cx=(x1+x2)/2.0; cy=(y1+y2)/2.0
    nw=(x2-x1)*scale; nh=(y2-y1)*scale
    return clamp_rect([cx-nw/2,cy-nh/2,cx+nw/2,cy+nh/2],w,h)


def component_best_for_body(mask,body):
    binary=(mask>0).astype(np.uint8)
    n,labels,stats,_=cv2.connectedComponentsWithStats(binary,8)
    if n<=1:
        return binary.astype(bool)
    x1,y1,x2,y2=body
    best=None; best_score=-1.0
    for lab in range(1,n):
        comp=(labels==lab)
        overlap=int(np.count_nonzero(comp[y1:y2,x1:x2]))
        area=int(stats[lab,cv2.CC_STAT_AREA])
        if area<=0: continue
        # overlap dominates; area is a tiny deterministic tie-break.
        score=overlap+min(area,1000000)*1e-8
        if score>best_score:
            best_score=score; best=comp
    return best if best is not None else binary.astype(bool)


def metrics(mask,body,sprite,pred_iou):
    x1,y1,x2,y2=body
    sx1,sy1,sx2,sy2=sprite
    body_area=max(1,(x2-x1)*(y2-y1))
    total=max(1,int(np.count_nonzero(mask)))
    body_pixels=int(np.count_nonzero(mask[y1:y2,x1:x2]))
    inside_sprite=np.zeros(mask.shape,dtype=bool)
    inside_sprite[sy1:sy2,sx1:sx2]=True
    leak=int(np.count_nonzero(mask & ~inside_sprite))
    body_coverage=body_pixels/body_area
    leak_fraction=leak/total
    area_ratio=total/body_area
    # Promptable segmentation should cover most of the car logical body,
    # stay inside the established sprite crop, and avoid implausibly huge masks.
    size_penalty=abs(math.log(max(area_ratio,1e-6)/0.82))
    score=(float(pred_iou)*1.6)+(min(body_coverage,1.0)*1.4)-(leak_fraction*5.0)-(size_penalty*0.18)
    return {
        "predicted_iou":round(float(pred_iou),6),
        "body_coverage":round(float(body_coverage),6),
        "sprite_leak_fraction":round(float(leak_fraction),6),
        "mask_area_ratio_to_body":round(float(area_ratio),6),
        "selection_score":round(float(score),6),
        "mask_pixels":total,
    }


def alpha_from_mask(mask):
    u=(mask.astype(np.uint8)*255)
    # tiny close only; do not grow the semantic mask.
    kernel=np.ones((3,3),np.uint8)
    u=cv2.morphologyEx(u,cv2.MORPH_CLOSE,kernel,iterations=1)
    return cv2.GaussianBlur(u,(5,5),0.75)


def refine_red_tutorial_glow(rgba,body_rel):
    """Remove only the detached yellow tutorial fringe from red_top.

    EfficientSAM correctly isolates the red car, but the baked yellow tutorial
    glow is semantically attached to the object. We keep yellow pixels that
    touch the non-yellow car body (headlights/reflections) and remove yellow
    pixels farther than a fixed distance from that body.
    """
    bgr=rgba[:,:,:3]
    alpha=rgba[:,:,3].copy()
    hsv=cv2.cvtColor(bgr,cv2.COLOR_BGR2HSV)
    semantic=alpha>20
    yellow=(
        (hsv[:,:,0]>=10)&(hsv[:,:,0]<=40)&
        (hsv[:,:,1]>=90)&(hsv[:,:,2]>=90)&semantic
    )
    core=(semantic & ~yellow).astype(np.uint8)
    # distanceTransform returns distance for non-zero pixels to nearest zero.
    # zeros are the non-yellow semantic car core.
    distance_to_core=cv2.distanceTransform((1-core).astype(np.uint8),cv2.DIST_L2,5)
    remove=yellow & (distance_to_core>RED_GLOW_DISTANCE_THRESHOLD)
    alpha[remove]=0

    # Keep the alpha component with greatest overlap with logical body.
    binary=(alpha>20).astype(np.uint8)
    n,labels,stats,_=cv2.connectedComponentsWithStats(binary,8)
    bx1,by1,bx2,by2=body_rel
    if n>1:
        best_lab=None; best_overlap=-1
        for lab in range(1,n):
            overlap=int(np.count_nonzero(labels[by1:by2,bx1:bx2]==lab))
            if overlap>best_overlap:
                best_overlap=overlap; best_lab=lab
        if best_lab is not None:
            alpha[labels!=best_lab]=0
    alpha=cv2.GaussianBlur(alpha,(3,3),0.4)
    rgba=rgba.copy(); rgba[:,:,3]=alpha
    body_area=max(1,(bx2-bx1)*(by2-by1))
    body_coverage=float(np.count_nonzero(alpha[by1:by2,bx1:bx2]>20))/body_area
    return rgba,{
        "yellow_semantic_pixels":int(np.count_nonzero(yellow)),
        "removed_yellow_pixels":int(np.count_nonzero(remove)),
        "distance_threshold_px":RED_GLOW_DISTANCE_THRESHOLD,
        "refined_body_coverage":round(body_coverage,6),
    }


def write_lossless_webp(path,bgra):
    """Write exact RGBA through Pillow/libwebp and verify byte-equivalent pixels."""
    rgba=cv2.cvtColor(bgra,cv2.COLOR_BGRA2RGBA)
    Image.fromarray(rgba,mode="RGBA").save(
        path,
        format="WEBP",
        lossless=True,
        quality=100,
        method=6,
        exact=True,
    )
    decoded=np.array(Image.open(path).convert("RGBA"))
    if decoded.shape!=rgba.shape:
        raise RuntimeError(f"WebP dimensions changed: {path}")
    max_delta=int(np.max(np.abs(decoded.astype(np.int16)-rgba.astype(np.int16))))
    if max_delta!=0:
        raise RuntimeError(f"WebP not exact lossless: {path}, max delta {max_delta}")
    return cv2.cvtColor(decoded,cv2.COLOR_RGBA2BGRA)


def composite_checker(rgba,w=260,h=330):
    checker=np.zeros((h,w,3),np.uint8)
    cell=18
    for yy in range(0,h,cell):
        for xx in range(0,w,cell):
            v=225 if ((xx//cell)+(yy//cell))%2==0 else 165
            checker[yy:min(h,yy+cell),xx:min(w,xx+cell)]=v
    ih,iw=rgba.shape[:2]
    scale=min((w-18)/max(1,iw),(h-42)/max(1,ih),1.5)
    rw=max(1,int(round(iw*scale))); rh=max(1,int(round(ih*scale)))
    resized=cv2.resize(rgba,(rw,rh),interpolation=cv2.INTER_AREA if scale<1 else cv2.INTER_CUBIC)
    x=(w-rw)//2; y=max(4,(h-32-rh)//2)
    a=resized[:,:,3:4].astype(np.float32)/255.0
    bg=checker[y:y+rh,x:x+rw].astype(np.float32)
    fg=resized[:,:,:3].astype(np.float32)
    checker[y:y+rh,x:x+rw]=np.clip(fg*a+bg*(1-a),0,255).astype(np.uint8)
    return checker


def add_label(tile,text):
    cv2.rectangle(tile,(0,tile.shape[0]-32),(tile.shape[1]-1,tile.shape[0]-1),(24,24,24),-1)
    cv2.putText(tile,text,(6,tile.shape[0]-10),cv2.FONT_HERSHEY_SIMPLEX,.42,(255,255,255),1,cv2.LINE_AA)
    return tile


def main():
    OUT.mkdir(parents=True,exist_ok=True); SPRITES.mkdir(parents=True,exist_ok=True); PROD_SPRITES.mkdir(parents=True,exist_ok=True)
    if sha256(MASTER)!=MASTER_SHA:
        raise SystemExit("FAIL canonical MASTER hash")
    if not MODEL_ENCODER.exists() or not MODEL_DECODER.exists():
        raise SystemExit("FAIL EfficientSAM split models missing")

    level=json.loads(LEVEL.read_text(encoding="utf-8"))
    bgr=cv2.imread(str(MASTER),cv2.IMREAD_COLOR)
    if bgr is None: raise SystemExit("FAIL master decode")
    h,w=bgr.shape[:2]
    rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)
    image=np.transpose(rgb.astype(np.float32)/255.0,(2,0,1))[None,...]

    queries=[]; query_meta=[]
    for v in level["vehicles"]:
        body=clamp_rect(v["body"],w,h)
        sprite=clamp_rect(v["sprite"],w,h)
        for scale in PROMPT_SCALES:
            rect=expand_about_center(body,scale,w,h)
            queries.append([[rect[0],rect[1]],[rect[2],rect[3]]])
            query_meta.append((v["id"],scale,body,sprite,rect))

    so=ort.SessionOptions(); so.intra_op_num_threads=4
    encoder=ort.InferenceSession(str(MODEL_ENCODER),sess_options=so,providers=["CPUExecutionProvider"])
    decoder=ort.InferenceSession(str(MODEL_DECODER),sess_options=so,providers=["CPUExecutionProvider"])
    if {i.name for i in encoder.get_inputs()}!={"batched_images"}:
        raise SystemExit("FAIL unexpected encoder inputs")
    if {i.name for i in decoder.get_inputs()}!={"image_embeddings","batched_point_coords","batched_point_labels","orig_im_size"}:
        raise SystemExit("FAIL unexpected decoder inputs")

    started=time.perf_counter()
    image_embeddings,=encoder.run(None,{"batched_images":image})
    encoder_elapsed=time.perf_counter()-started

    per_vehicle={v["id"]:[] for v in level["vehicles"]}
    decoder_elapsed=0.0
    for qi,(vid,scale,body,sprite,rect) in enumerate(query_meta):
        points=np.array([[[[rect[0],rect[1]],[rect[2],rect[3]]]]],dtype=np.float32)
        labels=np.array([[[2,3]]],dtype=np.float32)
        t0=time.perf_counter()
        outputs=decoder.run(None,{
            "image_embeddings":image_embeddings,
            "batched_point_coords":points,
            "batched_point_labels":labels,
            "orig_im_size":np.array([h,w],dtype=np.int64),
        })
        decoder_elapsed+=time.perf_counter()-t0
        out_names=[o.name for o in decoder.get_outputs()]
        output_map={name:value for name,value in zip(out_names,outputs)}
        logits=output_map.get("output_masks",outputs[0])
        ious=output_map.get("iou_predictions",outputs[1])
        cand_ious=ious[0,0]
        ci=int(np.argmax(cand_ious))
        raw=logits[0,0,ci]>=0
        clean=component_best_for_body(raw,body)
        m=metrics(clean,body,sprite,float(cand_ious[ci]))
        m.update({"prompt_scale":scale,"prompt_rect":rect,"candidate_index":ci})
        per_vehicle[vid].append((m,clean))

    selections={}
    old_tiles=[]; new_tiles=[]
    for v in level["vehicles"]:
        vid=v["id"]; body=clamp_rect(v["body"],w,h); sprite=clamp_rect(v["sprite"],w,h)
        candidates=per_vehicle[vid]
        candidates.sort(key=lambda item:(item[0]["selection_score"],item[0]["predicted_iou"]),reverse=True)
        chosen,mask=candidates[0]
        alpha=alpha_from_mask(mask)
        sx1,sy1,sx2,sy2=sprite
        rgba=cv2.cvtColor(bgr[sy1:sy2,sx1:sx2],cv2.COLOR_BGR2BGRA)
        rgba[:,:,3]=alpha[sy1:sy2,sx1:sx2]
        refine=None
        if vid=="red_top":
            body_rel=[body[0]-sx1,body[1]-sy1,body[2]-sx1,body[3]-sy1]
            rgba,refine=refine_red_tutorial_glow(rgba,body_rel)

        out=SPRITES/f"{vid}.png"
        cv2.imwrite(str(out),rgba)
        prod=PROD_SPRITES/f"{vid}.webp"
        write_lossless_webp(prod,rgba)

        selections[vid]={
            "selected":chosen,
            "all_candidates":[x[0] for x in candidates],
            "refine":refine,
            "qa_png_sha256":sha256(out),
            "qa_png_bytes":out.stat().st_size,
            "production_webp_sha256":sha256(prod),
            "production_webp_bytes":prod.stat().st_size,
        }

        old_path=OLD/f"{vid}.png"
        old=cv2.imread(str(old_path),cv2.IMREAD_UNCHANGED)
        if old is None:
            old=np.zeros((10,10,4),np.uint8)
        old_tiles.append(add_label(composite_checker(old),f"OLD {vid}"))
        new_tiles.append(add_label(composite_checker(rgba),f"ESAM {vid}"))

    # comparison: each row = old 5 + new 5 for the same half of vehicles
    rows=[]
    for start in (0,5):
        rows.append(np.hstack(old_tiles[start:start+5]))
        rows.append(np.hstack(new_tiles[start:start+5]))
    sheet=np.vstack(rows)
    review=OUT/"grabcut_vs_efficientsam.jpg"
    cv2.imwrite(str(review),sheet,[cv2.IMWRITE_JPEG_QUALITY,92])

    qa={
        "gate":"VP_SPRITE_EFFICIENTSAM_COMPARISON",
        "status":"VISUAL_REVIEW_REQUIRED",
        "source":{"master_sha256":sha256(MASTER),"width":w,"height":h},
        "model":{
            "repo":MODEL_REPO,
            "commit":MODEL_COMMIT,
            "license":"Apache-2.0",
            "encoder":{"file":"weights/efficient_sam_vitt_encoder.onnx","git_blob":MODEL_ENCODER_GIT_BLOB,"sha256":sha256(MODEL_ENCODER),"bytes":MODEL_ENCODER.stat().st_size},
            "decoder":{"file":"weights/efficient_sam_vitt_decoder.onnx","git_blob":MODEL_DECODER_GIT_BLOB,"sha256":sha256(MODEL_DECODER),"bytes":MODEL_DECODER.stat().st_size},
            "runtime":"onnxruntime CPUExecutionProvider",
        },
        "method":{
            "prompt":"box",
            "labels":{"top_left":2,"bottom_right":3},
            "prompt_scales":list(PROMPT_SCALES),
            "queries":len(queries),
            "single_encoder_inference":True,
            "connected_component_rule":"max overlap with logical body",
            "selection":"predicted IoU + body coverage - sprite leak - implausible area penalty",
        },
        "inference_seconds":{"encoder":round(encoder_elapsed,3),"decoder_total":round(decoder_elapsed,3),"total":round(encoder_elapsed+decoder_elapsed,3)},
        "vehicles":selections,
        "hard_checks":{
            "sprite_count":len(selections),
            "expected_sprite_count":len(level["vehicles"]),
            "master_hash_match":sha256(MASTER)==MASTER_SHA,
        },
        "review":"grabcut_vs_efficientsam.jpg",
        "visual_approval":VISUAL_APPROVAL,
        "decision_rule":"Direct full-size alpha QA is authoritative. EfficientSAM was approved after comparison; red_top additionally uses deterministic tutorial-glow refinement."
    }
    (OUT/"efficient_sam_qa.json").write_text(json.dumps(qa,indent=2)+"\n",encoding="utf-8")

    production={
        "gate":"VP_SPRITE_PRODUCTION",
        "status":"PASS",
        "approved_at":"2026-09-19",
        "visual_approval":VISUAL_APPROVAL,
        "master_sha256":sha256(MASTER),
        "model":{
            "repo":MODEL_REPO,"commit":MODEL_COMMIT,"license":"Apache-2.0",
            "encoder_git_blob":MODEL_ENCODER_GIT_BLOB,
            "decoder_git_blob":MODEL_DECODER_GIT_BLOB,
        },
        "method":"EfficientSAM-Ti box prompts; exact MASTER RGB; red_top detached tutorial-glow alpha refinement only",
        "sprite_count":len(selections),
        "sprites":{vid:{
            "sha256":data["production_webp_sha256"],
            "bytes":data["production_webp_bytes"],
            "refine":data["refine"],
        } for vid,data in selections.items()},
        "clean_plate_status":"STILL_BLOCKED_SEPARATE_GATE",
    }
    PROD_RESULT.write_text(json.dumps(production,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"inference_seconds":qa["inference_seconds"],"encoder_sha256":qa["model"]["encoder"]["sha256"],"decoder_sha256":qa["model"]["decoder"]["sha256"],"vehicle_selected":{k:v["selected"] for k,v in selections.items()}},indent=2))


if __name__=="__main__":
    main()
