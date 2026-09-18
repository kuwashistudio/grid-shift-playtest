# Parking Remaster — Clean Plate Method Comparison v1

Updated: 2026-09-18
Status: CANON METHOD DECISION

## Direct visual QA completed

All candidates below were actually rendered and visually inspected, not accepted from CI status alone.

### OpenCV Telea
**REJECTED**

Observed:
- large portions of cars remain recognizable;
- severe blocky smearing;
- parking-space texture does not reconstruct cleanly;
- unusable as a production clean plate.

### OpenCV Navier-Stokes
**REJECTED**

Observed:
- same fundamental problem as Telea;
- recognizable vehicle colors/shapes remain;
- highly visible block artifacts;
- not production quality.

### OpenCV xphoto FSR FAST / BEST
**REJECTED**

Observed:
- huge black/brown/white synthetic blocks replace vehicle regions;
- parking-line continuity is badly damaged;
- substantially worse than LaMa.

This path is retired. Do not wait for or re-run xphoto as a production candidate.

### LaMa refined-mask
**REJECTED**

Observed:
- vehicle silhouettes and details remain as ghost images;
- mask too conservative for complete object removal.

### LaMa sequential
**REJECTED**

Observed:
- residual blue-car coloration;
- inconsistent reconstruction;
- EXIT marking corruption;
- sequential processing compounds local errors.

### LaMa standard union-mask
**CURRENT BEST / NOT YET PRODUCTION PASS**

Observed:
- cars are actually removed;
- most parking-space boundaries remain readable;
- composition remains faithful to the MASTER;
- substantially better than every model-free candidate tested.

Remaining defects:
- broad rectangular tonal/shadow artifacts where cars used to be;
- some reconstructed pavement is visibly different from surrounding texture;
- EXIT/arrow/parking-line geometry needs deterministic protection/restoration;
- therefore it cannot yet be promoted to production clean_plate.webp.

## Sprite extraction result

The OpenCV GrabCut-derived 10-car sprite set received a first visual contact-sheet review.

Status: **PROVISIONAL PASS — FULL-SIZE ALPHA QA STILL REQUIRED**

Observed:
- all 10 expected car identities/colors are recognizable;
- gross background leakage is not obvious at review scale;
- no regenerated/replacement vehicle art was introduced.

Before production promotion:
- inspect full-size alpha edges for each sprite;
- check shadows/halos;
- verify Level 1 reconstruction against MASTER.

## Research after visual QA

### PatchMatch / texture synthesis
PatchMatch is explicitly intended for structural image editing and image completion; permissive MIT/BSD implementations exist. It is attractive as a local pavement-texture correction method because it copies coherent patches from the real source rather than inventing new semantic content.

### ZITS / ZITS++
ZITS targets structural inpainting and restores edges/lines before texture generation. The repositories are Apache-2.0, but inference is substantially heavier and the wireframe component is known to be slow on CPU. It is not the first next step for this small production asset.

### Resynthesizer
GIMP Resynthesizer is a mature texture-synthesis/inpainting system, but GPL-3.0 and GIMP/plugin integration add pipeline weight. It remains a fallback experiment, not the primary route.

## Selected next architecture

**Hybrid deterministic clean-plate finishing**

1. Keep standard LaMa union-mask output as the coarse car-removal base.
2. Detect/protect/reconstruct static geometric markings separately:
   - parking-slot lines;
   - EXIT text region;
   - EXIT arrow/path markings.
3. Correct visible car-shaped tonal blocks with local real-pavement texture synthesis / patch transfer.
4. Preserve all pixels outside approved correction regions.
5. Compare rebuilt Level 1 at iPhone rendering scale.

The objective is not to make LaMa "smarter"; it is to let each method do the part it is good at:
- LaMa: semantic object removal;
- deterministic geometry: straight painted lines/markings;
- real-source patch synthesis: asphalt texture consistency.

## Stop/no-wait rule

A long experimental CI job is never a blocking wait state again.

If an experiment takes materially longer than a normal atomic gate:
- launch it only as an optional comparison;
- continue on a completed viable path;
- inspect the result later;
- never repeatedly poll it while no other progress occurs.

## Next gate

**VP-2C — Hybrid LaMa + geometry/texture correction prototype**

Do one prototype only. Promote nothing until direct visual QA passes.


### LaMa hybrid frequency separation
**REJECTED — direct visual QA**

CI run 35382261854 executed successfully and all hard pixel-boundary invariants passed.

The numeric low-frequency mismatch metric improved in 8 of 10 car regions, but the actual image became visibly worse:
- broad rectangular/vertical tonal bands;
- smeared pavement illumination;
- large block transitions remain obvious at gameplay scale.

This is an explicit example of why visual QA remains authoritative over proxy metrics.

The frequency-separation route is retired. Do not tune its blur/gain parameters further.

### Current active experiment
Independent local LaMa erase patches:
- each patch is inferred from the untouched approved MASTER;
- no generated result becomes another patch's input;
- the experiment tests both individual patch quality and the all-patches composite.


### Independent local LaMa patches — final
**REJECTED after bounded repair**

Run 1 — margin 7px:
- execution PASS;
- cars removed;
- composite substantially better than global LaMa;
- full-resolution review still showed rectangular dark former-car regions.

Run 2 — shadow-expanded margin 26px:
- execution PASS;
- shadow coverage improved;
- EXIT and most parking lines remained intact;
- full-resolution review still exposed rectangular dark patches across the middle/lower lot and visible patch transitions in the upper-right area.

This was the one allowed bounded repair inside the same method.

**LaMa clean-plate tuning is now retired.**
Do not return to standard/sequential/refined/hybrid/local/margin tuning unless new external evidence materially changes the method.

Active route: MASTER-only exemplar texture synthesis / Image Quilting.


### bmquilting MASTER-only Image Quilting
**RETIRED — integration failure after one bounded repair**

Pinned:
- commit `9fd5f97bef7472580e68fdadc15822f7ac896203`
- MIT

Run 1:
- dependency install succeeded;
- built wheel was not importable.

Bounded repair:
- clone exact commit;
- expose `src/` via PYTHONPATH.

Run 2:
- import succeeded;
- fill execution reached library internals;
- seam-blend code raised `TypeError: only 0-dimensional arrays can be converted to Python scalars` in `create_adaptive_blend_mask` with the current NumPy/OpenCV stack.

Do not patch the third-party library further. The generic Image Quilting idea remains available, but this implementation is retired.

### Process change
The canonical MASTER and full sprite set are now packaged for direct local experimentation. Future candidate algorithms should be executed and visually rejected/accepted locally first; CI is added only after a method actually looks production-worthy.


### Rectified-plane generic inpaint
**REJECTED — local direct visual QA**

The lot was treated as a planar surface and tested after perspective rectification, but Telea/Navier-Stokes still produced large bands and implausible filled regions. Perspective normalization alone does not solve this image.

### Quarter-resolution exemplar fill
**REJECTED — local direct visual QA**

A lightweight MASTER-only boundary-matching patch fill completed in about 6.9 seconds at quarter resolution, but the result formed visible mosaic patches and fragmented white parking markings. Scaling this method up would optimize the wrong visual behavior.

### Structured asphalt-field prototype
**REJECTED AS FINAL OUTPUT; retained as architecture evidence**

A three-layer local prototype separated:
1. low-frequency pavement illumination;
2. high-frequency asphalt residual sampled from a clean MASTER donor;
3. parking markings for later restoration.

This eliminated vehicle-color ghosts, but a single repeated texture donor produced visible periodic blocks and the hole-wise low-frequency estimate produced broad illumination bands.

The useful conclusion is architectural:

**Do not ask one generic inpainting algorithm to reconstruct the entire clean plate.**

The next clean-plate system will explicitly model:
- one smooth lot-wide illumination field estimated only from known asphalt;
- multiple real MASTER asphalt donors placed non-periodically;
- parking markings as a separate geometric/vector layer.

Parking-slot research supports extracting linear markings first and arranging detected line structure into slots rather than treating the whole lot as an unstructured texture problem.

### Active clean-plate route
`STRUCTURED_ASPHALT_FIELD_PLUS_VECTOR_MARKINGS`

No return to LaMa mask tuning, Telea/Navier-Stokes, xphoto, bmquilting, or naïve exemplar mosaic fill unless new evidence materially changes their failure mode.
