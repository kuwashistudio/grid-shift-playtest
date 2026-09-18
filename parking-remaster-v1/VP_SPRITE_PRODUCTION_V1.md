# Parking Remaster — Production Sprite Gate v1

Updated: 2026-09-19
Status: **PASS**
Parent: VISUAL_PRODUCTION_GATE_V1.md

## Decision

The reusable 10-car production sprite set is complete and committed.

This closes the **Sprite half** of the Visual Production Gate only.
The overall Visual Production Gate remains CLOSED until a production clean plate exists and Level 1 is rebuilt from clean plate + sprites without Level-1-only patches.

## Source authority

Every production sprite keeps RGB pixels from the one approved MASTER:

- `assets/master.webp`
- SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`

No car was redrawn or regenerated.

## Segmentation method

EfficientSAM-Ti was selected after direct full-size comparison against the previous GrabCut candidates.

Pinned provenance:

- repository: `yformer/EfficientSAM`
- commit: `d525f622e6f640acf5a0fc37c7ca1f243da5bde0`
- license: Apache-2.0
- encoder Git blob: `6458f72477ae216a1bd68db41ffa14802c8d54f1`
- decoder Git blob: `f9310202c916fe5a4ec9a6897edae855caf023f4`

Box prompts are derived from canonical Level 1 body bounds.
The model determines alpha only.

## Direct visual QA result

EfficientSAM materially reduced the background/road leakage visible in the GrabCut set across the 10-car comparison.

The only systematic remaining issue was the baked yellow tutorial glow attached to `red_top`.

For `red_top` only, a deterministic alpha refinement removes yellow semantic pixels more than 1.5 px from the non-yellow car core.

Recorded result:
- yellow semantic pixels: 2,324
- removed yellow pixels: 1,477
- refined logical-body coverage: 0.919222

The RGB still comes from the approved MASTER.

## Production encoding

Sprites are transparent WebP written through Pillow/libwebp with:
- `lossless=True`
- `quality=100`
- `method=6`
- `exact=True`

The build re-opens every output and requires zero RGBA pixel delta before promotion.

## Evidence

GitHub Actions run:
- `35400261077` — SUCCESS

Promotion commit written by GitHub Actions:
- `17e2ba0f79a28e0903fa1e930e0b6fc831b33b05`

Production result:
- `VP_SPRITE_PRODUCTION_RESULT.json`
- status: PASS
- sprite_count: 10

Static integrity validator:
- `scripts/validate_production_sprites.py`

## Remaining visual blocker

**Clean Plate only.**

Next visual gate:
1. derive production clean plate from approved MASTER;
2. rebuild Level 1 with clean plate + these 10 sprites;
3. compare rebuilt Level 1 against VISUAL MASTER;
4. remove runtime patch dependency;
5. only then unlock Level 2.
