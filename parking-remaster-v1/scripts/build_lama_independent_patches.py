#!/usr/bin/env python3
"""Independent local-LaMa patch experiment for Parking Remaster.

Each car patch is inferred from the ORIGINAL approved MASTER, never from a
previously inpainted result. This avoids sequential error accumulation.

For each target car:
- crop a local context window from MASTER;
- mask every car rectangle (and tutorial overlay) intersecting that crop so
  neighboring cars cannot leak into the generated pavement;
- run pinned LaMa once;
- keep only the target car rectangle as that car's reusable erase patch.

The clean-plate candidate is then assembled deterministically from those
independent patches plus one independently inferred tutorial-overlay patch.

QA only. No production asset promotion.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets" / "master.webp"
LEVEL = ROOT / "levels" / "level_001.json"
MODEL = ROOT / ".qa" / "models" / "lama_fp32.onnx"
OUT = ROOT / ".qa" / "lama_independent_patches"
PATCH_DIR = OUT / "patches"

MASTER_SHA = "535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
MODEL_SHA = "1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6"

MARGIN = 7
CONTEXT = 120
EDGE_BLEND = 10
TUTORIAL_RECT = [340, 445, 545, 790]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clamp_rect(rect, width, height):
    x1, y1, x2, y2 = [int(round(v)) for v in rect]
    return [max(0, x1), max(0, y1), min(width, x2), min(height, y2)]


def expand(rect, margin, width, height):
    x1, y1, x2, y2 = rect
    return clamp_rect([x1 - margin, y1 - margin, x2 + margin, y2 + margin], width, height)


def intersects(a, b):
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])


def make_session():
    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    return ort.InferenceSession(str(MODEL), sess_options=so, providers=["CPUExecutionProvider"])


def infer_patch(session, master, all_masks, target_rect):
    h, w = master.shape[:2]
    x1, y1, x2, y2 = target_rect
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    side = int(max(x2 - x1, y2 - y1) + 2 * CONTEXT)
    side = max(side, 320)

    sx1 = int(round(cx - side / 2))
    sy1 = int(round(cy - side / 2))
    sx2 = sx1 + side
    sy2 = sy1 + side

    pl = max(0, -sx1)
    pt = max(0, -sy1)
    pr = max(0, sx2 - w)
    pb = max(0, sy2 - h)

    padded = cv2.copyMakeBorder(master, pt, pb, pl, pr, cv2.BORDER_REFLECT_101)
    ax1 = sx1 + pl
    ay1 = sy1 + pt
    crop = padded[ay1:ay1 + side, ax1:ax1 + side].copy()

    full_mask = np.zeros((h, w), np.uint8)
    crop_rect = [max(0, sx1), max(0, sy1), min(w, sx2), min(h, sy2)]
    included = []
    for name, rect in all_masks:
        if intersects(rect, crop_rect):
            rx1, ry1, rx2, ry2 = rect
            full_mask[ry1:ry2, rx1:rx2] = 255
            included.append(name)

    padded_mask = cv2.copyMakeBorder(full_mask, pt, pb, pl, pr, cv2.BORDER_CONSTANT, value=0)
    crop_mask = padded_mask[ay1:ay1 + side, ax1:ax1 + side]

    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    image = cv2.resize(rgb, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    model_mask = (cv2.resize(crop_mask, (512, 512), interpolation=cv2.INTER_NEAREST) > 127).astype(np.float32)
    image = np.transpose(image, (2, 0, 1))[None, ...]
    model_mask = model_mask[None, None, ...]

    started = time.perf_counter()
    out = session.run(None, {"image": image, "mask": model_mask})[0]
    seconds = time.perf_counter() - started

    arr = out[0].transpose(1, 2, 0)
    if float(np.nanmax(arr)) <= 2.0:
        arr *= 255.0
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    pred = cv2.resize(arr, (side, side), interpolation=cv2.INTER_CUBIC)
    pred = cv2.cvtColor(pred, cv2.COLOR_RGB2BGR)

    # Extract target rect in crop coordinates.
    tx1 = x1 - sx1
    ty1 = y1 - sy1
    tx2 = tx1 + (x2 - x1)
    ty2 = ty1 + (y2 - y1)
    patch = pred[ty1:ty2, tx1:tx2].copy()

    return patch, seconds, {
        "target_rect": target_rect,
        "crop_xyxy": [sx1, sy1, sx2, sy2],
        "crop_side": side,
        "padding": [pl, pt, pr, pb],
        "masked_context_objects": included,
    }


def blend_patch(canvas, patch, rect):
    x1, y1, x2, y2 = rect
    ph, pw = patch.shape[:2]
    if [pw, ph] != [x2 - x1, y2 - y1]:
        raise ValueError("patch size mismatch")
    local = np.ones((ph + 2, pw + 2), np.uint8) * 255
    local[0, :] = 0
    local[-1, :] = 0
    local[:, 0] = 0
    local[:, -1] = 0
    dist = cv2.distanceTransform(local, cv2.DIST_L2, 5)[1:-1, 1:-1]
    alpha = np.clip(dist / EDGE_BLEND, 0.0, 1.0)[..., None]
    base = canvas[y1:y2, x1:x2].astype(np.float32)
    merged = base * (1.0 - alpha) + patch.astype(np.float32) * alpha
    canvas[y1:y2, x1:x2] = np.clip(merged, 0, 255).astype(np.uint8)


def make_review(master, composite):
    a = cv2.resize(master, (470, 836), interpolation=cv2.INTER_AREA)
    b = cv2.resize(composite, (470, 836), interpolation=cv2.INTER_AREA)
    sheet = np.hstack([a, b])
    cv2.rectangle(sheet, (0, 0), (sheet.shape[1] - 1, 48), (18, 18, 18), -1)
    cv2.putText(sheet, "MASTER", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(sheet, "INDEPENDENT_LOCAL_PATCHES", (482, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.imwrite(str(OUT / "independent_compare.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 91])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PATCH_DIR.mkdir(parents=True, exist_ok=True)

    if sha256(MASTER) != MASTER_SHA:
        raise SystemExit("FAIL master hash")
    if sha256(MODEL) != MODEL_SHA:
        raise SystemExit("FAIL model hash")

    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    master = cv2.imread(str(MASTER), cv2.IMREAD_COLOR)
    if master is None:
        raise SystemExit("FAIL master decode")
    h, w = master.shape[:2]

    car_rects = []
    for vehicle in level["vehicles"]:
        rect = expand(vehicle["sprite"], MARGIN, w, h)
        car_rects.append((vehicle["id"], rect))

    all_context_masks = car_rects + [("tutorial_overlay", TUTORIAL_RECT)]
    session = make_session()
    if {i.name for i in session.get_inputs()} != {"image", "mask"}:
        raise SystemExit("FAIL unexpected model inputs")

    composite = master.copy()
    total_seconds = 0.0
    patch_meta = {}

    # Fixed top-to-bottom order only affects overlapping feather margins.
    ordered = sorted(car_rects, key=lambda item: (item[1][1], item[1][0]))
    union = np.zeros((h, w), np.uint8)

    for vehicle_id, rect in ordered:
        patch, seconds, meta = infer_patch(session, master, all_context_masks, rect)
        total_seconds += seconds
        path = PATCH_DIR / f"{vehicle_id}.png"
        cv2.imwrite(str(path), patch)
        blend_patch(composite, patch, rect)
        x1, y1, x2, y2 = rect
        union[y1:y2, x1:x2] = 255
        patch_meta[vehicle_id] = {
            **meta,
            "seconds": round(seconds, 3),
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
        }

    # Independently remove tutorial arrow/glow using the ORIGINAL master as input.
    tutorial_patch, seconds, tutorial_meta = infer_patch(session, master, all_context_masks, TUTORIAL_RECT)
    total_seconds += seconds
    tutorial_path = OUT / "tutorial_cover_independent.png"
    cv2.imwrite(str(tutorial_path), tutorial_patch)
    blend_patch(composite, tutorial_patch, TUTORIAL_RECT)
    tx1, ty1, tx2, ty2 = TUTORIAL_RECT
    union[ty1:ty2, tx1:tx2] = 255

    output = OUT / "clean_plate_independent_patches.png"
    cv2.imwrite(str(output), composite)
    cv2.imwrite(str(OUT / "independent_union_mask.png"), union)
    make_review(master, composite)

    outside = union == 0
    changed = int(np.count_nonzero(np.any(composite[outside] != master[outside], axis=1)))

    qa = {
        "gate": "VP_INDEPENDENT_LOCAL_LAMA_PATCHES",
        "status": "VISUAL_REVIEW_REQUIRED",
        "source": {"sha256": sha256(MASTER), "width": w, "height": h},
        "model": {
            "source": "Carve/LaMa-ONNX lama_fp32.onnx",
            "license": "apache-2.0",
            "sha256": sha256(MODEL),
            "runtime": "onnxruntime CPUExecutionProvider",
        },
        "method": {
            "strategy": "independent local inference from original MASTER",
            "car_margin_px": MARGIN,
            "context_px": CONTEXT,
            "edge_blend_px": EDGE_BLEND,
            "car_patch_count": len(car_rects),
            "tutorial_patch_count": 1,
            "no_sequential_generated_input": True,
        },
        "patches": patch_meta,
        "tutorial_patch": {
            **tutorial_meta,
            "seconds": round(seconds, 3),
            "sha256": sha256(tutorial_path),
            "bytes": tutorial_path.stat().st_size,
        },
        "mask": {"fraction": round(float(np.count_nonzero(union)) / (w * h), 6)},
        "total_inference_seconds": round(total_seconds, 3),
        "hard_checks": {
            "changed_pixels_outside_union_mask": changed,
            "unchanged_outside_union_mask": changed == 0,
            "model_hash_match": sha256(MODEL) == MODEL_SHA,
            "patch_count": len(patch_meta),
        },
        "output": {"sha256": sha256(output), "bytes": output.stat().st_size},
        "decision_rule": "Direct visual QA is authoritative. Promote only if all cars/tutorial overlay are gone, local patch seams are unobtrusive, parking lines remain plausible, and no car-colored ghosts remain.",
    }
    (OUT / "independent_qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(qa, indent=2))


if __name__ == "__main__":
    main()
