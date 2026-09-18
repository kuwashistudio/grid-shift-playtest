# Parking Remaster — Model-Free Clean Plate Experiment v2

Updated: 2026-09-18
Status: EXPERIMENT

The first OpenCV Telea/Navier-Stokes candidate passed structural QA but failed visual review:
- several cars remained as dark/colored smears;
- the central yellow arrow region bled into a large cross-shaped artifact;
- parking-space texture/lines were not reconstructed to production quality.

Root causes:
1. Telea/NS are not suitable enough for these large structured holes.
2. The clean-plate mask was derived from GrabCut sprite alpha, so imperfect foreground segmentation left vehicle remnants.

## v2 changes

### Mask
For clean-plate generation, sprite extraction and object removal are now decoupled.

The clean-plate removal mask uses the **entire canonical sprite rectangle** for each of the 10 Level 1 cars, expanded by a fixed 3 px margin. This guarantees the vehicle and its baked shadow/background contamination are completely inside the removed region.

### Inpainting
Test OpenCV xphoto FSR Fast and FSR Best.

OpenCV documents xphoto FSR as a separate single-image inpainting family, with Fast and Best quality profiles. This remains:
- model-free;
- account-free;
- API-free;
- CPU-only;
- deterministic build-time processing.

The algorithm is run only on the bounding ROI around all car rectangles plus margin, not the entire 941x1672 image.

## Promotion rule

Hard QA can prove:
- exact approved source;
- all 10 removal rectangles covered;
- unchanged source pixels outside the mask;
- deterministic output.

Visual review must still prove:
- no vehicle remnants;
- no obvious smear blocks;
- parking bay lines remain visually coherent;
- asphalt texture is plausible at iPhone scale.

If both FSR profiles fail that visual review, model-free clean-plate inpainting is retired and the next candidate is LaMa **only for clean-plate build time**.

LaMa is Apache-2.0 and its official project specifically reports robust high-resolution inpainting and difficult periodic-structure completion, making it a more targeted fallback than another SaaS editor.
