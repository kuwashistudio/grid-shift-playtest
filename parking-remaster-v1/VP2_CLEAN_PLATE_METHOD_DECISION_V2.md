# Parking Remaster — VP-2 Clean Plate Method Decision v2

Updated: 2026-09-19
Status: ACTIVE

## What is already closed

VP-3 reusable car sprites is PASS.

The remaining blocker is only VP-2 clean plate.

## Evidence from direct visual experiments

Rejected:
- OpenCV Telea / Navier-Stokes;
- OpenCV xphoto FSR;
- LaMa standard / sequential / refined;
- LaMa frequency separation;
- independent local LaMa;
- shadow-expanded independent local LaMa;
- bmquilting after one integration repair;
- rectified-plane generic inpaint;
- quarter-resolution exemplar fill;
- low-frequency + single texture;
- multi-donor MASTER asphalt quilting;
- precise EfficientSAM-alpha harmonic fill with 12/24/36px shadow margins.

The latest precise-alpha tests are important:
- semantic car masks removed the old rectangular masking artifact;
- remaining dark shapes track former cars/cast shadows;
- simply increasing the shadow margin did not remove the visual attribution;
- therefore further mask-radius tuning is not justified.

## Current decision

Do not continue tuning generic inpainting or texture quilting.

Try exactly one **one-time constrained edit of the approved MASTER** whose sole purpose is to derive a car-free base environment.

This does not change the production architecture:
- no generated image per level;
- no runtime model;
- no external SaaS dependency during gameplay;
- no recurring level-generation cost.

After the one clean plate is approved, every level uses:
- the same clean plate;
- the same 10 PASS sprites;
- Level JSON placement only.

## Acceptance

The candidate is rejected if it:
- changes the camera/crop;
- redesigns walls/road/sidewalk/vegetation;
- moves drains/manhole/EXIT architecture;
- invents new props;
- changes the overall lighting language;
- removes or corrupts important parking markings;
- visibly restyles the approved MASTER.

The candidate may only reconstruct previously occluded pavement/markings and remove the baked tutorial glow.

Direct visual comparison is authoritative.
