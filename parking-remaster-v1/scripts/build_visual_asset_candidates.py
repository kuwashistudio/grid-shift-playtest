#!/usr/bin/env python3
"""Deterministic zero-SaaS visual asset candidate builder for Parking Remaster.

This is a CANDIDATE generator, not a production-quality auto-approval step.
Source authority:
  assets/master.webp
  levels/level_001.json

Outputs are intentionally PNG during QA so alpha and unchanged-pixel checks are lossless.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets" / "master.webp"
LEVEL = ROOT / "levels" / "level_001.json"
OUT = ROOT / "assets" / "candidates"
SPRITES = OUT / "sprites"
QA = ROOT / "VISUAL_FACTORY_CANDIDATE_QA.json"

GRABCUT_ITERS = 5
ALPHA_THRESHOLD_FOR_PLATE = 32
PLATE_MASK_DILATE = 7
INPAINT_RADIUS = 5.0


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clamp_rect(rect, width, height):
    x1, y1, x2, y2 = [int(round(v)) for v in rect]
    x1 = max(0, min(width - 1, x1))
    y1 = max(0, min(height - 1, y1))
    x2 = max(x1 + 1, min(width, x2))
    y2 = max(y1 + 1, min(height, y2))
    return x1, y1, x2, y2


def segment_vehicle(master_bgr, vehicle):
    h, w = master_bgr.shape[:2]
    sx1, sy1, sx2, sy2 = clamp_rect(vehicle["sprite"], w, h)
    bx1, by1, bx2, by2 = clamp_rect(vehicle["body"], w, h)

    crop = master_bgr[sy1:sy2, sx1:sx2].copy()
    ch, cw = crop.shape[:2]
    if ch < 8 or cw < 8:
        raise ValueError(f"{vehicle['id']}: crop too small")

    # Four-state GrabCut initialization:
    # outer crop border = certain background;
    # canonical logical body = probable foreground;
    # conservative interior of body = certain foreground.
    mask = np.full((ch, cw), cv2.GC_PR_BGD, dtype=np.uint8)
    border = max(2, min(ch, cw) // 30)
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD

    rx1, ry1 = max(0, bx1 - sx1), max(0, by1 - sy1)
    rx2, ry2 = min(cw, bx2 - sx1), min(ch, by2 - sy1)
    if rx2 <= rx1 or ry2 <= ry1:
        raise ValueError(f"{vehicle['id']}: body does not overlap sprite crop")
    mask[ry1:ry2, rx1:rx2] = cv2.GC_PR_FGD

    inset_x = max(2, int((rx2 - rx1) * 0.18))
    inset_y = max(2, int((ry2 - ry1) * 0.18))
    ix1, iy1 = rx1 + inset_x, ry1 + inset_y
    ix2, iy2 = rx2 - inset_x, ry2 - inset_y
    if ix2 > ix1 and iy2 > iy1:
        mask[iy1:iy2, ix1:ix2] = cv2.GC_FGD

    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.setRNGSeed(20260918)
    cv2.grabCut(master_bgr[sy1:sy2, sx1:sx2], mask, None, bgd, fgd, GRABCUT_ITERS, cv2.GC_INIT_WITH_MASK)

    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Remove isolated specks while preserving car silhouette, then feather one-pixel-ish edge.
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    alpha = cv2.GaussianBlur(binary, (5, 5), 0.8)

    rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha

    nonzero = int(np.count_nonzero(alpha > 16))
    coverage = nonzero / float(ch * cw)
    if coverage < 0.12 or coverage > 0.90:
        raise ValueError(f"{vehicle['id']}: suspicious foreground coverage {coverage:.4f}")

    full_alpha = np.zeros((h, w), dtype=np.uint8)
    full_alpha[sy1:sy2, sx1:sx2] = alpha
    return rgba, full_alpha, {
        "sprite_rect": [sx1, sy1, sx2, sy2],
        "body_rect": [bx1, by1, bx2, by2],
        "coverage": round(coverage, 6),
        "crop_width": cw,
        "crop_height": ch,
        "alpha_nonzero_pixels": nonzero,
    }


def make_contact_sheet(master, telea, ns, sprite_paths):
    scale = 0.32
    panels = []
    for label, image in [("MASTER", master), ("TELEA", telea), ("NAVIER_STOKES", ns)]:
        thumb = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        cv2.rectangle(thumb, (0, 0), (thumb.shape[1] - 1, 36), (20, 20, 20), -1)
        cv2.putText(thumb, label, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
        panels.append(thumb)
    top = np.hstack(panels)

    tiles = []
    for path in sprite_paths:
        im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if im is None:
            continue
        canvas = np.full((180, 180, 4), 255, dtype=np.uint8)
        canvas[:, :, 3] = 255
        ih, iw = im.shape[:2]
        s = min(150 / max(iw, 1), 150 / max(ih, 1), 1.0)
        resized = cv2.resize(im, (max(1, int(iw * s)), max(1, int(ih * s))), interpolation=cv2.INTER_AREA)
        rh, rw = resized.shape[:2]
        y, x = (180 - rh) // 2, (180 - rw) // 2
        alpha = resized[:, :, 3:4].astype(np.float32) / 255.0
        canvas_rgb = canvas[y:y+rh, x:x+rw, :3].astype(np.float32)
        fg = resized[:, :, :3].astype(np.float32)
        canvas[y:y+rh, x:x+rw, :3] = (fg * alpha + canvas_rgb * (1 - alpha)).astype(np.uint8)
        canvas_bgr = np.ascontiguousarray(canvas[:, :, :3])
        cv2.putText(canvas_bgr, path.stem[:12], (5, 173), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (30, 30, 30), 1, cv2.LINE_AA)
        tiles.append(canvas_bgr)

    if tiles:
        while len(tiles) % 5:
            tiles.append(np.full_like(tiles[0], 255))
        rows = [np.hstack(tiles[i:i+5]) for i in range(0, len(tiles), 5)]
        sprites = np.vstack(rows)
        sprites = cv2.resize(sprites, (top.shape[1], int(sprites.shape[0] * top.shape[1] / sprites.shape[1])), interpolation=cv2.INTER_AREA)
        sheet = np.vstack([top, sprites])
    else:
        sheet = top
    cv2.imwrite(str(OUT / "candidate_contact_sheet.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 92])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SPRITES.mkdir(parents=True, exist_ok=True)

    level = json.loads(LEVEL.read_text(encoding="utf-8"))
    master = cv2.imread(str(MASTER), cv2.IMREAD_COLOR)
    if master is None:
        raise SystemExit("FAIL: could not decode assets/master.webp")
    h, w = master.shape[:2]
    if [w, h] != [level["board"]["width"], level["board"]["height"]]:
        raise SystemExit(f"FAIL: master {w}x{h} != level board {level['board']['width']}x{level['board']['height']}")

    union = np.zeros((h, w), dtype=np.uint8)
    sprite_meta = {}
    sprite_paths = []

    for vehicle in level["vehicles"]:
        rgba, full_alpha, meta = segment_vehicle(master, vehicle)
        out = SPRITES / f"{vehicle['id']}.png"
        if not cv2.imwrite(str(out), rgba):
            raise SystemExit(f"FAIL: could not write {out}")
        sprite_paths.append(out)
        union = np.maximum(union, full_alpha)
        meta["sha256"] = sha256(out)
        meta["bytes"] = out.stat().st_size
        sprite_meta[vehicle["id"]] = meta

    raw_mask = np.where(union > ALPHA_THRESHOLD_FOR_PLATE, 255, 0).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (PLATE_MASK_DILATE * 2 + 1, PLATE_MASK_DILATE * 2 + 1))
    plate_mask = cv2.dilate(raw_mask, kernel, iterations=1)
    cv2.imwrite(str(OUT / "car_removal_mask.png"), plate_mask)

    telea = cv2.inpaint(master, plate_mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    ns = cv2.inpaint(master, plate_mask, INPAINT_RADIUS, cv2.INPAINT_NS)
    telea_path = OUT / "clean_plate_telea.png"
    ns_path = OUT / "clean_plate_ns.png"
    cv2.imwrite(str(telea_path), telea)
    cv2.imwrite(str(ns_path), ns)

    # Hard invariant: OpenCV inpaint may alter only masked pixels.
    outside = plate_mask == 0
    telea_changed_outside = int(np.count_nonzero(np.any(telea[outside] != master[outside], axis=1)))
    ns_changed_outside = int(np.count_nonzero(np.any(ns[outside] != master[outside], axis=1)))

    make_contact_sheet(master, telea, ns, sprite_paths)

    mask_fraction = float(np.count_nonzero(plate_mask)) / float(h * w)
    qa = {
        "gate": "VP_ZERO_SAAS_CANDIDATE",
        "status": "CANDIDATE_BUILT_VISUAL_REVIEW_REQUIRED",
        "source": {
            "path": str(MASTER.relative_to(ROOT)),
            "sha256": sha256(MASTER),
            "width": w,
            "height": h,
        },
        "method": {
            "sprite_segmentation": "OpenCV GrabCut with deterministic mask initialization",
            "clean_plate_candidates": ["OpenCV Telea", "OpenCV Navier-Stokes"],
            "external_ai_api": False,
            "external_model_checkpoint": False,
            "rng_seed": 20260918,
            "grabcut_iterations": GRABCUT_ITERS,
            "inpaint_radius": INPAINT_RADIUS,
            "plate_mask_dilate": PLATE_MASK_DILATE,
        },
        "sprites": sprite_meta,
        "checks": {
            "sprite_count": len(sprite_paths),
            "expected_sprite_count": len(level["vehicles"]),
            "plate_mask_fraction": round(mask_fraction, 6),
            "telea_changed_pixels_outside_mask": telea_changed_outside,
            "ns_changed_pixels_outside_mask": ns_changed_outside,
            "unchanged_outside_mask": telea_changed_outside == 0 and ns_changed_outside == 0,
        },
        "outputs": {
            "telea": {"path": str(telea_path.relative_to(ROOT)), "sha256": sha256(telea_path), "bytes": telea_path.stat().st_size},
            "navier_stokes": {"path": str(ns_path.relative_to(ROOT)), "sha256": sha256(ns_path), "bytes": ns_path.stat().st_size},
            "mask": str((OUT / "car_removal_mask.png").relative_to(ROOT)),
            "contact_sheet": str((OUT / "candidate_contact_sheet.jpg").relative_to(ROOT)),
        },
        "decision_rule": "Do not promote either clean plate or sprites to production until visual review passes. If line/texture reconstruction is inadequate, evaluate LaMa for clean-plate-only build-time use; do not change the approved visual master."
    }
    QA.write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    (OUT / "sprite_manifest.json").write_text(json.dumps(sprite_meta, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(qa["checks"], indent=2))


if __name__ == "__main__":
    main()
