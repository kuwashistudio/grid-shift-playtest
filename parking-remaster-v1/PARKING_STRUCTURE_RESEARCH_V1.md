# Parking Remaster — VP-2D Parking Structure Research v1

Updated: 2026-09-19
Status: GLOBAL HOUGH ROUTE REJECTED AFTER ONE BOUNDED REPAIR

## Decision

The clean-plate problem is no longer treated as generic image inpainting.

For this MASTER the next useful representation is:

1. visible painted-marking extraction;
2. line-segment detection;
3. line-family / repeated-track grouping;
4. candidate grid-node inference;
5. known-asphalt separation;
6. smooth illumination fit from known asphalt only;
7. multiple MASTER-only donor windows.

No new pixels are promoted in VP-2D.

## Research basis

- OpenCV documents the Probabilistic Hough transform as returning line-segment endpoints directly. Its `minLineLength` and `maxLineGap` controls are appropriate for fragmented painted markings.
- Wu et al. (2018), *VH-HFCN based Parking Slot and Lane Markings Segmentation on Panoramic Surround View*, reconstruct parking slots/lanes from segmented linear markings using skeletonization, Hough transform and line arrangement.
- DMPR-PS (2019) reinforces that parking-slot structure can be inferred from marking-point position/orientation plus geometric rules rather than semantic texture completion.

## MASTER-specific implementation

`scripts/detect_parking_structure.py`

Hard rules:
- exact MASTER SHA256 required;
- analysis limited to the parking-lot ROI;
- all Level-1 vehicle sprite rectangles are expanded and excluded;
- tutorial region is excluded;
- marking detection uses a low-saturation bright-paint mask plus CLAHE/Canny and `HoughLinesP`;
- line families are clustered deterministically in orientation space;
- known asphalt excludes cars/tutorial/paint and extreme luminance/saturation pixels;
- illumination uses a deterministic second-order polynomial in normalized image coordinates;
- donor windows must be real MASTER pixels and pass asphalt/paint coverage gates;
- no clean plate is written or promoted.

## QA rule

Machine output alone cannot close VP-2D. The overlay must be visually checked against the canonical MASTER. One bounded detector adjustment is allowed if the overlay is materially wrong; repeated parameter tuning is not.


## Direct visual QA result — 2026-09-19

The initial machine pass was not accepted from metrics alone. Its overlay was directly reviewed on the exact MASTER.

Initial result:
- 80 accepted segments;
- 3 orientation families;
- 18 candidate grid nodes;
- 77,258 known-asphalt pixels;
- 0 safe donor windows.

One bounded repair was allowed and implemented:
- larger car exclusion margin;
- reject Hough segments crossing vehicle/tutorial exclusions;
- evaluate all line-family pairs instead of blindly using the two longest;
- broaden known-asphalt acceptance conservatively;
- reduce donor windows from 96x96 to 64x64 and require spatial diversity.

Bounded-repair run:
- GitHub Actions run `35420304694` — SUCCESS;
- 80 accepted segments;
- 3 orientation families at approximately -88.2°, -61.5°, -1.2°;
- family pair [0,2] selected for candidate grid inference;
- 16 candidate grid nodes;
- 107,886 known-asphalt pixels;
- 6 MASTER-only donor candidates.

### Visual verdict

**REJECTED_AFTER_BOUNDED_REPAIR**

The numeric asphalt/donor metrics improved, but the reviewed overlay still places many high-confidence line segments on:
- vehicle body/edge structure;
- the left lot/curb boundary;
- non-parking high-contrast geometry.

Therefore the global Hough-first line model is not reliable enough to synthesize hidden parking markings. Per project policy, no second tuning cycle is allowed. The global Hough-first route is retired.

The known-asphalt mask, illumination fit and six donor windows are retained only as **provisional sub-results**. They are not production-approved until reused inside a method whose marking geometry passes visual QA.

## Next method — anchor-first projective structure

The next structural method changes representation rather than tuning Hough.

Research on parking-slot detection supports reasoning from marking points / junctions / polygon vertices and their orientation, then inferring slots with geometric rules. DMPR-PS (ICME 2019) predicts directional marking points and reconstructs parking slots geometrically; later holistic work similarly represents slots with explicit polygon vertices.

For this one fixed MASTER, the production-friendly adaptation is deterministic and model-free at runtime:
1. find candidate **paint endpoints/corners**, not arbitrary global edges;
2. visually validate the small anchor set on the MASTER;
3. reject candidates touching car/tutorial/curb exclusion regions;
4. fit projective marking families through validated anchors;
5. infer only the hidden painted segments;
6. keep asphalt reconstruction separate.

No CNN checkpoint is required for this one-off build-time geometry task; the research is used for the representation, not as a production dependency.
