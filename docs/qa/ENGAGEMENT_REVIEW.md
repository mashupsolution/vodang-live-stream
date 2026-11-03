# Viewer engagement verification — Tu Tiên Online LIVE

## Livestream improvements — 2026-11-01

- Stream HUD moved above the cauldron/crowd. Top-three boards rotate every ten seconds; one fixed-height region prioritizes breakthroughs, gifts, communal milestones and community messages, with approved vow excerpts during quiet periods. Lower-priority shares cannot displace an active milestone.
- Names remain visible; shared seat geometry targets participant effects. Like/follow ceremonies now include their existing optional `userId`; scoring/cooldowns/streak behavior is unchanged. New clients/session hydration suppress entry/ceremony replay.
- macOS uses Linh WAV; Windows uses Edge MP3 (Nam Minh/Hoài My). `/api/narration/:id/audio` negotiates actual provider output; legacy `.wav` remains macOS-compatible and returns 406 for MP3 providers. Old settings hydrate the Nam Minh preference.
- Provider tests cover escaped SSML, format, queue/cache/voice changes, shutdown, timed-out metadata/streams, queue recovery, per-listener HTTP cancellation, empty/oversized audio and discarded partial responses. Premature Edge connection closures retry up to three attempts within the existing 15-second overall timeout.
- Actual Edge service calls on macOS produced Vietnamese Nam Minh MP3 through Node 24 and both voices through Bun 1.4.4. `edge-narration-sample.mp3`: 52,128 bytes, mono 24 kHz, 96 kbps, 4.344 seconds. A Hoài My batch still failed after retries: service reliability is not guaranteed. Failures retain captions and permit the next announcement to retry.
- Browser integration exercised separate loading/playback deadlines (a 14-second synthesis delay does not cut off playback), banner expiry and rotation across interruptions, valid MP3 decoding, persistent Windows voice selection, serial playback/ducking/disable, OBS auto-audio and bootstrap suppression. Native Linh produced valid WAV outside the sandbox; sandboxed speech initially returned incomplete output.
- Windows executable cross-compilation and native macOS executable startup smoke succeeded. Actual Windows-host playback, GitHub-hosted Windows CI execution, OBS and real TikTok broadcasting remain unverified.

Final current verification: **61 unit/integration tests**, **25 browser tests**, typecheck/build and the separate 60-second hardware benchmark passed.

Historical release evidence below predates these changes; see STATUS for final current test counts and benchmark.

Tu Tiên Online LIVE — Đỉnh Linh Sơn Vân Hải brings Xianxia-themed TikTok-native participation, per-session gratitude and cultivation ranking boards, local Vietnamese narration, simultaneous-audience milestones and sharing acknowledgments.

## Behavior and contracts

- Free commands: `!tu` (vận công tu tập), `!dan` (luyện đan dược), `!dokiep` (thử thách lôi kiếp đột phá cảnh giới), moderated `!daotam <lời thề>` (lời thề khắc bia đạo tâm). `!phapbao` returns gift guidance without points or consuming command cooldown. Gifts retain mapped contributions and exact-once streak deltas.
- 10 Cảnh Giới cultivation progression: Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp. Cultivator ranks survive session resets in `state.realms`. Instant Hộ Pháp breakthrough to Trúc Cơ triggers when high-tier gifts (e.g. Cửu Chuyển Kim Đan) are bestowed.
- `Snapshot.session`: durable session identity/source/start time plus top-five gift-point (Thiên Bảng · Công huân), cultivation practice (Tinh tấn · tu luyện), and realm prestige (Bảng Phong Thần Cảnh Giới). All contributing disciples retain scores; pending/rejected vows, replay and mismatched sources do not score. Approval credits only the original matching session.
- `POST /api/session/new`: resets session boards/audience/announcements, preserving lifetime progress, realms, settings, mappings and vows. Same-source reconnect after a restart preserves saved boards. Operators explicitly begin a new session for a new LIVE.
- `Snapshot.announcements`, narrator settings and local WAV endpoints: trusted Vietnamese templates, sanitized names, final-streak thanks, one voice at a time, maximum 12 queued items and 20-second client freshness. Music ducks to one quarter of its configured gain during narration and recovers on completion, disable, error or cancellation. Preview remains silent; reload/audio activation skips existing announcements.
- `audience` events have no user and cannot create disciples or offering points. SDK v3 `roomUser.total` supplies concurrent viewers; cumulative `totalUser` is intentionally excluded. Current count becomes unknown after 30 seconds, disconnect or restart; durable peak and reached milestones survive reconnect.
- Audience thresholds: 100/250/500/1,000 then each 1,000. Large jumps show the highest new ceremony; durable peak prevents repeating after dips. Bounded history keeps 64 thresholds. The 40 disciples and 180 pooled effects remain the maximum.
- Received shares show thanks; voice throttles the same viewer to once per minute. Server share invitations require a connected matching source and fresh positive audience count, run at most every five minutes, and wait 20 seconds after audience celebrations. No TikTok messages are posted.

## Checks run

- **26 unit/integration tests passed**, including SQLite recovery, sequenced WebSocket views, cooldowns, moderation, exact-once gifts, session scoring/recovery/reset, source isolation, narration grouping/queue recovery, SDK fixtures, audience dips/huge jumps, invitation timing, 10-realm breakthroughs, and TikTok config security.
- **14 browser tests passed; benchmark skipped intentionally in that suite.** Browser coverage includes game/overlay/admin synchronization, reconnect, vow privacy, durable mappings/settings, simulator, invalid/origin rejection, audio activation, leaderboard/source/reset flows, audience effects/counts, real Vietnamese WAV response, serial voice/ducking/disable, OBS-style auto-audio, session changes, breakthrough synchronization (`!tu` → `!dokiep`), and bootstrap suppression.
- TypeScript and production build passed cleanly (`tsc --noEmit`, Vite build).
- Updated native wide/close and desktop/mobile baselines were generated for the intentional interface changes, inspected, then reproduced by the final suite without snapshot updates. Đỉnh Linh Sơn artwork, circular dais, and Tứ Linh Đỉnh remain intact; the boards and instructions use the established Celadon & Gold (**Vân Ngọc & Kim Quang**) visual system. Long-name/top-five and 390px mobile captures are in `engagement-portrait.png` and `engagement-mobile.png`.
- `audience-1000.png` shows the milestone celebration with a fixed visual clock, all 40 disciple objects, communal bow and pooled qi particles. Transient acknowledgments do not stack duplicate spoken/visual text; capture mode omits them for stable baselines.
- Native `Linh` synthesis produced a 3.54-second, mono 22,050Hz WAV with nonzero signal (RMS 4349.7 at 16-bit scale). `narration-sample.wav` is a generic-name listening sample. Browser tests also received a real RIFF/WAVE response from the server endpoint.
- Performance benchmark passed: 60.051 seconds, 40 disciples, peak 180 effects, gift bursts every 700ms and increasing audience milestones every 4.9s; mean 117.70 FPS, minimum complete 60-frame window 47.76 FPS, p95 frame time 9.8ms. Apple M5 / ANGLE Metal / production 1080×1920. See `benchmark.json`. Local server smoke returns HTTP 200 for health/admin/game/overlay, with the new contracts and Linh available.

## Verification limits

Actual TikTok event reception, actual OBS Studio audio/capture, broadcasting and subjective listening have not been exercised against a live broadcast. Narration currently uses the installed macOS Linh voice; unsupported/missing native voices report unavailable and retain visual acknowledgments. Browser auto-audio was tested with an OBS-like autoplay policy, which does not establish actual OBS capture. The performance test isolates local rendering and excludes narration/OBS encoding.

