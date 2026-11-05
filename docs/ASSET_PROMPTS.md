# Xianxia Asset Generation Prompts & Pipeline

This document records the exact generative prompts, constraints, and normalization pipeline used to produce the **Tu Tiên Online LIVE** production assets on the `tu-tien-online` branch.

All assets are generated using built-in image generation with strict color constraints and deterministic post-processing scripts:
- Visual normalization: `scripts/normalize-assets.mjs`
- Audio: `music.mp3` is a user-supplied track; `scripts/generate-music.mjs` (optional synth) writes `music-synth.mp3` only

---

## 1. Linh Sơn Celestial Hall (`linh-son-hall.webp`)

- **Role**: Opaque 9:16 background scenery with celestial mountain vista, sea of clouds, and circular platform.
- **Reference**: Visual reference preserved at `docs/reference/linh-son-concept.jpg`.
- **Target Size**: 1080×1920 portrait.

### Prompt:
```text
ROLE/PURPOSE: production game background asset, portrait 9:16 aspect ratio.
SUBJECT: Majestic Xianxia celestial mountain summit above an ethereal sea of rolling clouds at golden sunrise (Đỉnh Linh Sơn Vân Hải). Symmetrical grand temple terrace overlook. Symmetrical foreground terrace made of carved pale celadon jade and luminous marble tiles with subtle golden energy inlay pathways. Twin towering carved jade pillar columns on left and right decorated with traditional dragon clouds and hanging warm bronze lanterns with amber and cyan spiritual flames. In the upper center overlooking the sea of clouds is an empty elevated circular jade cultivation dais (floating cultivation platform) ready to receive a sacred cauldron. Distant jagged ethereal karst peaks rise from the misty clouds with ancient twisted pine trees clinging to the cliffs. Soft dawn god rays streaming down through purple and golden clouds.
ART DIRECTION: Stylized 2.5D painted animation background, Donghua / Xianxia aesthetic, rich pastel celadon green, warm golden amber, luminous misty clouds, refined brushwork, clean depth planes.
EXCLUDE: People, characters, Buddha statues, altars, text, user interface, icons, watermark, frames, blur.
```

---

## 2. Tứ Linh Đỉnh Alchemy Cauldron (`tu-linh-dinh.webp`)

- **Role**: Transparent foreground alchemy cauldron (*Tứ Linh Đỉnh*) with floating swords, mist, and lotuses.
- **Backdrop**: `#FF00FF` pure magenta chroma backdrop for zero-fringe alpha unmixing.
- **Target Size**: 880 width, proportional height (~873px), pivot `[0.5, 1.0]`.

### Prompt:
```text
ROLE/PURPOSE: isolated 2.5D game prop sprite of a mythical Xianxia alchemy cauldron (Tứ Linh Đỉnh).
SUBJECT: Frontal view of an ornate ancient celadon jade and antique bronze three-legged alchemy cauldron (tripod censer). The cauldron body is embellished with engraved golden imperial dragon and qilin reliefs, carved handles with hanging bronze rings. Billowing ethereal golden and cyan spiritual alchemy smoke and steam rises upward from inside the cauldron. Flanking the cauldron are two floating glowing jade flying swords (Phi Kiếm) hovering symmetrically in the air, and two blooming luminous white-and-gold spiritual lotuses (Linh Sen) floating beside the base. The entire assembly sits on an ornate carved circular marble Bagua Taiji pedestal with trigram engravings.
ART DIRECTION: 2.5D painted Xianxia donghua aesthetic matching Linh Sơn hall, crisp silhouette, celadon jade, warm antique gold, luminous mist, soft ambient occlusion.
TECHNICAL OUTPUT: Solid flat magenta background #FF00FF (R=255, G=0, B=255) for chroma extraction. Entire prop completely isolated in center with margins. No people, no floor beyond pedestal, no text, no watermark.
```

---

## 3. Cultivator Spritesheet Atlas (`cultivators.png`)

- **Role**: 2048×1024 RGBA atlas (4 columns × 2 rows, 512×512 tiles), 2 identities × 4 poses facing away toward cauldron.
- **Backdrop**: `#FF00FF` pure magenta chroma backdrop.
- **Identities**:
  - Row 0: Female cultivator (*Nữ Tu Sĩ*) in celadon silk robes, dark hair bun with jade hairpin and ribbons.
  - Row 1: Male cultivator (*Nam Tu Sĩ*) in cyan/white robes with topknot and jade crown.
- **Poses**:
  - Col 0: Standing upright with hands serenely folded behind back.
  - Col 1: Full lotus meditation posture (*Tọa Thiền*).
  - Col 2: Deep meditation absorbing golden spiritual aura (*Đột Phá Khí Vận*).
  - Col 3: Seated offering glowing golden spiritual pearl (*Hiến Dâng Linh Đan*).

### Prompt:
```text
ROLE/PURPOSE: 2.5D game character sprite atlas sheet, 4 equal columns and 2 equal rows (8 frames total).
SUBJECT: Two stylized Xianxia cultivators seen from BEHIND facing away toward a distant altar/cauldron.
ROW 1 (Female Daoist / Nữ Tu Sĩ): Graceful young woman with long black hair gathered in an elegant bun with a jade hairpin and fluttering jade silk ribbons, dressed in flowing celadon green and white daoist robes with gold trim.
- Col 1: Standing upright, hands clasped behind back, looking forward.
- Col 2: Seated upright in full lotus meditation posture, hands resting on knees.
- Col 3: Seated in deep meditation with arms extended in mudra, surrounded by a luminous golden spiritual aura glowing around her silhouette.
- Col 4: Seated upright, raising both hands aloft offering a radiant glowing golden elixir pearl / spiritual bead (Linh Đan).
ROW 2 (Male Daoist / Nam Tu Sĩ): Male cultivator with long straight black hair in a half-up topknot secured with a jade crown, dressed in cyan and pearl-white cultivation robes with wide sleeves and dark sash.
- Col 1: Standing upright with hands held behind back.
- Col 2: Seated in full lotus meditation, hands resting on lap.
- Col 3: Seated in meditation with hands poised, surrounded by an intense golden cultivation aura.
- Col 4: Seated upright, raising right hand offering a glowing golden spiritual pearl with light rays.
TECHNICAL OUTPUT: Flat solid magenta #FF00FF background. Consistent 4x2 grid spacing, shared character scale and ground baseline across all poses. Rear view, no faces visible. No grid lines, no text, no watermark.
```

---

## 4. Normalization & Chroma Extraction Algorithm

Implemented in `scripts/normalize-assets.mjs`:
1. **Magenta Excess Calculation**:
   $$m = \frac{\min(R, B) - G}{255}$$
2. **Segmentation**:
   - $m \ge 0.86$: Pure backdrop $\to \alpha = 0, R=0, G=0, B=0$.
   - $m \le 0.04$: Pure foreground $\to \alpha = 255$.
   - $0.04 < m < 0.86$: Anti-aliased edge / semi-transparent mist:
     $$t = \frac{m - 0.04}{0.86 - 0.04}, \quad a = 1 - t, \quad \alpha = \lfloor a \cdot 255 \rceil$$
     $$R_{\text{clean}} = \text{clamp}\left(0, 255, \frac{R - (1 - a) \cdot 255}{\max(a, 0.08)}\right)$$
     $$G_{\text{clean}} = \text{clamp}\left(0, 255, \frac{G}{\max(a, 0.08)}\right)$$
     $$B_{\text{clean}} = \text{clamp}\left(0, 255, \frac{B - (1 - a) \cdot 255}{\max(a, 0.08)}\right)$$
     *Residual clamp*: if $R_{\text{clean}} > G_{\text{clean}} \land B_{\text{clean}} > G_{\text{clean}}$, clamp $B_{\text{clean}} = G_{\text{clean}}$ and $R_{\text{clean}} = \min(R_{\text{clean}}, 1.15 \cdot G_{\text{clean}})$.
3. **Atlas Slicing & Baseline Alignment**:
   - Slices source into 8 bounding boxes where $\alpha > 32$.
   - Computes uniform per-row scale to fit standing pose into 448px height.
   - Positions each frame centered at $X = \lfloor (512 - W) / 2 \rceil$ and ground baseline anchored at $Y = 490 - H$.
   - Result: 2048×1024 RGBA atlas with rock-solid baseline and zero pink fringes.
