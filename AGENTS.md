# Tu Tiên Online LIVE — agent instructions

Read `docs/STATUS.md` first, then the active phase in `docs/IMPLEMENTATION_PLAN.md`. Load only skills and source needed for that phase. Finish one phase and its acceptance checks before advancing. Update STATUS at every phase boundary and before ending a session, including failures and the next concrete action.

The local release is complete. Use README for startup/OBS/backup, `docs/SKILLS.md` for skill provenance, and `docs/qa/` for verification evidence. DESIGN.md and `.impeccable/design.json` capture the implemented visual system. Reuse an existing local server; do not reopen completed phases unless the user requests changes or a concrete regression is found.

## Fixed contract
- Local-first cooperative Vietnamese Xianxia (Tu Chân) game; Phaser 4.2.1, React, TypeScript, Node.js 24, SQLite; npm workspace. Desktop executables (macOS arm64/x64, Windows x64) are built with Bun ≥1.4.4 (`npm run package`) and by `.github/workflows/build.yml`; dev and tests stay on Node. Default server port `PORT=3001`, database `data/tutien.sqlite`.
- `/game`, `/overlay`, `/admin`; 1080×1920 portrait game; 40 visible disciples; wide and altar (Tứ Linh Đỉnh) camera presets.
- Preserve the approved Xianxia peak reference: Đỉnh Linh Sơn Vân Hải, ornate Tứ Linh Đỉnh bronze-jade cauldron with spiritual qi flames, circular jade dais, flying jade swords, mountain pines, celestial clouds, kneeling congregation of 40 disciples, painted layered 2.5D art in Celadon-Gold (Vân Ngọc & Kim Quang) palette.
- Backend owns progress and events. Mock and optional TikTok adapters share normalized events; REST controls and WebSocket state synchronization.
- Free commands `!tu` (vận công), `!dan` (luyện đan), `!dokiep` (đột phá cảnh giới), moderated `!daotam <lời thề>` (lời thề khắc bia đạo tâm); high-tier actions require TikTok gifts (`!phapbao` is gift guidance); default 10-second viewer cooldown; Tụ Linh Đại Trận milestones 100, 250, 500, then every additional 500.
- 10 Cảnh Giới progression: Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp. Gift contributions trigger instant Hộ Pháp breakthrough to Trúc Cơ.
- Public vows require operator approval. Gift streak increments count once. SQLite stores settings, mappings, events, vows, realms, and progress.
- Bind locally. The TikTok username and signing key are entered in Admin Settings and stored in local SQLite (user-approved; `.env` stays a fallback). The key is write-only: never return it from an API or snapshot, expose it to browsers, or log it. Never commit credentials.
- Authorized extension: per-LIVE Thiên Bảng (Công huân & Tinh tấn), Bảng Phong Thần Cảnh Giới, Vietnamese narrator (Tiên Âm Linh)/thanks, simultaneous-viewer milestones and sharing. Use Terra/Luna subagents for bounded work and Sol for complex integration. Deferred: themed rooms, daily activities, OBS WebSocket automation, official partner integration, cloud deployment.

## Quality and context budget
- Preserve established interfaces and approved artwork. Record significant decisions instead of reopening them every session.
- Read relevant GameDev skills before their tasks; use a pinned project-local selection, not the full catalog.
- Inspect generated art at native scale and in engine; prompts alone do not establish production quality.
- Test meaningful behavior in its owning phase. Repeat passing checks only after relevant changes; broad regression belongs to release validation.
- Use deterministic mock events for visual tests. Test synchronization, reconnects, cooldowns, gift streaks, deduplication, persistence, moderation, and 40-visitor performance.
- Never claim a check that was not run. Real TikTok input and broadcasting stay unverified until exercised against an available LIVE session.
- Keep handoffs short: phase, changed contracts, checks/results, blockers, next action. Do not add features outside the agreed release.

