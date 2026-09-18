# Parking Remaster — Zero-SaaS Visual Factory Research v1

Updated: 2026-09-18
Status: IMPLEMENTATION CHOICE FOR FIRST CANDIDATE

## Constraint

The production pipeline must not depend on Adobe/Firefly credits, paid background-removal APIs, or another SaaS with usage quotas.

The approved MASTER remains the visual authority.

## Options researched

### OpenCV GrabCut + inpaint
Selected for first candidate.

Why:
- open-source local library;
- no account/API/credits;
- known Level 1 car rectangles already provide strong segmentation priors;
- GrabCut accepts rectangle/mask initialization;
- OpenCV inpaint reconstructs only explicitly masked regions from neighboring pixels;
- can run on CPU;
- deterministic workflow can be pinned in GitHub Actions.

Risk:
- parking lines or structured texture hidden beneath large cars may reconstruct poorly.
- therefore this is a candidate generator, not auto-approved production art.

### rembg
Not selected as the first dependency.

The rembg application is MIT, supports CPU ONNX inference and multiple local models. However model weights have independent licenses. Its current default BRIA model documentation specifically warns that commercial use requires a paid agreement. This makes "pip install rembg and use the default" an unacceptable production assumption.

A separately vetted permissive model could still be considered later for sprite alpha refinement.

### SAM 2
Not selected for this task.

SAM 2 is Apache 2.0 and excellent for promptable segmentation, but requires PyTorch and model checkpoints. It is unnecessary overhead when all 10 car bounds are already known.

### LaMa
Reserved fallback for CLEAN PLATE ONLY.

LaMa is Apache 2.0 and specifically reports strong high-resolution inpainting and challenging periodic-structure completion. That makes it the strongest researched fallback if OpenCV cannot reconstruct asphalt/parking lines well enough.

It would be used once at build time, never shipped to the game and never required at runtime.

## GitHub Actions feasibility

Current standard Linux GitHub-hosted runners provide 4 CPU, 16 GB RAM and 14 GB SSD. The first candidate therefore deliberately uses CPU-only OpenCV and no model checkpoint.

## Decision ladder

1. Build deterministic OpenCV candidate.
2. Verify hard invariants automatically.
3. Visually inspect contact sheet.
4. If sprites are weak, refine segmentation separately; do not regenerate cars.
5. If clean plate is weak, test LaMa only for inpainting.
6. Promote only after Level 1 reconstruction visual QA.

## No false PASS

Automatic QA can prove:
- correct source hash;
- exact dimensions;
- 10 outputs;
- transparency exists;
- clean plate changes no pixels outside the removal mask;
- reproducibility.

Automatic QA cannot prove that hidden parking lines were reconstructed beautifully.

That remains an explicit visual-review gate.
