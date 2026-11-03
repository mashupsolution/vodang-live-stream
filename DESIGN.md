---
name: Tu Tiên Online LIVE — Đỉnh Linh Sơn Vân Hải
description: Celadon Jade & Celestial Gold visual system for Tu Tiên Online LIVE, featuring Đỉnh Linh Sơn, 40 visible meditating cultivators, and 180 pooled Xianxia VFX sprites.
colors:
  jade-primary: "#16534e"
  jade-hover: "#0f3f3b"
  teal-navigation: "#103432"
  teal-navigation-hover: "#184946"
  cloud-porcelain: "#eff4f2"
  cloud-paper: "#f9fcfb"
  jade-mist-border: "#d3e0dc"
  ink-primary: "#162e2c"
  ink-secondary: "#46635f"
  ink-muted: "#537571"
  focus-gold: "#b58938"
  celestial-gold: "#f6d27a"
  celestial-yellow: "#fef08a"
  spirit-cyan: "#67e8f9"
  spirit-emerald: "#6ee7b7"
  spirit-jade: "#34d399"
  tribulation-violet: "#e879f9"
  astral-jade-overlay: "#0d2224d6"
typography:
  display:
    fontFamily: '"Lora", serif'
    fontSize: "4.6cqw"
    fontWeight: 500
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Lora", serif'
    fontSize: "31px"
    fontWeight: 500
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Lora", serif'
    fontSize: "19px"
    fontWeight: 500
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Be Vietnam Pro", sans-serif'
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: '"Be Vietnam Pro", sans-serif'
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  tag: "4px"
  field: "6px"
  control: "7px"
  action: "8px"
  navigation: "9px"
  panel: "12px"
  preview: "15px"
spacing:
  compact: "8px"
  medium: "12px"
  section: "18px"
  sheet: "24px"
components:
  button-primary:
    backgroundColor: "{colors.jade-primary}"
    textColor: "#f7fbf9"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.jade-hover}"
  button-secondary:
    backgroundColor: "{colors.cloud-paper}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
  navigation:
    textColor: "#b5ccc7"
    rounded: "{rounded.navigation}"
    padding: "13px 14px"
  navigation-active:
    backgroundColor: "{colors.cloud-porcelain}"
    textColor: "#113a37"
  tag:
    backgroundColor: "#e0eee9"
    textColor: "{colors.jade-primary}"
  stream-overlay:
    backgroundColor: "{colors.astral-jade-overlay}"
    textColor: "#f7fbf9"
    accentColor: "{colors.celestial-gold}"
---

# Tu Tiên Online LIVE — Đỉnh Linh Sơn Vân Hải Visual System

## Overview
Tu Tiên Online LIVE transports live stream audiences to **Đỉnh Linh Sơn**, an ethereal cultivation sanctuary floating above a sea of clouds (*vân hải*).

The aesthetic is guided by **Vân Ngọc & Kim Quang (Celadon Jade & Celestial Gold)**:
- **Ethereal Sanctuaries**: Deep misty astral teal (`#0d2224`), celadon jade (`#16534e`), and celestial gold (`#f6d27a`).
- **Quiet Operator Surface**: Porcelain cloud surfaces (`#eff4f2`), panel paper (`#f9fcfb`), and crisp jade-mist borders (`#d3e0dc`) that provide calm, high-contrast, uncluttered control.
- **Xianxia Visual Hierarchy**: Ethereal spirit auras, flying sword light rays, and Heavenly Tribulation (*Thiên Kiếp*) electric arcs rendered in Phaser 4 WebGL with procedural textures.

## Cultivation Scene Contract
- **Canvas Resolution**: Portrait `1080×1920` (9:16), `Phaser.AUTO`, `antialias: true`, `roundPixels: false`, target 60 FPS.
- **Congregation**: Strict cap of **40 visible cultivators** arranged in an 8-row × 5-column perspective grid (`spread = 146 + row * 9`, `y = 1138 + row * 106`, frame display size `96 + row`). The restrained character size reserves a distinct nameplate lane below each seated row; opaque art extents, rather than transparent atlas margins, determine separation.
- **Viewer HUD**: A fixed upper region, no more than 480 native pixels tall, contains title, LIVE/attendance/audience, slim progress, and one bounded information slot. A horizontal top-three board rotates every ten seconds; the same slot shows prioritized six-second events or approved two-line vow excerpts. No panels or dark vignette obscure the disciple floor. Admin retains five rows per board.
- **Identity and motion**: Persistent 20px measured nameplates truncate to seat width. Initial/reconnected participants are seated immediately; new arrivals enter for 650ms and settle by 1100ms. Reduced motion settles immediately. Realm/action detail uses the upper event slot. Like/follow and action particles share the character seat coordinates.
- **Cultivator Auras**: Disciples at Realm 3 (*Kim Đan*) and above radiate a subtle realm-tinted qi ring corresponding to `REALMS[realmIndex].color`.
- **VFX Particle Pool**: Strict ceiling of **180 pooled particle sprites** (`this.particles`), initialized at scene creation with zero allocations per frame in `update()`.
- **Camera Modes**:
  - `wide`: Zoom 1.0, centered at `(540, 960)`.
  - `close`: Zoom 1.42, centered at `(540, 800)` framing the **Tụ Linh Đan Đỉnh** and front rows.
- **Capture Determinism**: When `?capture=1` is provided, freeze visual time at 5000ms, set current time to `serverTime + 6000ms`, snap camera immediately without easing, and suppress transient particle bursts.
- **Telemetry**: Maintain `window.__TEMPLE_STATS__` compatible with `GameStats` interface and notify test suites with `parent.dataset.ready = "true"`.

## Color Tokens & Contrast Compliance
All body copy, label text, and status tags meet or exceed WCAG AA contrast standards (≥ 4.5:1 for standard text, ≥ 3.0:1 for large display elements):
- Primary Ink (`#162e2c`) on Porcelain Cloud (`#eff4f2`): Contrast Ratio **12.4:1** (Passes AAA).
- Secondary Ink (`#46635f`) on Panel Paper (`#f9fcfb`): Contrast Ratio **5.5:1** (Passes AA).
- Primary Button Ivory Text (`#f7fbf9`) on Celadon Jade (`#16534e`): Contrast Ratio **6.8:1** (Passes AA).
- Overlay Celestial Gold (`#f6d27a`) on Deep Astral Jade (`#0d2224`): Contrast Ratio **9.6:1** (Passes AAA).
- Focus Ring Bronze-Gold (`#b58938`): Distinct outline offset 4px.

## Procedural WebAudio Soundscape
- **Narration platforms**: macOS retains offline Linh WAV. Windows uses server-side Edge TTS, Nam Minh by default or Hoài My; it requires Internet and returns MP3. The shared browser endpoint is `/api/narration/:id/audio`.
- **Audio Architecture**: 3 sub-buses (`ambient`, `effects`, `voice`) routed into a master limiter dynamics compressor.
- **Music Ducking**: Automatic sidechain ducking down to `0.25` gain when Tiên Âm voice speaks.
- **Bounded SFX Polyphony**: Max 10 active synth voices.
- **Variation**: `±2%` micro-pitch randomization per action.
- **Sound Palette**:
  - `meditate` / `vow` / `follow`: Plucked pentatonic guzheng harmonic note (`D4` / `A4`, triangle+sine blend).
  - `elixir` / `share`: Warm crystalline jade chime dyad (`F#4` + `D5`).
  - `sword`: Shimmering sword-light glide (`A4 → E5 → A5`).
  - `tribulation-success`: Sculpted thunder rumble swept down, followed by radiant 3-note golden bell chord (`D5 → F#5 → A5`).
  - `tribulation-fail`: Muffled thunder pulse + grounding `A3` jade gong.
  - `milestone` / `audience-milestone`: Deep `D3` Dharma bell with ascending pentatonic flourish.
