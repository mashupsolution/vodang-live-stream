# Visual verification

## Livestream improvements — 2026-11-01

- Inspected native empty, sparse mobile and 40-disciple native/mobile captures (`livestream-*.png`), including long-name nameplates and a breakthrough in the single upper information slot.
- HUD is bounded above native y=480; the floor is unobscured and its heavy vignette is removed. A horizontal top-three strip replaces the old bottom top-five panel; Admin still shows five entries.
- Measured persistent names fit seat widths, ellipsize long Vietnamese names, and clear neighboring labels and seated silhouettes in wide mode. Existing art is reused; new arrivals settle and reduced-motion arrivals seat immediately.
- Wide, explicit altar close-up, desktop Admin and full mobile Admin candidates were captured and inspected before replacing the four visual baselines. Close-up intentionally crops the crowd; wide/no-auto remains the default.
- Capture mode freezes text rotation as well as scene time. Full-suite reproduction is recorded in STATUS after final validation.

Native 1080×1920 wide and close-up temple captures, 1440-wide desktop admin and 390-wide mobile admin are stored in `.impeccable/review/`; reproducible Playwright baselines live in `tests/e2e/operator.spec.ts-snapshots/`. Additional settled moderation/mapping/settings captures are in this directory. The purple strip in baseline admin images intentionally masks variable FPS text.

Visual review verified all captures plus relevant source against the Tu Tiên Online LIVE direction (Đỉnh Linh Sơn Vân Hải) and the confirmed core scope. Tứ Linh Đỉnh, circular jade dais, Celadon-Gold (**Vân Ngọc & Kim Quang**) palette, ordered disciples in perspective, painted materials, typography adaptation, and operator hierarchy matched the agreed direction.

Initial disposition: **fix**, with two material findings resolved during development:
1. Overlay incorrectly labeled connecting/error/disconnected TikTok mode as LIVE.
2. Five small-text styles fell below 4.5:1 contrast.

Both fixes were applied. The overlay now requires a connected local WebSocket and connected TikTok status for LIVE; all four status labels have a passing browser fixture test. Corrected contrast ratios: placeholder 5.28:1; command text 4.90:1; tag 5.14:1; vow timestamp/approved attribution 5.22:1. Captures were refreshed and inspected.

Final verdict pass: **ship**, scoped to all findings being resolved, with no regressions observed. Representative screenshots in `.impeccable/review/` and `screenshots/` have been updated to reflect the full Tu Tiên Online LIVE aesthetic.

Motion/playback interactions are exercised by browser tests; the still-image review does not certify motion or subjective audio quality. Hardware performance is separately documented in PERFORMANCE.md. Actual TikTok reception, OBS Studio capture/audio, and broadcasting remain unverified.

