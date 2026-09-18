# Parking Remaster — Instant Start + iPhone Audio Capture Gate v1

Updated: 2026-09-18
Status: CANON

## Evidence that changed the design

A previously shipped GRID SHIFT Playgama test showed:
- more than half of players left inside 30 seconds;
- the build opened on a mode-select screen;
- among players who got past that early drop, most continued beyond 60 seconds.

Parking Remaster therefore treats pre-game UI as a measurable retention risk.

## Instant-start contract

The first visible meaningful screen is the playable Level 1 board.

Forbidden before first gameplay action:
- title splash;
- mode-select screen;
- main menu;
- Start/Play button;
- tutorial modal;
- settings prompt;
- audio-unlock modal.

The player's first car tap is simultaneously:
1. the first gameplay decision;
2. the browser user gesture used to unlock/resume audio.

### Product target
- Controls available: <= 1.0 s on target iPhone build/network condition.
- This is a Parking Remaster product target based on observed GRID SHIFT behavior, not a claimed universal industry constant.
- YouTube Playables officially requires gameReady only when interaction is actually possible and recommends interaction within 5 seconds; Parking Remaster deliberately targets much faster.
- Nonessential content must load after gameplay is available.

## Audio-capture problem

The current prototype used Web Audio oscillators.

On iOS/WebKit, an AudioContext can enter interrupted when Safari loses focus, and WebKit reports cases where returning to Safari leaves the context silent or requires recreation/suspend-resume handling.

Starting iPhone screen recording opens Control Center, so focus/visibility interruption is a realistic pre-recording path.

## Runtime audio contract

1. Audio is first initialized from an actual player gesture.
2. suspended and interrupted are both handled.
3. Any hide/page transition marks the context dirty.
4. The next player gesture recreates the AudioContext if necessary.
5. Game input is never delayed waiting for audio recovery.
6. SFX feed a master gain + dynamics compressor instead of raw oscillator-to-destination connections.
7. Avoid harsh square/sawtooth transients for core feedback where softer waveforms provide the same gameplay information.
8. Sound remains optional to comprehension.
9. A visible mute control exists.
10. Sound must stop when the page is hidden/minimized.

## Final iPhone capture QA

Before release candidate:
- Start an iPhone screen recording from Control Center.
- Return to the game.
- Immediately play at least 30 seconds.
- Confirm engine, blocked/horn and clear sounds are continuous and undistorted in the saved recording.
- Repeat once after backgrounding/foregrounding Safari.
- Test microphone OFF first to verify internal game audio capture.
- Also test microphone ON as a separate capture mode; do not use microphone pickup as a substitute for broken internal game audio.

If audio is absent/choppy after this runtime hardening, isolate Safari/WebKit vs platform-container behavior before release.

## Platform alignment

Playgama requires games not to be completely silent, requires a mute button, and requires sound to stop when minimized.
YouTube Playables requires platform audio settings to be respected and user input not to be unintentionally delayed or ignored.
