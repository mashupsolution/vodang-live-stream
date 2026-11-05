# Tu Tiên Online LIVE — Art Direction & Visual System

## Visual Theme: Đỉnh Linh Sơn Vân Hải (Celestial Mountain Peak in Cloud Sea)

The visual system transitions from a traditional earthly temple to an ethereal **Xianxia Cultivation Realm** set upon the misty summit of Mount Linh Sơn above a sea of clouds.

## Visual Layers & Constraints

### 1. Hall Background (`linh-son-hall.webp`)
- **Dimensions**: 1080×1920 portrait, opaque, WebP Q90.
- **Composition**: Symmetrical perspective overlooking a vast sea of clouds at sunrise. Flanked by twin ancient pine trees clinging to precipitous peaks, intricate celadon jade pillars with warm amber lanterns and glowing cyan spirit lamps, leading the eye toward a raised circular jade cultivation dais floating at the cloud boundary (`y ≈ 1040`).
- **Foreground**: Clean, geometric jade and pale stone plaza with subtle gold inlay paths designed to accommodate up to 40 meditating cultivators without visual clutter or contrast interference.
- **Pivot**: `[0.5, 0.5]`.

### 2. Tứ Linh Đỉnh Alchemy Cauldron (`tu-linh-dinh.webp`)
- **Dimensions**: 880×873, transparent WebP (Q92, alphaQ100).
- **Composition**: Ancient celadon jade and antique bronze three-legged alchemy cauldron resting on a carved marble Bagua Taiji pedestal. Embellished with gilded dragon and qilin reliefs, rising celestial elixir mist, flanked by twin floating jade flying swords (*Phi Kiếm*) and glowing spiritual lotuses (*Linh Sen*).
- **Placement**: Anchored at the central platform (`x ≈ 540, y ≈ 1040`), serving as the focal point for viewer offerings and spiritual energy absorption.
- **Pivot**: Bottom-center `[0.5, 1.0]`.

### 3. Cultivator Spritesheet (`cultivators.png`)
- **Dimensions**: 2048×1024 RGBA PNG, divided into 8 frames of 512×512 (4 columns × 2 rows).
- **Identities**:
  - **Row 0 (Nữ Tu Sĩ)**: Female cultivator with graceful black hair bun, jade hairpin, flowing emerald ribbons, and layered celadon silk robes.
  - **Row 1 (Nam Tu Sĩ)**: Male cultivator with jade crown topknot, wide flowing sleeves, layered cyan and white cultivation robes.
- **Poses (Left to Right)**:
  - **Col 0 (Đứng Thả Lỏng / Standing)**: Hands tucked serenely behind the back, observing the celestial vista.
  - **Col 1 (Tọa Thiền / Meditating)**: Seated upright in full lotus posture, palms resting on knees in mudra.
  - **Col 2 (Đột Phá Khí Vận / Aura Breakthrough)**: Meditating with palms raised, enveloped in a glowing golden spiritual energy aura (*Kim Quang Hộ Thể*).
  - **Col 3 (Hiến Dâng Linh Đan / Spiritual Pearl Offering)**: Arms raised holding a radiant celestial golden orb (*Nội Đan / Linh Châu*).
- **Normalization**: Each row is scaled uniformly to 448px height for standing poses; all 8 poses align precisely to a shared baseline at `y = 490` within the 512×512 cell. Pivot: `[0.5, 0.95703125]`.

### 4. Audio Soundscape (`music.mp3`)
- User-supplied background track: 3:03 loop, 256kbps stereo MP3 @ 44.1kHz, played by `Soundscape` (`apps/web/src/audio.ts`) through the ambient gain, ducked while the Linh Tiên Âm narrator speaks.
- The earlier synthesized pentatonic loop can still be generated to `music-synth.mp3` by `scripts/generate-music.mjs`.

## Texture Memory Budget

| Asset | Dimensions | Alpha | Decoded Bytes |
|---|---|---|---|
| `linh-son-hall.webp` | 1080×1920 | No (RGB) | 6,220,800 bytes (~5.93 MB) |
| `tu-linh-dinh.webp` | 880×873 | Yes (RGBA) | 3,072,960 bytes (~2.93 MB) |
| `cultivators.png` | 2048×1024 | Yes (RGBA) | 8,388,608 bytes (~8.00 MB) |
| **Total Texture Memory** | | | **17,682,368 bytes (16.86 MB)** |

*Budget limit: 32.0 MB. Actual usage is 52.7% of budget, ensuring smooth 60 FPS performance on all mobile and desktop WebGL contexts.*

## Normalization & Provenance

- **Source Reference**: `docs/reference/linh-son-concept.jpg`.
- **Generation Tool**: Google Imagen 3 via Antigravity image generation pipeline.
- **Chroma Extraction**: Flat `#FF00FF` magenta extraction with per-pixel magenta excess unmixing and despill clamping (`scripts/normalize-assets.mjs`), verified zero pink haloing on checkerboard QA preview (`docs/qa/cultivators-preview.png`).
- **Reproducibility**: `node scripts/normalize-assets.mjs` is deterministic; `music.mp3` is a user-supplied track (the optional synth `scripts/generate-music.mjs` writes `music-synth.mp3`).
