# Võ Đang Phái LIVE — agent instructions

Read `docs/STATUS.md` first, then the active phase in `docs/IMPLEMENTATION_PLAN.md`. Load only skills and source needed for that phase. Finish one phase and its acceptance checks before advancing. Update STATUS at every phase boundary and before ending a session, including failures and the next concrete action.

The local release is complete. Use README for startup/OBS/backup, `docs/SKILLS.md` for skill provenance, and `docs/qa/` for verification evidence. DESIGN.md and `.impeccable/design.json` capture the implemented visual system. Reuse an existing local server; do not reopen completed phases unless the user requests changes or a concrete regression is found.

## Fixed contract
- Local-first cooperative Vietnamese Taoist martial arts (Võ Đang) game; Phaser 4.2.1, React, TypeScript, Node.js 24, SQLite; npm workspace. Desktop executables (macOS arm64/x64, Windows x64) are built with Bun ≥1.4.4 (`npm run package`) and by `.github/workflows/build.yml`; dev and tests stay on Node. Default server port `PORT=3000`, database `data/vodang.sqlite`.
- `/game`, `/overlay`, `/admin`; 1080×1920 portrait game; 40 visible disciples; wide and altar (Thái Cực Âm Dương Song Long) camera presets.
- Preserve the approved Wudang reference: Võ Đang Sơn Kim Đỉnh Vân Hải (Tử Tiêu Cung golden hall, cliffside pines, sea of clouds), Thái Cực Âm Dương Song Long (white and black dragons around a Taiji disc, luminous pearl) on a circular Bát Quái jade dais, 24 flying swords on Bát Quái orbits, Lam Bạch (navy-and-white) Daoist robes, kneeling congregation of 40 disciples, painted layered 2.5D art in the Võ Đang Lam Bạch & Kim Đỉnh palette (see `docs/ART_DIRECTION_WUDANG.md`).
- Backend owns progress and events. Mock and optional TikTok adapters share normalized events; REST controls and WebSocket state synchronization.
- Free commands `!quyen` (luyện Thái Cực Quyền), `!kiem` (diễn Thái Cực Kiếm), `!dotpha` (đột phá cảnh giới), moderated `!loithe <lời thề>` (lời thề môn quy); legacy aliases `!tu`, `!dan`, `!dokiep`, `!daotam` remain; high-tier actions require TikTok gifts (`!lephap` / `!phapbao` is gift guidance); default 10-second viewer cooldown; Chân Vũ Trận (Tụ Linh Đại Trận) milestones 100, 250, 500, then every additional 500.
- 10 Cảnh Giới progression (thresholds in `packages/shared`): Đệ Tử Nhập Môn → Ký Danh Đệ Tử → Ngoại Môn Đệ Tử → Nội Môn Đệ Tử → Chân Truyền Đệ Tử → Chấp Sự Đạo Trưởng → Võ Đang Thất Hiệp → Chưởng Pháp Trưởng Lão → Thái Thượng Trưởng Lão → Chưởng Môn Chân Nhân. Gift contributions (Thái Cực Bát Quái Bàn, Chân Vũ Thần Kiếm) trigger instant breakthrough to Ngoại Môn Đệ Tử.
- Public vows require operator approval. Gift streak increments count once. SQLite stores settings, mappings, events, vows, realms, and progress.
- Bind locally. The TikTok username and signing key are entered in Admin Settings and stored in local SQLite (user-approved; `.env` stays a fallback). The key is write-only: never return it from an API or snapshot, expose it to browsers, or log it. Never commit credentials.
- Authorized extension: per-LIVE Võ Đang Bảng (Công huân · lễ vật & Tinh tấn · quyền kiếm), Bảng Phong Thần Cảnh Giới, Vietnamese narrator (Tiên Âm)/thanks, simultaneous-viewer milestones and sharing. Use Terra/Luna subagents for bounded work and Sol for complex integration. Deferred: themed rooms, daily activities, OBS WebSocket automation, official partner integration, cloud deployment.

## Quality and context budget
- Preserve established interfaces and approved artwork. Record significant decisions instead of reopening them every session.
- Read relevant GameDev skills before their tasks; use a pinned project-local selection, not the full catalog.
- Inspect generated art at native scale and in engine; prompts alone do not establish production quality.
- Test meaningful behavior in its owning phase. Repeat passing checks only after relevant changes; broad regression belongs to release validation.
- Use deterministic mock events for visual tests. Test synchronization, reconnects, cooldowns, gift streaks, deduplication, persistence, moderation, and 40-visitor performance.
- Never claim a check that was not run. Real TikTok input and broadcasting stay unverified until exercised against an available LIVE session.
- Keep handoffs short: phase, changed contracts, checks/results, blockers, next action. Do not add features outside the agreed release.

