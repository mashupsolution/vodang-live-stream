# Võ Đang Online LIVE — implementation plan

## Product
Complete local-first cooperative Vietnamese Xianxia (Tu Chân) game: Đỉnh Linh Sơn Vân Hải, animated disciples, 10 Cảnh Giới cultivation progression, free comment commands (`!tu`, `!dan`, `!dokiep`, `!daotam`), gift-supported linh bảo (`!phapbao`), Tụ Linh Đại Trận milestones, Vietnamese React admin (`/admin`), SQLite (`data/vodang.sqlite`), Tiên Âm local narration, optional TikTok input, and portrait OBS Browser Source (`/overlay`, 1080×1920). Default `PORT=3001`. Phone-only TikTok LIVE access does not block local development; desktop broadcasting is an external setup dependency.

## Evolution and Phases
**Livestream improvements (2026-11-01, complete):** Phase 1 compact upper HUD (Luna), Phase 2 recognizable disciples and targeted effects (primary), Phase 3 Windows Edge TTS with macOS Linh retained (Terra + primary integration). Finish each phase's focused acceptance checks before advancing. Completed native visual inspection, typecheck/build, 61 unit/integration tests, 25 browser tests and the 40-disciple benchmark. Windows/macOS executables compiled; actual Windows playback and TikTok/OBS remain external verification. Keep artwork, gameplay, wide/no-auto defaults, moderation, and 180-effect cap.

0–6. **Core release:** foundation, visual system, gameplay, operator controls, TikTok connector, release validation.
7–9. **Viewer engagement:** per-LIVE boards (Thiên Bảng · Công huân & Tinh tấn), Tiên Âm narrator (giọng Linh), concurrent audience celebrations and sharing prompts.
**Wave 1: Xianxia Re-Skin & Visual Assets:** Transform to Đỉnh Linh Sơn Vân Hải, Tứ Linh Đỉnh bronze-jade cauldron with ngũ sắc chân hỏa, circular jade dais, flying swords, 40 disciples in robes, Celadon & Gold (**Vân Ngọc & Kim Quang**) visual palette.
**Wave 2: 10 Cảnh Giới & Gameplay Mechanics:** Implement 10 realms (Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp), commands `!tu` (vận công), `!dan` (luyện đan), `!dokiep` (lôi kiếp đột phá), `!daotam` (bia đạo tâm), `!phapbao` (hướng dẫn linh bảo), instant Trúc Cơ Hộ Pháp on high-tier gifts, Bảng Phong Thần Cảnh Giới, default `PORT=3001` and `data/vodang.sqlite`.
**Wave 3: Cross-Module Integration, Native Visual QA, Playwright E2E Suite, Benchmark & Release Documentation:** End-to-end audit, in-process deterministic Playwright E2E test harness, native visual QA inspection without snapshot updates, 60-second hardware benchmark exceeding target (117.70 FPS mean, 47.76 FPS min window), and comprehensive release documentation.

## Interfaces and defaults
- npm workspaces: browser app, server, shared contracts. Node 24 backend authoritative; SQLite repository isolates storage (`data/vodang.sqlite`). Server binds loopback on `PORT=3001`.
- `/game` responsive portrait scene; `/overlay` no operator controls, 1080×1920 OBS; `/admin` Vietnamese operator interface.
- Shared LiveEvent union: join/comment/like/follow/gift/share/audience; room audience events carry no viewer identity. Replaceable connector lifecycle/status. REST handles controls; sequenced WebSocket snapshots synchronize state and reconnecting clients.
- `!tu`, `!dan`, `!dokiep`, `!daotam <lời thề>` are free; `!phapbao` directs viewers to TikTok gifts without adding points. 10-second configurable viewer cooldown. Basic actions add 1 point. Lời thề đạo tâm awaits approval before public display.
- Gift mappings set linh bảo action, intensity, contribution points. High-tier gifts trigger instant Hộ Pháp breakthrough to Trúc Cơ. Deduplicate events and use streak count increases exactly once.
- Tụ Linh Đại Trận milestones at 100/250/500 illuminate and decorate; every further 500 triggers communal celestial cloud ceremony. Store progress and reached milestones.
- Disciple state: enter → idle → kneel → meditate/dan/dokiep → idle → leave. Max 40 visible, depth sorted. Bounded effects (180 max) and queues.
- Windows uses Edge TTS (Nam Minh/Hoài My; Internet required), macOS retains offline Linh. `/api/narration/:id/audio` serves actual MP3/WAV; the old WAV alias remains macOS-compatible.
- Muted admin preview; independently adjustable ambient and ceremony audio. Mock mode by default; TikTok username/signing key in SQLite/environment; credentials never shipped to browser.
- Persist settings, gift mappings, normalized events, approved/pending vows, progress, realms, and per-session gratitude boards/audience milestones.

## Visual authority and skills
Visual authority: Đỉnh Linh Sơn Vân Hải concept reference. Ornate Tứ Linh Đỉnh bronze-jade cauldron, circular jade dais, mountain pines, celestial clouds, rows of kneeling disciples, flying swords, qi orbs; painted 2.5D, independent layers, code-rendered Vietnamese text.

Pinned GameDev skills: router, phaser-core, create-game-assets, game-ai, audio-design, performance-optimization.

## Verification and scope
- Unit/integration: 61 passed tests covering command cooldown, streak deltas, duplicate events, milestones, moderation, SQLite recovery, 10-realm breakthroughs, TikTok config security.
- Playwright E2E: 25 passed tests covering synchronized views, admin flows, reconnect, vow moderation, OBS auto-audio, audio activation, breakthrough synchronization (`!tu` → `!dokiep`), native screenshot baselines without updates.
- Benchmark: 60 seconds, 40 visible disciples, gift bursts every 700ms, audience milestones every 4.9s; mean 59.55 FPS, minimum 60-frame window 46.75 FPS, p95 frame time 17.6ms on Apple M1.
- Release ready. Deferred: themed rooms, daily activities, OBS automation, official TikTok partner integration, cloud hosting. Real TikTok reception and broadcasting remain unverified until exercised against an available LIVE session.

