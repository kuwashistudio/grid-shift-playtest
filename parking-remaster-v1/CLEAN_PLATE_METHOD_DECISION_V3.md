# Parking Remaster — Clean Plate Method Decision v3

Updated: 2026-09-18
Status: LaMa comparison in progress

## Visually rejected

### OpenCV Telea
FAIL.
Large smeared car-shaped regions remain; parking lines and asphalt structure are not plausibly reconstructed.

### OpenCV Navier-Stokes
FAIL.
Same class of visible structural artifacts.

### OpenCV xphoto FSR FAST/BEST
FAIL.
Direct visual review of the successful artifact showed very large block/smear regions. FSR BEST was also ~460 seconds on the runner, so it is both lower quality and inefficient for this source.

These methods are retired for the clean plate. No further parameter tuning unless new evidence changes the problem.

## Sprite extraction
GrabCut-derived 10-car sprite set is provisionally promising, but not production-approved. Full-resolution edge QA remains required.

## Current experiment
LaMa ONNX, build-time only.

Reasons:
- LaMa research targets large-mask inpainting and periodic structures;
- Apache-2.0 model card;
- pinned model SHA256;
- no SaaS/API/credits;
- model never ships with the game;
- square ROI preserves source aspect ratio;
- only masked pixels are promoted back into the master.

Production promotion still requires visual PASS.
