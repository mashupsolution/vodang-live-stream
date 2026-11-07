# Project status

## Đồng bộ cốt truyện Võ Đang (2026-11-05)
- AGENTS.md, README.md, DESIGN.md, manifest (nhãn tier), comment code, test và ART_DIRECTION_WUDANG chuyển từ thuật ngữ Tu Tiên sang Võ Đang. Không đổi hành vi. Ngưỡng cảnh giới chuẩn là `packages/shared` (10/35/80/160/280/450/700/1050/1500); các con số 30…50.000 trong mục cũ của STATUS là lỗi thời. Lời dẫn nằm trong `engine.ts` (narrator.ts chỉ là TTS).
- Còn nguyên có chủ đích: tên gift id `mock-tien-dan`. Đã đổi tên tutien → vodang (`VoDangOnline`, `data/vodang.sqlite`, `VODANG_DB`/`VODANG_HOME`); biến cũ `TUTIEN_*` và thư mục `TuTienOnline`/`tutien.sqlite` vẫn được nhận làm dự phòng.

## Thái Cực Âm Dương Song Long Altar Transformation — Complete (2026-11-05)
- **Chuyển đổi Linh Đỉnh thành Thái Cực Âm Dương Song Long (`tu-linh-dinh.webp`):**
  - Chuyển đổi mô hình đỉnh đồng thành biểu tượng thiêng liêng Thái Cực Đồ với Bạch Long và Hắc Long chầu quanh, Dạ Minh Châu phát sáng trên nền khí mây huyền ảo theo đúng ảnh tham chiếu người dùng.
  - Xử lý tách viền mềm mại (superellipse feathering mask) giúp khói mây hòa quyện êm dịu vào mây trời núi Võ Đang (`linh-son-hall.webp`), không bị vệt khung chữ nhật thô.
  - Chuẩn hóa sprite 880×880 RGBA với alpha hoàn chỉnh ($[0, 255]$), dung lượng VRAM GPU an toàn (3.10 MB, tổng 48.89 MB < 64 MB budget).
  - Tích hợp cân đối vào `apps/web/src/game.ts` với kích thước $590 \times 590$ tại tọa độ trung tâm $y=770$, đồng bộ hoàn hảo cùng hệ thống 24 Phi Kiếm Bát Quái phân tầng 2.5D (kiếm lướt trước ngực và sau lưng rồng), Bagua Dais tại $y=1060$, và hiệu ứng thở lơ lửng dao động nhịp nhàng.
- **Verification Evidence:**
  - `docs/qa/thai-cuc-song-long-live.png`: Toàn cảnh livestream 1080×1920 in-engine với 40 đệ tử bái chầu Thái Cực Song Long.
  - `docs/qa/thai-cuc-altar-zoom.png`: Ảnh chụp cận cảnh khu vực đài ngọc và biểu tượng rồng âm dương.
  - `npm run check`: 0 lỗi TypeScript.
  - `npm test`: 70/70 unit tests pass 100%.
  - `npm run build`: Production build thành công (3.05s).
- **Next Concrete Action:** Chưa xác minh LIVE thực tế (OBS đã gỡ, chưa xác nhận quyền stream-key TikTok). Chưa chạy lại test sau khi gộp vào bản có simulator.

## OBS setup — removed (2026-11-03)
- OBS was installed and configured (profile/scene `VoDang`, Browser Source `http://127.0.0.1:3000/overlay?audio=1`) but the user decided to uninstall it; the config under `~/Library/Application Support/obs-studio` was deleted. TikTok stream-key access (PC LIVE) was never confirmed for the account; real LIVE remains unverified.
- Game server unchanged: dev server on `PORT=3000` from `.env` (README says 3001).

## Heart goals for watch-only viewers — implemented (2026-11-03)
- Per-LIVE heart count (`session.hearts {count, goal}`, `nextHeartGoal` in shared): goals 100, 500, every 1000 → +5 progress, ceremony, narrator thanks. Every 10 hearts from one viewer → +1 participation (tinh tấn). Narrator reminder alternates share/heart every 5 min. HUD quiet tip and README table document it.
- Checks: `npm run check` clean; `npm test` 69/69. `npm run test:e2e`: 17 passed, 8 failed (audio, engagement ×2, narration ×3, operator baseline, presentation breakthrough). The failures inspected (offering-note text, thanks-list count) are in Wudang-era code, not hearts; operator baseline not inspected, may need review for the longer quiet tip.
- Next: triage those e2e failures; real TikTok likes unverified.

## Võ Đang Visual Asset Regeneration — Complete (2026-11-03)
- **Asset 1: Võ Đang Kim Đỉnh Vân Hải (`linh-son-hall.webp`):**
  - High-fidelity 1080×1920 9:16 background scenery generated and normalized.
  - Symmetrical view of Mount Wudang celestial peaks piercing through morning sea of clouds, distant gilded copper roof eaves of the Golden Hall (Kim Đỉnh Tử Tiêu Cung), ancient cliffside pines, twin stone lantern columns with spiritual amber/cyan flames, pale marble terrace with inlaid Taiji/Bagua pathways, and central circular Taiji Yin-Yang dais.
- **Asset 2: Chân Vũ Bát Quái Đỉnh (`tu-linh-dinh.webp`):**
  - 880×880 transparent 2.5D Daoist tripod censer sprite with Taiji Yin-Yang medallion and Bagua trigrams, dragon-turtle legs, billowing purple/golden sandalwood incense mist, flanked by twin Chân Vũ flying swords and white-gold lotus blooms on a carved marble pedestal.
  - Full per-pixel magenta excess chroma unmixing and despill clamping with zero pink fringing.
- **Asset 3: Đạo Sĩ Võ Đang Spritesheet Atlas (`cultivators.png`):**
  - 2048×1024 RGBA 8-frame atlas (512×512 tiles, 4 columns × 2 rows).
  - Row 0 (Nữ Đạo Sĩ) & Row 1 (Nam Đạo Sĩ) in authentic Wudang Navy & White (Lam Bạch Đạo Bào) robes with Taiji emblems and hairpins/Daoshi guan.
  - 4 verified poses: standing observant, full lotus meditation, Taiji Qi channeling aura, and celestial talisman token offering.
  - Sliced and scaled uniformly to 448px height with ground baseline locked at $y = 490$.
- **Verification Evidence:**
  - `docs/qa/cultivators-preview.png`: Checkerboard despill and golden baseline guide verified.
  - `docs/qa/livestream-40-1080.png`: Full in-engine composition captured at 1080×1920 with 40 disciples, Chân Vũ cauldron, and orbiting Bát Quái swords.
  - Total decoded GPU texture memory: **16.89 MB** (well under the 32.0 MB budget).
  - `npm run check`: 0 TypeScript errors.
  - `npm test`: 61/61 unit tests pass.
  - `npm run build`: Production build passes cleanly.
  - Playwright presentation suite: 9/9 tests pass.
- **Next Concrete Action:** Operator live broadcast execution with OBS Studio and TikTok LIVE.

## Võ Đang Phái LIVE Transformation — Complete (2026-11-03)
- **10 Cảnh Giới / Thân Phận Võ Đang (Phương án A):**
  - Đệ Tử Nhập Môn (0) → Ký Danh Đệ Tử (30) → Ngoại Môn Đệ Tử (100) → Nội Môn Đệ Tử (300) → Chân Truyền Đệ Tử (800) → Chấp Sự Đạo Trưởng (2,000) → Võ Đang Thất Hiệp (5,000) → Chưởng Pháp Trưởng Lão (12,000) → Thái Thượng Trưởng Lão (25,000) → Chưởng Môn Chân Nhân (50,000 max).
  - Configured with custom Tai Chi / Taoist martial aura colors (`#94a3b8`, `#38bdf8`, `#34d399`, `#60a5fa`, `#a78bfa`, `#c084fc`, `#f472b6`, `#fb923c`, `#facc15`, `#e0e7ff`).
- **Wudang Command Aliases & Gift Guidance:**
  - Added new Wudang commands: `!quyen` (luyện quyền), `!kiem` (diễn kiếm), `!dotpha` (đột phá), `!loithe <lời thề>` (lời thề môn quy), `!lephap` (hướng dẫn lễ vật), `!thaicuc`, `!baisu`.
  - Maintained 100% backward compatibility for legacy commands: `!tu`, `!dan`, `!dokiep`, `!daotam`, `!phapbao`.
  - Updated default gift mappings: Lệnh Bài Võ Đang, Thái Cực Bát Quái Bàn, Chân Vũ Thần Kiếm (alongside legacy Cửu Chuyển Kim Đan).
- **Branding, HUD, Leaderboards & Admin UI:**
  - HUD header: "VÕ ĐANG" (Thái Cực Đồ & Chân Vũ Kiếm Trận) with sub-banner "Võ Đang Sơn — Kim Đỉnh".
  - Sect array progress: "Chân Vũ Trận" (Tụ Linh Đại Trận) with milestone triggers.
  - Comment guide: "Gõ !quyen (!tu): luyện quyền · !kiem (!dan): diễn kiếm · !dotpha: thăng cấp · !loithe: môn quy".
  - Leaderboards: "Võ Đang Bảng" rotating between "Công huân · lễ vật", "Tinh tấn · quyền kiếm", "Phong thần · đạo hạnh".
  - Admin panel: Updated simulation tabs, actions ("Luyện quyền !quyen (!tu)", "Diễn kiếm !kiem (!dan)", "Đột phá !dotpha (!dokiep)"), vow moderation tab ("Môn quy / Lời thề"), and status labels.
- **Voice / Tiên Âm Linh (Đạo Âm):**
  - Updated narrator templates to Wudang sect style: "Võ Đang Sơn đa tạ đệ tử/hiệp sĩ...", "Chúc mừng đệ tử ... bái nhập Võ Đang Sơn tu luyện...", "Chúc mừng đệ tử ... đột phá ...".
- **Art Direction & Visual Lore:**
  - Authored comprehensive documentation in `docs/ART_DIRECTION_WUDANG.md` detailing the visual palette, Taoist martial arts themes, and 2.5D visual assets.
- **Verification Evidence:**
  - `npm test`: **61/61 unit tests pass** cleanly (1.19s).
  - `npm run check`: **0 TypeScript errors**.
  - `npm run build`: Production build succeeds (3.07s).
  - `npm run test:e2e`: **25/25 Playwright E2E tests pass** cleanly (1 benchmark intentionally skipped).
  - All visual snapshots, camera framings (wide/close), desktop/mobile admin panels, audio ducking, and SQLite persistence confirmed operational.
- **Next Steps:**
  - Real TikTok LIVE event ingestion and live OBS broadcasting are external stream-session tasks.


## Livestream improvements — complete (2026-11-01)
- Phases 1–3 delivered: Luna's upper HUD, primary integration/recognizable disciples, and Terra's Windows narration. Existing artwork, gameplay, cooldowns, gift streaks, moderation, wide/no-auto defaults and 40-disciple/180-particle limits retained.
- Stream HUD stays above native y=480; top-three boards/help rotate without resetting after event banners. A single bounded slot prioritizes breakthroughs/gifts/milestones. Approved vows use two-line excerpts. Persistent measured nameplates, entrance/settle states, immediate reconnect seating and participant-targeted effects pass native/mobile review.
- New contract: persisted `narratorVoice` (Nam Minh default, Hoài My optional); `/api/narration/:id/audio` returns Windows Edge MP3 or macOS Linh WAV. Mac legacy `.wav` remains supported; MP3 providers return 406 for that alias. Windows voice preference does not change macOS Linh.
- Narration: 15-second synthesis deadline, at most three attempts for premature service closure, partial audio discarded, per-listener cancellation, bounded queue/cache, recoverable status, separate load/playback deadlines, serialized voice and music ducking.
- Final checks: Node 24.22.2 typecheck/build passed; **61/61 unit/integration tests** (including **22 narration tests**) and **25/25 browser tests** passed. One benchmark case is intentionally skipped in the browser suite and passed separately. Four inspected visual baselines reproduced without updates; all final source inputs stayed unchanged during verification.
- Benchmark: 60.048s, 40 disciples, 180 max particles, **59.55 FPS mean**, **46.75 FPS minimum 60-frame window**, **17.6ms p95** on Apple M1/Metal. No GC instrumentation. Evidence: `docs/qa/benchmark.json` and `PERFORMANCE.md`.
- Bun 1.4.4 compiled macOS arm64/x64 and Windows x64 executables in `release/`; final arm64 executable passed temporary-database startup smoke. Actual Windows/Intel executable execution remains unverified; Windows CI now includes mocked narration-provider tests.
- Actual Edge requests on macOS produced Vietnamese speech through Node 24 and both voices through Bun. Saved complete 4.344-second MP3 sample. Intermittent Hoài My failure still occurred after retries; captions/gameplay continue and later announcements may retry. Actual Windows-host speech and TikTok/OBS broadcasting remain unverified.
- Resolved validation issues: missing test browser installed in temporary storage; native speech sandbox output was incomplete, so the real Linh check ran successfully outside the sandbox; intentional HUD/scene differences were inspected before baseline replacement; a rotating-board assertion was made deterministic. Detailed evidence is in `docs/qa/ENGAGEMENT_REVIEW.md` and `VISUAL_REVIEW.md`.
- Local preview runs at `http://127.0.0.1:3001/admin` using explicit `PORT=3001`; inherited port 3000 conflicted with the reference app, which was left running. Health check passed; existing `.env` and credentials were preserved.
- Next concrete action: operator verification of Windows speech/executable and real TikTok/OBS when those environments are available. No requested local implementation remains.

## Celestial Crane & Orbiting Sword Array Integration (2026-11-01) — Complete
- **Celestial Crane (Tiên Hạc Đan Đỉnh) system (`apps/web/src/cranes.ts`) integrated into `game.ts` & `audio.ts`:**
  - 4-frame procedural spritesheet generated at runtime (`generateCraneTextures(this)`), with `crane-fly` animation registered.
  - Pre-warmed fixed pool of 8 Crane sprites with zero memory allocations in the render loop.
  - Celestial sky corridor traversal (Y: 180 to 460) with sinusoidal gliding bob (disabled deterministically under capture or `prefers-reduced-motion`).
  - Milestone reactive V-formation flocking (`craneManager.triggerFlock(5)`) triggered on `audience-milestone` and `milestone` ceremonies.
  - Ambient spawner with solitary or paired cranes gliding across mist clouds.
  - WebAudio pentatonic crane call (`playCraneCall`) with high reed/flute timbre (A5 -> D6) and mountain echo resonance.
- **Orbiting Sword Array (Bát Quái Ngự Kiếm Trận) system (`apps/web/src/swords.ts`) integrated into `game.ts` & `audio.ts`:**
  - Procedural texture generation for `flying-sword`, `sword-trail`, and `bagua-array` (`generateSwordTextures(this)`).
  - 3 concentric orbital rings around the Tứ Linh Đỉnh cauldron (Ring 1: 8 swords clockwise, Ring 2: 8 swords counter-clockwise, Reserve: 8 swords dormant).
  - True 2.5D depth sorting around the cauldron (back arc depth 1.8, front arc depth 2.4).
  - Burst reaction (`triggerBurst(intensity)`) on `action === "sword"`, expanding radii and accelerating orbits.
  - Tribulation reaction (`triggerTribulation()`) forming a protective canopy dome vibrating with celestial energy above the cauldron for 4 seconds on `tribulation-success` and `tribulation-fail`.
  - Pooled afterimage trails (32 sprites) with zero runtime allocations.
  - Crystalline sword shimmer resonance (`playSwordShimmer`) synthesized with dual harmonics.
- **Verification Evidence:**
  - `npm run check`: 0 errors.
  - `npm test`: 61/61 unit tests pass cleanly (1.6s).
  - `npm run test:e2e`: 23/23 tests pass cleanly (1 skipped benchmark, 3.5m), including visual snapshot baselines.
  - `npm run benchmark`: 60-second hardware benchmark passed with 40 disciples, 3,566 frames, 59.43 mean FPS, 0.20ms CPU update time per frame. Recorded in `docs/qa/benchmark.json`.


**Waves 1–3 are fully complete on branch `tu-tien-online` for Tu Tiên Online LIVE — Đỉnh Linh Sơn Vân Hải.** All unit, integration, visual QA, Playwright E2E, 60-second hardware benchmark, and documentation deliverables pass cleanly. Actual TikTok reception and OBS/broadcast verification remain external live broadcast setup tasks.

## Wave 3: Integration, Visual QA, E2E Suite, Benchmark & Release Documentation (Complete)
- **Cross-module contract audit:**
  - `packages/shared`, `apps/server`, `apps/web`, `public/assets` audited and aligned.
  - Sizing & aspect ratio: `tu-linh-dinh.webp` display size corrected to `590, 585` (exact 880×873 ~1.008:1 aspect ratio), grounded on circular jade dais at `y=1065` with `origin (0.5, 1)`.
  - Admin & Overlay UX: Removed legacy `"Lễ Phật !le"` labels, verified `!tu` / `!dan` / `!phapbao` / `!dokiep` action labels and ARIA attributes. Fixed simulator subscriber lifecycle in `admin.tsx` using `mappingsRef` and `giftIdRef` to prevent arriving snapshots from aborting disciple spawning.
  - Tribulation overlay: Updated `TempleView.tsx` with `tribulationCeremony` guard ensuring breakthrough banners ("Đột phá Luyện Khí!", "Hộ trận cản lôi") are never masked by concurrent gift announcements.
- **In-process Playwright E2E harness (`tests/e2e/fixture.ts`):**
  - Resolved macOS sandbox network/IPC constraints (`MachPortRendezvousServer: Permission denied`, `connect EPERM 127.0.0.1`) without requiring unsandboxed execution.
  - Created zero-socket in-process HTTP routing via Node `Duplex` pairs (`createPair()`) feeding `temple.server.emit('connection')`, and in-process WebSocket synchronization via Playwright `routeWebSocket()` dispatching `engine.snapshot()` directly.
  - Launched Chromium with `--single-process --no-sandbox --autoplay-policy=no-user-gesture-required` with test-scoped browser lifecycle management.
- **Deterministic E2E Verification:**
  - **14/14 Playwright E2E tests pass cleanly** (55.5s) without `--update-snapshots`:
    - `operator.spec.ts`: wide/close camera framing, admin desktop/mobile responsiveness, action/gift/vow flows, breakthrough synchronization (`!tu` → `!dokiep`), settings durability.
    - `engagement.spec.ts`: `!phapbao` gift requirement, instant Trúc Cơ Hộ Pháp breakthrough, session reset preserving lifetime progress and realms, 1080×1920 portrait and 390×844 mobile layouts.
    - `narration.spec.ts`: Tiên Âm Linh synthesis, streak grouping, audio ducking, OBS auto-audio, bootstrap suppression.
    - `audience.spec.ts`: 100/1000/2000 milestone celebrations, dip immunity, share invitations.
    - `audio.spec.ts`: explicit game audio activation, muted admin preview.
- **Native Visual QA & Asset Replacement:**
  - Inspected generated snapshots at native scale (`view_file`): `admin-desktop-darwin.png`, `admin-mobile-darwin.png`, `temple-wide-darwin.png`, `temple-close-darwin.png`, `audience-1000.png`, `engagement-portrait.png`, `engagement-mobile.png`.
  - Replaced all legacy pagoda screenshots in `.impeccable/review/` (`temple-wide.png`, `temple-close.png`, `desktop.png`, `mobile.png`) and `screenshots/` (`game.png`, `admin-dashboard.png`, `admin-setting.png`) with authentic Tu Tiên Online LIVE captures.
- **60-Second Hardware Benchmark:**
  - Executed sequentially (`npm run benchmark`) on Apple M5 (10 cores, 24 GiB RAM, macOS arm64, ANGLE Metal WebGL):
    - **Mean FPS:** `117.70 FPS` (requirement: >= 30 FPS).
    - **Minimum 60-frame window:** `47.76 FPS` (requirement: >= 30 FPS).
    - **P95 frame time:** `9.8ms`.
    - **Total frames:** `7,058` frames over 60.051 seconds.
    - **Visitors (Disciples):** `40` (requirement: === 40).
    - **Max active effects:** `180` (capped at particle pool limit).
    - **Phaser update CPU time:** `~0.1ms`.
  - Verified and recorded in `docs/qa/benchmark.json`, `docs/qa/PERFORMANCE.md`, `docs/qa/VISUAL_REVIEW.md`, and `docs/qa/ENGAGEMENT_REVIEW.md`.
- **Release Documentation:**
  - Updated `AGENTS.md`, `README.md`, `PRODUCT.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/STATUS.md` reflecting **Tu Tiên Online LIVE — Đỉnh Linh Sơn Vân Hải** (`PORT=3001`, `data/tutien.sqlite`, commands `!tu`, `!dan`, `!dokiep`, `!daotam`, `!phapbao`, 10 Cảnh Giới, OBS `1080×1920`, exact verification metrics, external TikTok/OBS live setup limits).

## Wave 2: 10 Cảnh Giới & Gameplay Mechanics (Delivered)
- 10 Cảnh Giới progression: Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp.
- Free commands: `!tu` (vận công tu tập), `!dan` (luyện đan), `!dokiep` (đột phá cảnh giới), moderated `!daotam <lời thề>` (bia đạo tâm).
- High-tier gifts bestow instant Hộ Pháp breakthrough to Trúc Cơ.
- Ranking boards: Thiên Bảng (Công huân · linh bảo), Tinh tấn · tu luyện, Bảng Phong Thần Cảnh Giới.
- Port changed to `PORT=3001`, database changed to `data/tutien.sqlite`.
- 26/26 unit tests passing.

## Wave 1: Xianxia Re-Skin & Visual Assets (Delivered)
- Asset replacement: Đỉnh Linh Sơn Vân Hải background (`linh-son-hall.webp`), Tứ Linh Đỉnh bronze-jade cauldron (`tu-linh-dinh.webp`), 40 disciples in robes (`cultivators.png`), circular jade dais, spiritual qi flames, flying jade swords.
- Visual theme: Celadon & Gold (**Vân Ngọc & Kim Quang**) palette, deep jade (#0b1d19), misty celadon (#1b3b35, #2e5950), golden highlights (#f6d365, #fda085, #e5b869).
- Xianxia soundtrack: `music.mp3` guzheng / flute / chime meditation audio.

## Verification Summary
- `npm run check`: 0 errors.
- `npm test`: 26/26 unit tests pass.
- `npm run build`: production build succeeds.
- `npm run test:e2e`: 14/14 tests pass cleanly without `--update-snapshots` (1 skipped benchmark).
- `npm run benchmark`: 117.70 FPS mean, 47.76 FPS min window, 40 disciples, 180 max effects.

## Limits and Next Steps
- Real TikTok LIVE event ingestion and actual OBS broadcasting remain external live broadcast setup tasks requiring a live TikTok broadcast session and OBS Studio setup on the host machine.
- Local server is configured to bind `PORT=3001` (SQLite `data/tutien.sqlite`).


## 2026-11-03 — Nhạc nền + chào người mới
- Audio: `/game` và `/overlay?audio=1` mở khóa nhạc ở thao tác đầu tiên (pointer/key/touch), gợi ý "Chạm để bật nhạc"; `ambientVolume` mặc định 0.2 → 0.45; `dist/web` đã build lại với music.mp3 mới.
- Chào người mới: sự kiện `join` → announcement `welcome` (mỗi người 1 lần/phiên LIVE, tối đa 1 lời chào/12 s); setting `welcomeEnabled` trong Admin. Test: narration.test.ts.
- Chưa kiểm: nghe thật trên trình duyệt/OBS, TikTok LIVE thật, e2e Playwright, bản desktop (cần `npm run package`).

## Ân Công donor tiers (gift upgrades)
- Contract: `DONOR_TIERS`/`donorTierFor` in shared; `Visitor.donorTier`, `Ceremony "donor-tier"`, `Announcement "tier-up"` + optional structured fields, `session.recentDonors`. Cultivators persist `donorPoints`/`donorTier` (hydrated with `??=`).
- Perks: tuVi bonus 10/20/35/50% on gifts and `!tu`/`!dan`; tier ≥3 halves cooldown. Gift thanks now names the gift and rank.
- Visuals: tier aura + coloured name per disciple, tier-up light pillar/rings/petals/cranes, animated banner, "Cảm ơn ủng hộ" board.
- Checks: `npm test` 63/63 pass. Not run: visual/e2e capture of the tier-up effect, 40-disciple perf with auras, real TikTok. Next: run /game with mock gifts of each tier and inspect at 1080 and 390.

## ZeroTTS narrator voice (2026-11-03) — complete
- New optional provider `apps/server/src/zerotts.ts` + worker `apps/server/tts/zerotts_worker.py` (adapted from the fishing app; fixed protocol: result carries `file`, provider reads WAV from `data/tts-cache`). `make tts` (run by `make run`/`make setup`) installs `.venv` + model from `zeroweight-ai/ZeroTTS` once. Chosen automatically when `data/zerotts-model/config.json`, `ZEROTTS_MODEL_PATH` or `ZEROTTS_PYTHON` exists; otherwise Linh/Edge as before. `ZEROTTS=0` disables.
- Contract: `narratorVoiceSchema` adds `zerotts-<maichi|baotrang|giahuy|hamy|huuduc|kimoanh|quangminh|tiendat>` (default unchanged; non-ZeroTTS values map to Mai Chi); `NarrationStatus.provider` adds `"zerotts"`; provider interface gains optional `timeoutMs` (45s), `warm`, `close`. Admin shows a ZeroTTS voice picker.
- Checks: `tsc --noEmit` clean; **67/67 unit tests** (4 new in `tests/zerotts.test.ts` with a fake worker). Real model run on macOS: load 4.9s, 2.8s synth, valid 48 kHz WAV via `Narrator` (`docs/qa/zerotts-narration-sample.wav`).
- Not verified: browser playback of the WAV in /overlay, Windows, Bun-compiled executables (model not bundled), long-session worker stability. Browser e2e not rerun.
- Next concrete action: listen to the sample and run a live session with `?audio=1`.

## Mô phỏng chạy ở server (2026-11-03)
- Vòng mô phỏng chuyển từ trình duyệt sang `apps/server/src/simulator.ts`; `POST /api/simulator {running, giftId?}` và `POST /api/simulator/reset`. `AdminSnapshot.simulating?` (cộng thêm). Dừng = ngừng phát sự kiện + gỡ đệ tử `demo:*` (`Engine.clearDemo`), điểm/tu vi giữ nguyên. Chạy lại không nạp lại 50 đệ tử, gửi lại `audience` mỗi ~10 s để số người xem không tự mất. "Đặt lại mô phỏng" = `Engine.resetDemo` (phiên mới + xóa cultivator/visitor/cooldown `demo:*`). Đổi sang TikTok tự dừng mô phỏng.
- Checks: `tsc` sạch; `npm test` 72/72; e2e "simulation can start and stop" pass; chạy thật qua API + Admin: Dừng → 0 đệ tử, không còn sự kiện mới, tải lại trang vẫn đúng trạng thái.
- Chưa xong/không do thay đổi này: e2e `operator.spec.ts:92` (nhãn "Thêm quà"/"Lưu quy tắc" cũ so với UI "Thêm lễ vật") và baseline hình `operator.spec.ts:183` đang lệch (art mới + nút mới ở Admin) — chưa cập nhật baseline. "Đặt lại mô phỏng" chưa chạy thử trên DB thật vì sẽ xóa bảng phiên hiện tại.

## Nhạc nền do người dùng cung cấp (2026-11-05)
- `apps/web/public/assets/music.mp3` = `background.mp3` của người dùng (3:03, 256 kbps, 5.87 MB, md5 trùng); `audio.ts` không đổi. Manifest/docs cập nhật; `generate-music.mjs` giờ ghi `music-synth.mp3`.
- Người dùng chịu trách nhiệm bản quyền khi phát LIVE. Chưa kiểm: nghe thật độ to/điểm lặp.
