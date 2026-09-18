# Parking Remaster — Visual Edit Route v1

Updated: 2026-09-18
Status: CANON EXECUTION ROUTE
Parent: VISUAL_PRODUCTION_GATE_V1.md

## Goal

Produce reusable production visuals from the one approved Parking Remaster MASTER without redesigning the game:

1. car-free clean plate;
2. ten transparent reusable car sprites;
3. Level 1 rebuilt from those assets;
4. only then Level 2.

## Research-backed tool choice

### Clean plate
Use Photoshop/Adobe object-removal editing on the approved MASTER.

The edit instruction is constrained to:
- remove only parked cars;
- preserve camera, crop, asphalt, parking lines, curbs, grass, trees, road, lighting and every non-car element;
- reconstruct only pixels that were hidden by cars;
- no redesign/restyle/new objects/text.

### Car sprites
Do **not** regenerate cars.

For each canonical Level 1 car:
1. crop the approved MASTER to its existing sprite bounds;
2. run background removal on that crop;
3. retain original car pixels/shadow character as far as possible;
4. export transparency-preserving PNG/WebP;
5. record deterministic metadata mapping sprite ID -> original MASTER bounds.

This reuses the exact approved car art and avoids style drift.

## Runtime target

Use:
- one static clean plate;
- reusable transparent car sprites;
- CSS transform animation for moving sprites.

The static background must not be repainted every animation frame. Repeated visual objects should be reusable rather than rebuilt per frame.

## Current input-route blocker

### Attempt A — Adobe upload from GitHub raw URL
FAILED.

Observed tool-wrapper mismatch:
- exposed wrapper accepts a list of strings;
- Adobe backend expects fileParams objects;
- passing a URL string reached Adobe but was rejected as not being an object;
- passing a fileParams object was rejected by the wrapper schema as not being a string.

This route is retired unless the connector contract changes.

### Attempt B — Adobe image edit directly from GitHub raw URL
FAILED before editing.

Reason:
- Adobe security allowlist rejected `raw.githubusercontent.com`.

No image mutation occurred.

## Next input route

Use the approved original image already present in ChatGPT File Library:

`レベル1：駐車場脱出パズル.png`

The File Library search reconfirmed it on 2026-09-18.

Preferred next attempt:
- stage the stable ChatGPT file reference into Adobe Creative Cloud;
- if accepted, create one clean-plate candidate;
- inspect before any repository commit.

## Fail-closed rule

Do not:
- use a different parking image;
- regenerate the parking scene;
- substitute competitor art;
- manually fake a clean plate;
- start Level 2 before production visuals exist.

If Adobe input staging remains unavailable, preserve this blocker and change the transfer method; do not redesign the asset pipeline.

## Acceptance sequence

VP-2A Source transfer
- exact approved source enters Adobe tooling.

VP-2B Clean plate candidate
- all cars removed;
- composition/camera/non-car pixels retained;
- subjective visual review PASS.

VP-3 Sprite extraction
- 10 canonical cars;
- transparency;
- visual identity preserved.

VP-4 Level 1 rebuild
- no patch assets;
- clean plate + sprites + Level JSON only.

VP-5 Level 2 proof
- same visual assets, new Level Data only.
