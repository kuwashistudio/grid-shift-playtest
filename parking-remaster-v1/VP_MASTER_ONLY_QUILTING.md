# Parking Remaster — MASTER-only Image Quilting Experiment

Updated: 2026-09-19
Status: FALLBACK EXPERIMENT

## Why

Independent local LaMa is the final bounded repair of the semantic-inpainting route.
This quilting experiment runs as a non-blocking fallback so the project never waits on a long model job.

## Source integrity

No external image is used.

The only texture source is the approved Parking Remaster MASTER itself.
Every car/shadow/tutorial region is invalidated in the source so those pixels can never be selected as replacement texture.

## Library

bmquilting 2.1.0
Pinned Git commit:
9fd5f97bef7472580e68fdadc15822f7ac896203
License: MIT

The documented fill API explicitly supports masked hole filling. The mask uses zero for the area to fill and 255 for area to keep. set_invalid_texture_area marks hole pixels as invalid source data.

## Two candidates

### Seams
Minimum-error seam blending for structured parking lines.

### Feathering
Faster smooth overlap for stochastic asphalt.

Both use the same MASTER-only source, mask, seed and 49px circular patch diameter.

## Acceptance

Direct visual QA decides:
- no vehicle-colored texture;
- no obvious repeating tiles;
- no broken/misplaced parking lines;
- no impossible lighting blocks;
- no changed pixels outside approved holes.

This experiment cannot automatically promote a production clean plate.
