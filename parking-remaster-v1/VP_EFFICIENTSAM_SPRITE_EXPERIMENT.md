# Parking Remaster — EfficientSAM Sprite Extraction Experiment

Updated: 2026-09-19
Status: EXPERIMENT / NOT PRODUCTION

## Why this gate exists

Full-size alpha QA rejected the current GrabCut sprites because background/road/tutorial pixels remain attached to multiple cars.

The problem is semantic object isolation, not crop discovery: Level 1 already has reliable logical car body rectangles and larger sprite crop rectangles.

## Model choice after renewed research

EfficientSAM-Ti is selected for the first promptable-segmentation comparison.

Pinned source:
- yformer/EfficientSAM
- commit d525f622e6f640acf5a0fc37c7ca1f243da5bde0
- official file weights/efficient_sam_vitt.onnx
- Git blob 97614a537b5c02826b31f385790c4b399d33bbc3
- file size 41,365,520 bytes
- Apache-2.0

Why EfficientSAM-Ti before MobileSAM:
- official checkpoint is committed in the upstream repository;
- official ONNX model is committed in the same repository;
- box prompts are natively supported;
- decoder source explicitly defines label 2 as bbox top-left and label 3 as bbox bottom-right;
- dynamic image size is supported;
- easier to pin and reproduce in free GitHub Actions than an external checkpoint workflow.

MobileSAM remains a fallback only if EfficientSAM visual QA is worse than GrabCut.

## Prompt strategy

For each of 10 known cars:
- body box x 1.00;
- body box x 1.10;
- body box x 1.20.

All 30 box queries are evaluated against one image inference.

For each query:
- choose the EfficientSAM candidate with maximum predicted IoU;
- keep the connected component with greatest overlap with the logical car body;
- score predicted IoU, body coverage, leakage outside the established sprite crop, and implausible mask size;
- select one mask per car.

The MASTER pixels are never regenerated. The model supplies alpha only.

## Acceptance gate

Direct full-size checkerboard comparison decides.

PASS requires:
- background leakage materially lower than GrabCut;
- no yellow tutorial/arrow contamination;
- no asphalt blocks attached to cars;
- car hood/roof/body silhouette not clipped;
- all 10 cars recognizable and visually consistent with the approved MASTER.

No candidate is promoted by numeric score alone.
