# Parking Remaster — VP-2C Hybrid Clean Plate Prototype

Updated: 2026-09-19
Status: EXPERIMENT / NOT PRODUCTION ASSET

## Research decision

Direct visual QA of previous candidates showed that standard one-pass LaMa removes cars best, but leaves large low-frequency tonal rectangles. OpenCV raw inpaint and xphoto fail at semantic car removal.

The next prototype therefore separates image frequency roles:

- **LaMa** removes semantic car/tutorial content and supplies plausible high-frequency pavement texture.
- **Low-resolution local inpaint** estimates only the slow illumination/color field from surrounding real pavement.
- **Frequency separation** retains LaMa's high-frequency texture while replacing its blocky low-frequency tone.
- **Distance-to-mask blending** keeps the correction zero at the mask boundary and exact outside the mask.

This is intentionally lighter than adding another large structure-inpainting model.

## Research basis

OpenCV documents Poisson/local image-editing tools specifically for restricted-region blending and illumination changes. Its Hough transform can later be used to restore straight parking markings if this tone prototype passes but line continuity still needs repair.

LaMa remains the semantic-removal layer because its published implementation is designed for large-mask inpainting and reports strong completion of periodic structures.

## Hard invariants

- Approved MASTER hash must match.
- Pinned LaMa model hash must match.
- No pixel outside the approved removal mask may change.
- Baked tutorial yellow arrow/glow must be materially reduced.
- Direct visual QA remains authoritative.

## What this prototype does NOT do yet

It does not promote clean_plate.webp.
It does not modify runtime.
It does not redraw parking lines.
It does not create Level 2.

If the hybrid materially fixes the rectangular tone artifacts, the next micro-gate is line/EXIT geometry review and only then production promotion.
