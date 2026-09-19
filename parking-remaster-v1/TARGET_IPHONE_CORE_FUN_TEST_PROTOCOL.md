# Target-iPhone Core Fun Evidence Protocol

Updated: 2026-09-19
Status: HARNESS READY / PHYSICAL + HUMAN EVIDENCE PENDING

This protocol closes evidence that automation and Chromium cannot prove. It must not be replaced by emulator results.

## A. Physical iPhone timing + saved-recording audio

Use the same target iPhone and Safari that will be used for playtest.

1. Open the Parking Remaster test build with `?qa=iphone`.
2. Confirm the black **IPHONE QA** panel is visible. This panel exists only in QA mode and is absent in normal play.
3. Start iOS Screen Recording from Control Center with **Microphone OFF**.
4. Return to Safari and reload the QA page once. The page must open directly to playable Level 1; do not accept any Start/Menu gate.
5. Read `nav→controls` from the QA panel. Gate target: **<= 1000 ms**.
6. Tap one blocked car to produce horn feedback, then tap legal cars to produce engine sound. Finish Level 1 to produce the win sound and automatic transition to Level 2.
7. Stop the recording and play the saved recording in Photos.
8. Record separately whether **engine / horn / win** are audible in the saved recording. Hearing them live is not enough.
9. Return to the QA page, tap **COPY JSON**, and paste the JSON into the project chat together with the three saved-recording yes/no results.

Do not edit the runtime based on perceived sound before the saved recording itself is checked.

## B. Fresh-player Core Fun Review

Use the normal test URL **without `?qa=iphone`** so the QA panel cannot coach the player. Use at least one person who has not watched the project being built.

Do not explain controls before play. Observe and record:
- Did they make a gameplay action without being told what to tap?
- Did they understand a blocked-car bump/horn as feedback rather than a broken control?
- Was there avoidable waiting?
- After Level 1 cleared and Level 2 appeared automatically, did they continue voluntarily?
- Did they ask for an explanation of any rule?
- Any accidental taps / ambiguous hit targets?
- Their exact spontaneous comment, if any, after Level 1 and after entering Level 2.

The observer may stop the test for safety/device reasons, but must not coach puzzle choices.

## PASS boundary

This gate can close only when:
- physical iPhone `nav→controls <= 1000 ms`;
- saved microphone-off screen recording contains engine, horn and win SFX;
- at least one fresh-player observation exists;
- no evidence shows an unexplained interaction blocker that invalidates the Core Fun Review.

A one-person fresh-player test is directional evidence, not population-level validation. Later controlled-release data remains necessary.
