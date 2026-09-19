# Parking Remaster — VP-2D Parking Structure Research v1

Updated: 2026-09-19
Status: IMPLEMENTED FOR MASTER-SPECIFIC VALIDATION

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
