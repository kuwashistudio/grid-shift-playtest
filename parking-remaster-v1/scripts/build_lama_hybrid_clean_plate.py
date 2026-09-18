#!/usr/bin/env python3
"""Parking Remaster VP-2C hybrid clean-plate prototype.

One-shot build-time experiment:
1) remove all 10 cars + baked tutorial arrow/glow with the pinned LaMa ONNX model;
2) correct only low-frequency tone inside the approved removal mask;
3) retain LaMa high-frequency pavement texture;
4) never alter pixels outside the removal mask.

This script produces QA artifacts only. It does not promote production assets.
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
OUT = ROOT / ".qa" / "lama_hybrid"

MASTER_SHA = "535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0"
MODEL_SHA = "1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6"

CAR_MARGIN = 3
# Removes the baked yellow tutorial arrow/glow without covering the EXIT label.
TUTORIAL_RECT = [340, 445, 545, 790]

LOW_SCALE = 8
LOW_INPAINT_RADIUS = 5.0
RESIDUAL_SIGMA = 13.0
RESIDUAL_GAIN = 0.72
BLEND_DISTANCE = 14.0


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def expand(rect, margin, width, height):
    x1, y1, x2, y2 = [int(round(v)) for v in rect]
    return [
        max(0, x1 - margin),
        max(0, y1 - margin),
        min(width, x2 + margin),
        min(height, y2 + margin),
    ]


def build_mask(level, width, height):
    mask = np.zeros((height, width), np.uint8)
    rects = {}
    for vehicle in level["vehicles"]:
        rect = expand(vehicle["sprite"], CAR_MARGIN, width, height)
        rects[vehicle["id"]] = rect
        x1, y1, x2, y2 = rect
        mask[y1:y2, x1:x2] = 255
    tx1, ty1, tx2, ty2 = TUTORIAL_RECT
    mask[ty1:ty2, tx1:tx2] = 255
    return mask, rects


def run_lama(bgr, mask):
    h, w = bgr.shape[:2]
    ys, xs = np.where(mask > 0)
    y1 = max(0, int(ys.min()) - 56)
    y2 = min(h, int(ys.max()) + 1 + 56)
    x1, x2 = 0, w

    roi = bgr[y1:y2, x1:x2].copy()
    roi_mask = mask[y1:y2, x1:x2].copy()
    rh, rw = roi.shape[:2]
    side = max(rh, rw)
    top = (side - rh) // 2
    bottom = side - rh - top
    left = (side - rw) // 2
    right = side - rw - left

    rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    sq = cv2.copyMakeBorder(rgb, top, bottom, left, right, cv2.BORDER_REFLECT_101)
    sqm = cv2.copyMakeBorder(roi_mask, top, bottom, left, right, cv2.BORDER_CONSTANT, value=0)

    image = cv2.resize(sq, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    model_mask = (cv2.resize(sqm, (512, 512), interpolation=cv2.INTER_NEAREST) > 127).astype(np.float32)
    image = np.transpose(image, (2, 0, 1))[None, ...]
    model_mask = model_mask[None, None, ...]

    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    session = ort.InferenceSession(str(MODEL), sess_options=so, providers=["CPUExecutionProvider"])
    if {i.name for i in session.get_inputs()} != {"image", "mask"}:
        raise RuntimeError("unexpected LaMa model inputs")

    started = time.perf_counter()
    out = session.run(None, {"image": image, "mask": model_mask})[0]
    seconds = time.perf_counter() - started

    arr = out[0].transpose(1, 2, 0)
    if float(np.nanmax(arr)) <= 2.0:
        arr *= 255.0
    arr = np.clip(arr, 0, 255).astype(np.uint8)

    pred_sq = cv2.resize(arr, (side, side), interpolation=cv2.INTER_CUBIC)
    pred = pred_sq[top:top + rh, left:left + rw]
    pred_bgr = cv2.cvtColor(pred, cv2.COLOR_RGB2BGR)

    raw = bgr.copy()
    target = raw[y1:y2, x1:x2]
    target[roi_mask > 0] = pred_bgr[roi_mask > 0]
    return raw, seconds, {
        "xyxy": [x1, y1, x2, y2],
        "raw_wh": [rw, rh],
        "square_side": side,
        "padding": [left, top, right, bottom],
    }


def hybrid_tone_correct(raw, mask):
    """Replace only low-frequency color/illumination inside mask.

    A tiny downsampled inpaint estimates the surrounding illumination field.
    The LaMa high-frequency residual is retained to preserve asphalt texture.
    """
    h, w = raw.shape[:2]
    sw = max(8, int(round(w / LOW_SCALE)))
    sh = max(8, int(round(h / LOW_SCALE)))

    small = cv2.resize(raw, (sw, sh), interpolation=cv2.INTER_AREA)
    small_mask = cv2.resize(mask, (sw, sh), interpolation=cv2.INTER_NEAREST)
    small_mask = np.where(small_mask > 0, 255, 0).astype(np.uint8)
    low_small = cv2.inpaint(small, small_mask, LOW_INPAINT_RADIUS, cv2.INPAINT_TELEA)
    target_low = cv2.resize(low_small, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)

    lama_low = cv2.GaussianBlur(raw, (0, 0), RESIDUAL_SIGMA).astype(np.float32)
    residual = raw.astype(np.float32) - lama_low
    corrected = np.clip(target_low + residual * RESIDUAL_GAIN, 0, 255)

    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    alpha = np.clip(distance / BLEND_DISTANCE, 0.0, 1.0)[..., None]
    alpha *= (mask > 0)[..., None].astype(np.float32)

    final = raw.astype(np.float32) * (1.0 - alpha) + corrected * alpha
    final = np.clip(final, 0, 255).astype(np.uint8)
    # Hard invariant: force exact original raw pixels outside mask.
    final[mask == 0] = raw[mask == 0]
    return final


def yellow_count(image, rect):
    x1, y1, x2, y2 = rect
    roi = image[y1:y2, x1:x2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    # broad yellow/orange range for the baked tutorial arrow/glow
    sel = (hsv[:, :, 0] >= 10) & (hsv[:, :, 0] <= 42) & (hsv[:, :, 1] >= 90) & (hsv[:, :, 2] >= 120)
    return int(np.count_nonzero(sel))


def low_frequency_mismatch(image, mask, rects):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    light = cv2.GaussianBlur(lab[:, :, 0], (0, 0), 18).astype(np.float32)
    h, w = mask.shape
    values = {}
    for vid, rect in rects.items():
        x1, y1, x2, y2 = rect
        local = np.zeros_like(mask)
        local[y1:y2, x1:x2] = 255
        inner = cv2.erode(local, np.ones((9, 9), np.uint8), iterations=1) > 0
        outer = cv2.dilate(local, np.ones((41, 41), np.uint8), iterations=1)
        ring = (outer > 0) & (local == 0)
        if np.count_nonzero(inner) == 0 or np.count_nonzero(ring) == 0:
            continue
        values[vid] = round(abs(float(light[inner].mean()) - float(light[ring].mean())), 4)
    return values


def make_review(master, raw, hybrid):
    thumbs = []
    for label, image in [("MASTER", master), ("LAMA+TUTORIAL_MASK", raw), ("HYBRID", hybrid)]:
        thumb = cv2.resize(image, (314, 558), interpolation=cv2.INTER_AREA)
        cv2.rectangle(thumb, (0, 0), (thumb.shape[1] - 1, 42), (18, 18, 18), -1)
        cv2.putText(thumb, label, (8, 29), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)
        thumbs.append(thumb)
    sheet = np.hstack(thumbs)
    cv2.imwrite(str(OUT / "hybrid_compare.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 91])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if sha256(MASTER) != MASTER_SHA:
        raise SystemExit("FAIL master hash")
    if sha256(MODEL) != MODEL_SHA:
        raise SystemExit("FAIL model hash")

    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    master = cv2.imread(str(MASTER), cv2.IMREAD_COLOR)
    if master is None:
        raise SystemExit("FAIL master decode")
    h, w = master.shape[:2]

    mask, rects = build_mask(level, w, h)
    raw, sec, roi_meta = run_lama(master, mask)
    hybrid = hybrid_tone_correct(raw, mask)

    raw_path = OUT / "clean_plate_lama_plus_tutorial.png"
    hybrid_path = OUT / "clean_plate_hybrid.png"
    mask_path = OUT / "hybrid_mask.png"
    cv2.imwrite(str(raw_path), raw)
    cv2.imwrite(str(hybrid_path), hybrid)
    cv2.imwrite(str(mask_path), mask)
    make_review(master, raw, hybrid)

    outside = mask == 0
    raw_out = int(np.count_nonzero(np.any(raw[outside] != master[outside], axis=1)))
    hybrid_out = int(np.count_nonzero(np.any(hybrid[outside] != master[outside], axis=1)))

    yellow_master = yellow_count(master, TUTORIAL_RECT)
    yellow_raw = yellow_count(raw, TUTORIAL_RECT)
    yellow_hybrid = yellow_count(hybrid, TUTORIAL_RECT)

    raw_mismatch = low_frequency_mismatch(raw, mask, rects)
    hybrid_mismatch = low_frequency_mismatch(hybrid, mask, rects)
    comparable = sorted(set(raw_mismatch) & set(hybrid_mismatch))
    improved = [k for k in comparable if hybrid_mismatch[k] < raw_mismatch[k]]

    qa = {
        "gate": "VP_2C_HYBRID_CLEAN_PLATE",
        "status": "VISUAL_REVIEW_REQUIRED",
        "source": {"sha256": sha256(MASTER), "width": w, "height": h},
        "model": {
            "source": "Carve/LaMa-ONNX lama_fp32.onnx",
            "license": "apache-2.0",
            "sha256": sha256(MODEL),
            "runtime": "onnxruntime CPUExecutionProvider",
        },
        "mask": {
            "strategy": "standard car sprite rectangles + fixed margin + tutorial arrow/glow rectangle",
            "car_margin_px": CAR_MARGIN,
            "tutorial_rect": TUTORIAL_RECT,
            "fraction": round(float(np.count_nonzero(mask)) / (w * h), 6),
        },
        "lama": {"inference_seconds": round(sec, 3), "roi": roi_meta},
        "tone_correction": {
            "method": "low-resolution surrounding-field inpaint + retained LaMa high-frequency residual",
            "low_scale": LOW_SCALE,
            "low_inpaint_radius": LOW_INPAINT_RADIUS,
            "residual_sigma": RESIDUAL_SIGMA,
            "residual_gain": RESIDUAL_GAIN,
            "blend_distance": BLEND_DISTANCE,
        },
        "metrics": {
            "yellow_pixels": {
                "master": yellow_master,
                "lama_plus_tutorial_mask": yellow_raw,
                "hybrid": yellow_hybrid,
                "raw_reduction_vs_master": round(1.0 - yellow_raw / max(1, yellow_master), 4),
                "hybrid_reduction_vs_master": round(1.0 - yellow_hybrid / max(1, yellow_master), 4),
            },
            "low_frequency_mismatch_raw": raw_mismatch,
            "low_frequency_mismatch_hybrid": hybrid_mismatch,
            "regions_improved": len(improved),
            "regions_compared": len(comparable),
        },
        "hard_checks": {
            "raw_changed_pixels_outside_mask": raw_out,
            "hybrid_changed_pixels_outside_mask": hybrid_out,
            "unchanged_outside_mask": raw_out == 0 and hybrid_out == 0,
            "model_hash_match": sha256(MODEL) == MODEL_SHA,
        },
        "outputs": {
            "raw": {"sha256": sha256(raw_path), "bytes": raw_path.stat().st_size},
            "hybrid": {"sha256": sha256(hybrid_path), "bytes": hybrid_path.stat().st_size},
            "mask": {"sha256": sha256(mask_path), "bytes": mask_path.stat().st_size},
            "review": "hybrid_compare.jpg",
        },
        "decision_rule": "Direct visual QA is authoritative. Promote nothing unless car/tutorial remnants are absent, tonal rectangles are materially reduced, parking lines/EXIT remain plausible, and no new artifacts are introduced.",
    }
    (OUT / "hybrid_qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(qa, indent=2))


if __name__ == "__main__":
    main()
