# Parking Remaster — Visual Production Gate v1

Updated: 2026-09-18
Status: ACTIVE / PRODUCTION BLOCKER
Parent: PRODUCTION_BLUEPRINT_V1.md / VERTICAL_SLICE_GATE_V1.md

## Why this gate exists

A Vertical Slice must prove a cohesive representative player experience **and** a repeatable way to build the rest of the game.

The current Level 1 runtime contains valid gameplay logic, but the visual implementation is still a Level-1-specific transition hack:
- the approved MASTER contains the parked cars baked into the image;
- when a car moves, runtime expects a background patch and a movable transparent sprite;
- those patch/sprite files are currently absent from the staging branch.

Producing Level 2 logic before solving this would create a false sense of progress. We would have level data that cannot be rendered at the approved quality.

## Repository audit — 2026-09-18

Present:
- `assets/master.webp`
  - 448,118 bytes
  - Git blob `f0bc5be7d4ae9e4995eaa0302d6fd3ec2098babe`
  - canonical approved visual master

Missing:
- `assets/patches/*.webp` — runtime references 10 car-specific files
- `assets/sprites/*.webp` — runtime references 10 car-specific files
- `assets/tutorial_cover.webp`
- `assets/atlas.webp`

Repository code/history search found no committed recoverable atlas/sprite/patch set.

Therefore current visual runtime is **FAIL-CLOSED** for production.

## Research / production conclusion

Do not scale the Level-1 patch trick.

The scalable production architecture is:

### 1. Approved MASTER remains the only visual authority
No redesign, no alternative parking-lot style, no separately generated level artwork.

### 2. Derive one CLEAN PLATE
Create a car-free parking-lot/environment image from the approved MASTER.

Only the car-covered regions may be reconstructed/inpainted.
Everything else must remain unchanged.

The clean plate becomes the reusable environment for all levels.

### 3. Derive reusable transparent CAR SPRITES
Extract the approved MASTER cars into transparent sprites.

Preferred source hierarchy:
1. recover an exact prior canonical atlas if a trustworthy copy becomes available;
2. otherwise derive sprites directly from the approved MASTER;
3. never invent replacement cars.

### 4. Level Data owns placement
A level specifies:
- sprite/car identity
- x/y placement
- orientation
- logical collision body
- direction
- mechanic membership

No level-specific composite background is generated.

### 5. Runtime renders all active cars as sprites
The clean plate is always visible.
All parked cars are real movable sprite elements from frame 1.

This removes:
- car-specific background patches;
- special "reveal patch" behavior;
- Level-1-only baked-car assumptions.

### 6. Level 1 reconstruction test
Before Level 2:
render Level 1 from:
- clean plate
- reusable sprites
- canonical Level 1 placement

and compare against the approved MASTER.

Required visual QA:
- same overall composition;
- same car identities/colors;
- same lighting/shadow character to the extent captured in sprites;
- no visible inpainting artifacts after cars leave;
- no accidental UI/style redesign.

Pixel-perfect equality is not expected in reconstructed under-car regions that were never visible in the MASTER, but visible unchanged regions must remain unchanged.

## Why this is better than generating 14 level images

- one visual extraction job instead of per-level artwork;
- deterministic level production;
- lower bundle size;
- identical car art across all levels;
- Level JSON and Solver remain the source of gameplay truth;
- visual variety comes from arrangement, not uncontrolled image generation;
- asset QA can be automated once.

## Gate requirements

### VP-1 — Asset source integrity
- canonical MASTER present and hash verified;
- source image identity fixed.

### VP-2 — Clean plate
- reusable 941x1672 environment;
- only original car regions altered;
- visual inspection PASS.

### VP-3 — Sprite set
- all 10 MASTER cars have reusable transparent sprites;
- alpha edges/shadows visually acceptable;
- deterministic sprite metadata.

### VP-4 — Level 1 rebuild
- runtime no longer needs patches;
- Level 1 rebuilt entirely from clean plate + sprites + Level Data;
- interaction still passes existing mobile/logic QA.

### VP-5 — Production proof
- create **Level 2 only** from the same clean plate/sprite set;
- no image generation or manual background editing for Level 2;
- Level 2 passes its structural brief and visual readability QA.

Only after VP-5 may Level 3 authoring begin.

## Explicitly rejected paths

- generating a new full background for every level;
- regenerating cars for every level;
- silently replacing the approved MASTER style;
- maintaining 10+ custom erase-patches per arrangement;
- proceeding with Level 2 logic while visual production remains impossible.

## Current next action

Recover or re-derive the reusable visual asset set from the approved MASTER.

The approved MASTER itself exists in GitHub and the original approved source remains identifiable in the user's File Library, but the previously expected atlas is not present in GitHub/File Library search results.

If an exact atlas cannot be recovered, use the MASTER-derived extraction path and validate visually before commit.
