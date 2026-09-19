# Parking Remaster — VP-2D2 Anchor-First Projective Markings

Updated: 2026-09-19
Status: candidate-anchor implementation

## Why this representation

The previous global Hough-first model was rejected because high-contrast vehicle and curb edges were repeatedly mistaken for parking markings even after one bounded repair.

Parking-slot research commonly treats **marking points/corners and their relationships** as the primary structure:
- DMPR-PS predicts directional marking points and reconstructs slot geometry from position/orientation plus geometric rules.
- Graph-based parking-slot detection explicitly models links between marking points.
- Polygon-shaped parking-slot representations directly regress slot vertices and preserve entrance/orientation semantics.
- Recent slot-aware reconstruction work uses parking-corner confidence/direction and corner-to-corner slot edges as task-critical structural supervision.

For this fixed MASTER, those ideas are used only as a representation. No learned detector is required in production.

## VP-2D2 stage A

`scripts/detect_parking_anchors.py`

- exact MASTER hash required;
- no global Hough transform;
- bright low/moderate-saturation paint components inside the lot;
- Level-1 car sprite regions expanded and excluded;
- tutorial and outer curb/boundary zones excluded;
- candidate primitives come from morphological-skeleton endpoints and Shi-Tomasi corners;
- nearby primitives are merged and scored;
- only a small numbered candidate set is rendered;
- direct visual review decides which IDs are real parking-paint anchors.

No clean plate or hidden line is produced in stage A.
