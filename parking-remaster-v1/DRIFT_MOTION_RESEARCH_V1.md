# DRIFT MOTION RESEARCH V1

Date: 2026-09-20

## Why v3 was rejected
The v3 car still read as a car following a smooth curved path. The target is a compact, violent-looking transient maneuver in which the rear rotates much more than the front before and during the attitude change.

## Research findings used
1. SAE 2006, *On the Dynamics of Automobile Drifting*:
   - Drift is a large-sideslip state.
   - Handbrake initiation can momentarily lock the rear wheels, sharply reducing rear lateral force and initiating oversteer.
   - Countersteer is then used to control the resulting sideslip.
   - Source: https://saemobilus.sae.org/papers/dynamics-automobile-drifting-2006-01-1019

2. Stanford Dynamic Design Lab, *Dynamics and Control of Drifting in Automobiles*:
   - Drift is characterized by rear-tire saturation, large sideslip, countersteer, and significant rear wheelspin.
   - Rear drive force has strong lateral-control authority once the rear tires are saturated.
   - Source: https://ddl.stanford.edu/publications/thesis/dynamics-and-control-drifting-automobiles

3. SAE 2024, *On the Investigation of Car Steady-State Cornering Equilibria and Drifting*:
   - Typical drift has steering angle and yaw rate with opposite signs, i.e. countersteer.
   - Rear axle saturation is a defining part of the state.
   - Source: https://saemobilus.sae.org/papers/investigation-car-steady-state-cornering-equilibria-drifting-2024-01-2764

4. Handbrake-turn dynamics:
   - Briefly removing rear lateral grip allows the rear to swing while the rolling front tires retain comparatively more directional authority.
   - This motivates the game approximation of a short front-axle-dominant pivot rather than a smooth center-of-mass arc.
   - Reference overview: https://en.wikipedia.org/wiki/Handbrake_turn
   - Rallycross mechanics overview: https://livephysics.com/infographics/engineering-rallycross-the-handbrake-turn/

5. Burnout / rear wheelspin:
   - High rear-wheel longitudinal slip can create visible tire smoke before strong forward traction is recovered.
   - This supports a visually short pre-launch smoke beat without requiring the whole car to travel far first.
   - Reference: https://mechref.engr.illinois.edu/dyn/ava.html

6. Highly transient drift research:
   - Modern transient drift control research explicitly treats transitions between sliding-tire and grip regimes rather than assuming one smooth steady-state arc.
   - Source: https://www.tandfonline.com/doi/abs/10.1080/00423114.2023.2297799

## Important limitation
The exact YouTube Shorts stream supplied by the user could not be fetched by the available web reader. Therefore this is not a frame-by-frame reconstruction claim. The user's described motion is the visual target, while the mechanics above constrain the implementation.

## V4 motion contract
The animation must read as four discrete beats, not one curve:

1. PRE-KICK
   - rear smoke begins immediately;
   - front axle displacement remains visually tiny;
   - rear axle visibly moves much farther than the front;
   - target: rear/front displacement ratio >= 4 during the early kick.

2. STRAIGHT BLAST
   - vehicle body remains visibly crossed-up;
   - center of mass translates almost straight;
   - body heading and travel direction remain intentionally different.

3. SNAP CATCH
   - front axle again acts as the dominant pivot;
   - rear movement must be much greater than front movement;
   - body attitude returns rapidly rather than easing through a long arc.

4. EXIT
   - once aligned, vehicle accelerates straight out immediately.

## V4 timing target
- Total maneuver <= 1.25 s.
- Pre-kick ~0.16 s.
- Straight blast ~0.30 s.
- Catch ~0.19 s.
- Remaining time is straight exit.

## Visual effects
- Smoke originates only near rear tires during pre-kick / blast / catch.
- Skid marks are rear-biased.
- No continuous-radius Bezier path.
- No slow pause between phases.

## Non-claims
- This is an arcade compression of real transient vehicle dynamics.
- It is not a driving simulator.
- The exact real-world maneuver in the linked Short has not been frame-traced.
