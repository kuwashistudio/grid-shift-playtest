# Parking Remaster — VP-2D2 Bounded Repair Research Note

Updated: 2026-09-19
Status: PASS / CLOSED after bounded repair

The initial endpoint/corner detector returned 24 candidates. Direct MASTER review accepted only A13/A17/A20/A23 as unambiguous parking-paint anchors, all on the same right-side vertical stripe. That candidate pass therefore failed both precision and spatial coverage.

The one allowed bounded repair changes the measurement procedure without returning to global Hough or generic threshold tuning:

1. directly review the exact MASTER and lock small seed windows around visible white parking-marking fragments;
2. exclude Level-1 vehicle rectangles plus tutorial arrow/glow;
3. inside each seed window, snap row/column samples to a neutral-bright local response;
4. robustly fit straight vectors with Huber loss and residual trimming;
5. extend only those observed vectors across occluded vehicle regions;
6. compare the final overlay directly with MASTER.

Four vertical tracks are supported by separated visible fragments. V1 has a visible mid/lower fragment and an independent lower-edge stub; V0/V2/V3 have multiple separated fragments. Four horizontal tracks are also directly visible.

A single common vanishing point is deliberately not forced. Direct inspection showed that forcing a global projective VP would move some vectors away from the actual visible paint. The MASTER itself is visual authority, so the production geometry uses independently fitted straight image-space vectors while retaining the parking-grid topology.


## Final verification

GitHub Actions run `35423556122` reproduced the vector model and QA overlay from the exact MASTER. Direct review of the CI-generated overlay passed.

Approved topology:
- vertical: V0, V1, V2, V3;
- horizontal: H0, H1, H2, H3.

The geometry is approved only as an input to structured clean-plate reconstruction. It does not itself approve a clean plate or runtime migration.
