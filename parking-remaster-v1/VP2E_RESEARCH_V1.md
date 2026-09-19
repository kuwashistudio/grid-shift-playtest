# Parking Remaster — VP-2E Structured Clean Plate Research v1

Updated: 2026-09-19
Status: candidate method implemented

## Constraint

The following previously tested routes remain retired as primary reconstruction methods: Telea/Navier-Stokes/xphoto FSR, LaMa variants, exemplar quilting, global lowfield, local polynomial-only fill, and precise-alpha harmonic-only fill.

## Research / local prototype result

OpenCV seamless cloning was re-checked only as a possible *secondary* boundary tool. Its documented role is local seamless blending, but it was not adopted here because the clean plate still needs a trustworthy background field first; MIXED_CLONE also preserved unwanted source/destination gradients in local testing.

Two new local prototypes were compared on the exact MASTER:

1. normalized-Gaussian illumination field + MASTER residual texture — **REJECTED LOCALLY** because mask-shaped tonal boundaries remained;
2. regular 40px illumination control grid + nearest missing-cell completion + grid smoothing + deterministic MASTER-derived multi-band asphalt residual + affine boundary colour correction + approved vector markings — **PROMOTED TO CI CANDIDATE TEST**.

This representation is materially different from retired patch quilting: no donor tiles are pasted, so there are no repeated patch seams. It is also different from harmonic-only fill: the background has a mask-independent regular illumination field and non-periodic texture synthesized only from MASTER asphalt statistics.

## Hard invariants

- exact MASTER SHA256;
- exact approved production sprite hashes;
- exact approved VP-2D2 vector model;
- pixels outside the removal mask must remain byte-identical after lossless WebP round-trip;
- no external image source;
- no learned inpainting;
- no Poisson/seamlessClone in the candidate generator;
- no write to assets/clean_plate.webp;
- direct full-resolution + iPhone-scale + Level-1 rebuild visual QA controls promotion.
