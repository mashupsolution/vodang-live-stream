import Phaser from "phaser";

/**
 * Procedural texture generation for Tu Tiên Online LIVE flying sword array.
 * Generates high-fidelity procedural canvas textures matching the Celadon-Gold (Vân Ngọc & Kim Quang) theme.
 */
export function generateSwordTextures(scene: Phaser.Scene): void {
  // 1. "flying-sword": 24×110 slender celadon-cyan glowing blade with golden crossguard and spiritual aura
  if (!scene.textures.exists("flying-sword")) {
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 110;
    const ctx = canvas.getContext("2d")!;

    // Step A: Subtle spiritual blade aura (#6ee7b7)
    ctx.shadowColor = "#6ee7b7";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(110, 231, 183, 0.40)";
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(19, 16);
    ctx.lineTo(18, 84);
    ctx.lineTo(6, 84);
    ctx.lineTo(5, 16);
    ctx.closePath();
    ctx.fill();

    // Step B: Slender celadon-cyan glowing blade body (#38bdf8)
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 4;
    const bladeGrad = ctx.createLinearGradient(6, 0, 18, 0);
    bladeGrad.addColorStop(0, "#0284c7");
    bladeGrad.addColorStop(0.5, "#38bdf8");
    bladeGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(17, 18);
    ctx.lineTo(17, 82);
    ctx.lineTo(7, 82);
    ctx.lineTo(7, 18);
    ctx.closePath();
    ctx.fill();

    // Step C: Inner luminous spine highlight (#e0f2fe core)
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 3;
    const coreGrad = ctx.createLinearGradient(9, 0, 15, 0);
    coreGrad.addColorStop(0, "#bae6fd");
    coreGrad.addColorStop(0.5, "#ffffff");
    coreGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(14.5, 18);
    ctx.lineTo(14, 80);
    ctx.lineTo(10, 80);
    ctx.lineTo(9.5, 18);
    ctx.closePath();
    ctx.fill();

    // Step D: Central ridge line (#e0f2fe)
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(12, 80);
    ctx.stroke();

    // Step E: Golden winged crossguard / hilt (#fef08a, #f59e0b)
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 5;
    const guardGrad = ctx.createLinearGradient(3, 82, 21, 88);
    guardGrad.addColorStop(0, "#f59e0b");
    guardGrad.addColorStop(0.5, "#fef08a");
    guardGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = guardGrad;
    ctx.beginPath();
    ctx.moveTo(12, 86);
    ctx.lineTo(3, 83);
    ctx.lineTo(3, 86);
    ctx.lineTo(10, 88.5);
    ctx.lineTo(12, 89.5);
    ctx.lineTo(14, 88.5);
    ctx.lineTo(21, 86);
    ctx.lineTo(21, 83);
    ctx.closePath();
    ctx.fill();

    // Center talisman jade gem
    ctx.fillStyle = "#6ee7b7";
    ctx.beginPath();
    ctx.arc(12, 86, 2, 0, Math.PI * 2);
    ctx.fill();

    // Step F: Hilt / grip (#0f766e with #fef08a bindings)
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(10, 89.5, 4, 12);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1;
    for (const gy of [92, 95, 98]) {
      ctx.beginPath();
      ctx.moveTo(10, gy);
      ctx.lineTo(14, gy);
      ctx.stroke();
    }

    // Step G: Pommel ring & spiritual jade tassel
    ctx.shadowColor = "#fef08a";
    ctx.shadowBlur = 3;
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(12, 103, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 2;
    ctx.shadowColor = "#6ee7b7";
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 106);
    ctx.lineTo(12, 109.5);
    ctx.stroke();

    scene.textures.addCanvas("flying-sword", canvas);
  }

  // 2. "sword-trail": 16×16 small glowing cyan-gold trail segment/whisper particle
  if (!scene.textures.exists("sword-trail")) {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.25, "rgba(224, 242, 254, 0.85)");
    grad.addColorStop(0.55, "rgba(56, 189, 248, 0.55)");
    grad.addColorStop(0.8, "rgba(254, 240, 138, 0.22)");
    grad.addColorStop(1.0, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    scene.textures.addCanvas("sword-trail", canvas);
  }

  // 3. "bagua-array": 256×256 circular Daoist talisman / Bagua rune array canvas
  if (!scene.textures.exists("bagua-array")) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    // Step A: Background radial spirit glow (#6ee7b7 & #059669)
    const bgGlow = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
    bgGlow.addColorStop(0, "rgba(110, 231, 183, 0.18)");
    bgGlow.addColorStop(0.65, "rgba(5, 150, 105, 0.08)");
    bgGlow.addColorStop(1, "rgba(5, 150, 105, 0)");
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, 256, 256);

    // Step B: Outer golden & celadon borders
    ctx.shadowColor = "#fef08a";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = "#6ee7b7";
    ctx.shadowBlur = 4;
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.stroke();

    // 32 border rune dots
    ctx.fillStyle = "#fef08a";
    ctx.shadowBlur = 2;
    for (let k = 0; k < 32; k++) {
      const dotAngle = (k * Math.PI * 2) / 32;
      const dx = 128 + 119 * Math.cos(dotAngle);
      const dy = 128 + 119 * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner bounding ring of the trigram zone
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(128, 128, 88, 0, Math.PI * 2);
    ctx.stroke();

    // Step C: Outer Bagua 8 Trigrams (Bát Quái) in radius range [92, 110]
    // 1 = solid line (Yang), 0 = broken line with gap (Yin)
    const trigrams = [
      [1, 1, 1], // 0: Càn (Qian - Heaven) ☰
      [0, 1, 1], // 1: Đoài (Dui - Lake) ☱
      [1, 0, 1], // 2: Ly (Li - Fire) ☲
      [0, 0, 1], // 3: Chấn (Zhen - Thunder) ☳
      [1, 1, 0], // 4: Tốn (Xun - Wind) ☴
      [0, 1, 0], // 5: Khảm (Kan - Water) ☵
      [1, 0, 0], // 6: Cấn (Gen - Mountain) ☶
      [0, 0, 0], // 7: Khôn (Kun - Earth) ☷
    ];

    const trigramRadii = [110, 101, 92]; // outer to inner
    const halfSpan = (11 * Math.PI) / 180; // 11 deg half arc
    const halfGap = (2.4 * Math.PI) / 180; // gap for Yin broken lines

    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "#fef08a";
    ctx.shadowBlur = 4;

    for (let i = 0; i < 8; i++) {
      const midAngle = (i * Math.PI * 2) / 8;
      const bars = trigrams[i];

      for (let b = 0; b < 3; b++) {
        const r = trigramRadii[b];
        const isYang = bars[b] === 1;

        if (isYang) {
          ctx.beginPath();
          ctx.arc(128, 128, r, midAngle - halfSpan, midAngle + halfSpan);
          ctx.stroke();
        } else {
          // Left segment
          ctx.beginPath();
          ctx.arc(128, 128, r, midAngle - halfSpan, midAngle - halfGap);
          ctx.stroke();
          // Right segment
          ctx.beginPath();
          ctx.arc(128, 128, r, midAngle + halfGap, midAngle + halfSpan);
          ctx.stroke();
        }
      }
    }

    // Step D: Middle Talisman Ring with 8 Daoist Celestial Diamonds
    ctx.shadowColor = "#6ee7b7";
    ctx.shadowBlur = 3;
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(128, 128, 76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    for (let k = 0; k < 8; k++) {
      const runeAngle = ((k + 0.5) * Math.PI * 2) / 8;
      const rx = 128 + 82 * Math.cos(runeAngle);
      const ry = 128 + 82 * Math.sin(runeAngle);
      ctx.beginPath();
      ctx.moveTo(rx, ry - 3.5);
      ctx.lineTo(rx + 2.5, ry);
      ctx.lineTo(rx, ry + 3.5);
      ctx.lineTo(rx - 2.5, ry);
      ctx.closePath();
      ctx.fill();
    }

    // Step E: Inner Yin-Yang / Taiji Spirit Spiral (radius = 50)
    ctx.shadowColor = "#fef08a";
    ctx.shadowBlur = 6;
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 128, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Right half (Yang - Celadon/Emerald Jade: #059669 -> #6ee7b7)
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 128, 50, -Math.PI / 2, Math.PI / 2);
    ctx.arc(128, 153, 25, Math.PI / 2, -Math.PI / 2, false);
    ctx.arc(128, 103, 25, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    const jadeGrad = ctx.createLinearGradient(128, 78, 128, 178);
    jadeGrad.addColorStop(0, "#6ee7b7");
    jadeGrad.addColorStop(1, "#059669");
    ctx.fillStyle = jadeGrad;
    ctx.fill();
    ctx.restore();

    // Left half (Yin - Golden Elixir: #fef08a -> #f59e0b)
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 128, 50, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.arc(128, 103, 25, -Math.PI / 2, Math.PI / 2, false);
    ctx.arc(128, 153, 25, -Math.PI / 2, Math.PI / 2, true);
    ctx.closePath();
    const goldGrad = ctx.createLinearGradient(128, 78, 128, 178);
    goldGrad.addColorStop(0, "#fef08a");
    goldGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.restore();

    // Daoist Yin-Yang Eye Dots
    // Top eye (gold in jade half)
    ctx.fillStyle = "#fef08a";
    ctx.shadowColor = "#fef08a";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(128, 103, 5, 0, Math.PI * 2);
    ctx.fill();

    // Bottom eye (jade in gold half)
    ctx.fillStyle = "#059669";
    ctx.shadowColor = "#6ee7b7";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(128, 153, 5, 0, Math.PI * 2);
    ctx.fill();

    // Step F: Subtle central spirit bloom
    const coreBloom = ctx.createRadialGradient(128, 128, 0, 128, 128, 52);
    coreBloom.addColorStop(0, "rgba(254, 240, 138, 0.35)");
    coreBloom.addColorStop(0.7, "rgba(110, 231, 183, 0.15)");
    coreBloom.addColorStop(1, "rgba(110, 231, 183, 0)");
    ctx.fillStyle = coreBloom;
    ctx.beginPath();
    ctx.arc(128, 128, 52, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas("bagua-array", canvas);
  }
}

export interface PooledSword {
  sprite: Phaser.GameObjects.Image;
  ring: number; // 0 = Ring 1 (inner), 1 = Ring 2 (outer), 2 = Reserve (burst)
  indexInRing: number; // 0..7
  baseRx: number;
  baseRy: number;
  tilt: number;
  speed: number;
  angle: number;
  active: boolean;
}

export interface PooledTrail {
  sprite: Phaser.GameObjects.Image;
  life: number;
  maxLife: number;
  baseScale: number;
  baseAlpha: number;
}

/**
 * Orbiting Sword Array (Linh Kiếm Hộ Đỉnh) and Bagua Dais array.
 * Controls 2.5D orbital depth sorting around Tứ Linh Đỉnh bronze-jade cauldron,
 * reactive Vạn Kiếm Quy Tông bursts, and protective celestial tribulation canopy.
 *
 * Strict performance rule: ZERO heap allocations in update() loop.
 */
export class SwordFormationManager {
  private baguaImage?: Phaser.GameObjects.Image;
  private swords: PooledSword[] = [];
  private trails: PooledTrail[] = [];
  private trailHead = 0;
  private trailTimer = 0;
  private trailSwordCycle = 0;

  // Cauldron center reference coordinates
  private readonly CAULDRON_CX = 540;
  private readonly CAULDRON_CY = 770;

  // Reactive state
  private burstTimer = 0;
  private burstDuration = 3500;
  private burstIntensity = 1;

  private tribulationTimer = 0;
  private tribulationDuration = 4000;

  constructor(scene?: Phaser.Scene) {
    if (scene) {
      this.create(scene);
    }
  }

  /**
   * Pre-warms Bagua Dais, fixed pool of 24 swords, and fixed pool of 32 trail sprites.
   */
  public create(scene: Phaser.Scene): void {
    generateSwordTextures(scene);

    // 1. Bagua Dais Image: (540, 1060), depth 1.2, blendMode ADD, scale ~1.8 (scaleY ~0.45 flat perspective)
    this.baguaImage = scene.add
      .image(540, 1060, "bagua-array")
      .setDepth(1.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.8, 1.8 * 0.45) // scaleX 1.8, scaleY 0.81
      .setAlpha(0.68);

    // 2. Pre-warm fixed pool of 24 sword sprites:
    // - Ring 1: 8 swords, Rx = 310, Ry = 100, tilt = +16 deg (+0.279253 rad), speed = +0.0016 rad/ms
    // - Ring 2: 8 swords, Rx = 360, Ry = 120, tilt = -14 deg (-0.244346 rad), speed = -0.0012 rad/ms
    // - Reserve: 8 swords, Rx = 420, Ry = 140, tilt = +8 deg (+0.139626 rad), speed = +0.0022 rad/ms
    this.swords = [];
    for (let i = 0; i < 24; i++) {
      const ring = i < 8 ? 0 : i < 16 ? 1 : 2;
      const indexInRing = i % 8;
      const baseRx = ring === 0 ? 310 : ring === 1 ? 360 : 420;
      const baseRy = ring === 0 ? 100 : ring === 1 ? 120 : 140;
      const tilt = ring === 0 ? 0.279253 : ring === 1 ? -0.244346 : 0.139626;
      const speed = ring === 0 ? 0.0016 : ring === 1 ? -0.0012 : 0.0022;
      const angle = (indexInRing * (Math.PI * 2)) / 8;
      const active = ring < 2; // Rings 1 & 2 active initially; reserve inactive until burst/tribulation

      const sprite = scene.add
        .image(this.CAULDRON_CX, this.CAULDRON_CY, "flying-sword")
        .setOrigin(0.5, 0.5)
        .setDepth(2.4)
        .setVisible(active)
        .setBlendMode(Phaser.BlendModes.NORMAL);

      this.swords.push({
        sprite,
        ring,
        indexInRing,
        baseRx,
        baseRy,
        tilt,
        speed,
        angle,
        active,
      });
    }

    // 3. Pre-warm fixed pool of 32 sword trail particle sprites for afterimages
    this.trails = [];
    for (let i = 0; i < 32; i++) {
      const sprite = scene.add
        .image(0, 0, "sword-trail")
        .setOrigin(0.5, 0.5)
        .setDepth(2.3)
        .setVisible(false)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.trails.push({
        sprite,
        life: 0,
        maxLife: 320,
        baseScale: 1.0,
        baseAlpha: 0.7,
      });
    }

    this.trailHead = 0;
    this.trailTimer = 0;
    this.trailSwordCycle = 0;
  }

  /**
   * Spawns an afterimage trail particle from the pre-warmed pool (Zero allocations).
   */
  private spawnTrail(
    x: number,
    y: number,
    scale: number,
    alpha: number,
    maxLife: number,
    depth: number,
  ): void {
    const t = this.trails[this.trailHead];
    this.trailHead = (this.trailHead + 1) % 32;

    t.sprite
      .setPosition(x, y)
      .setScale(scale)
      .setAlpha(alpha)
      .setDepth(depth)
      .setVisible(true);

    t.life = maxLife;
    t.maxLife = maxLife;
    t.baseScale = scale;
    t.baseAlpha = alpha;
  }

  /**
   * Trigger Vạn Kiếm Quy Tông burst (on `action === 'sword'` or high-tier gifts).
   * Temporarily speeds up orbits (3x), expands radius, activates reserve swords
   * spiraling outward/upward with bright flare for 3.5s, then smoothly returns to idle.
   */
  public triggerBurst(intensity = 1): void {
    this.burstTimer = 3500;
    this.burstDuration = 3500;
    this.burstIntensity = Math.max(1, Math.min(3, intensity || 1));

    // Activate 8 reserve swords
    for (let i = 16; i < 24; i++) {
      const s = this.swords[i];
      s.active = true;
      s.sprite.setVisible(true);
    }
  }

  /**
   * Trigger Lôi Kiếm Hộ Thể on tribulation events.
   * Swords form a protective canopy pointing upward above the cauldron,
   * vibrating with celestial energy for 4s.
   */
  public triggerTribulation(): void {
    this.tribulationTimer = 4000;
    this.tribulationDuration = 4000;

    // Activate reserve swords to reinforce the canopy
    for (let i = 16; i < 24; i++) {
      const s = this.swords[i];
      s.active = true;
      s.sprite.setVisible(true);
    }
  }

  /**
   * Main per-frame update loop.
   * Strictly avoids any memory/heap allocations.
   *
   * @param time Total game elapsed time in ms
   * @param delta Frame delta in ms
   * @param capture When true, renders deterministic fixed positions for visual snapshots
   */
  public update(time: number, delta: number, capture = false): void {
    const evalTime = capture ? 5000 : time;
    const evalDelta = capture ? 16.666 : Math.min(Math.max(delta, 0), 1000);

    // 1. Update Bagua Dais array
    if (this.baguaImage) {
      if (capture) {
        this.baguaImage.setRotation(5000 * 0.0003);
        this.baguaImage.setAlpha(0.68);
      } else {
        this.baguaImage.rotation += evalDelta * 0.0003;
        this.baguaImage.setAlpha(0.64 + Math.sin(evalTime * 0.0014) * 0.08);
      }
    }

    // 2. Compute reactive burst parameters
    let burstWeight = 0;
    let speedMult = 1.0;
    let rxExpansion = 1.0;
    let ryExpansion = 1.0;
    let reserveLift = 0;

    if (!capture && this.burstTimer > 0) {
      this.burstTimer -= evalDelta;
      if (this.burstTimer <= 0) {
        this.burstTimer = 0;
        // Deactivate reserve swords unless tribulation is active
        if (this.tribulationTimer <= 0) {
          for (let i = 16; i < 24; i++) {
            this.swords[i].active = false;
            this.swords[i].sprite.setVisible(false);
          }
        }
      } else {
        const progress = this.burstTimer / this.burstDuration; // 1 -> 0
        // Smooth sine envelope: rapid flare then gentle decay
        burstWeight = Math.sin(progress * Math.PI * 0.5);
        speedMult = 1.0 + 2.0 * burstWeight * (0.6 + 0.4 * this.burstIntensity);
        rxExpansion =
          1.0 + 0.32 * burstWeight * (0.6 + 0.4 * this.burstIntensity);
        ryExpansion =
          1.0 + 0.24 * burstWeight * (0.6 + 0.4 * this.burstIntensity);
        reserveLift = -150 * burstWeight;
      }
    }

    // 3. Compute reactive tribulation canopy parameters
    let tribWeight = 0;
    if (!capture && this.tribulationTimer > 0) {
      this.tribulationTimer -= evalDelta;
      if (this.tribulationTimer <= 0) {
        this.tribulationTimer = 0;
        // Deactivate reserve swords unless burst is active
        if (this.burstTimer <= 0) {
          for (let i = 16; i < 24; i++) {
            this.swords[i].active = false;
            this.swords[i].sprite.setVisible(false);
          }
        }
      } else {
        const elapsed = this.tribulationDuration - this.tribulationTimer;
        // Attack 0..450ms, Sustain 450..3200ms, Release 3200..4000ms
        if (elapsed < 450) {
          tribWeight = elapsed / 450;
        } else if (this.tribulationTimer < 800) {
          tribWeight = this.tribulationTimer / 800;
        } else {
          tribWeight = 1.0;
        }
      }
    }

    // 4. Update sword positions and 2.5D depth sorting
    for (let i = 0; i < 24; i++) {
      const s = this.swords[i];
      if (!s.active) {
        s.sprite.setVisible(false);
        continue;
      }

      s.sprite.setVisible(true);

      // Advance angular position
      if (capture) {
        // Deterministic fixed positions in capture mode
        s.angle = (s.indexInRing * (Math.PI * 2)) / 8 + s.speed * 5000;
      } else {
        s.angle += s.speed * evalDelta * speedMult;
        if (s.angle > Math.PI * 2) s.angle -= Math.PI * 2;
        if (s.angle < -Math.PI * 2) s.angle += Math.PI * 2;
      }

      const theta = s.angle;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      // Orbital ellipse radii with burst expansion
      let rx = s.baseRx * rxExpansion;
      let ry = s.baseRy * ryExpansion;
      let yOffset = 0;

      if (s.ring === 2) {
        // Reserve swords spiral outward and lift upward
        rx *= 1.0 + 0.35 * burstWeight;
        ry *= 1.0 + 0.25 * burstWeight;
        yOffset = reserveLift;
      }

      // Untilted 2D orbit coordinates
      const u = rx * cosT;
      const v = ry * sinT;

      // Rotate by orbit tilt angle
      const cosTilt = Math.cos(s.tilt);
      const sinTilt = Math.sin(s.tilt);

      const orbitX = this.CAULDRON_CX + (u * cosTilt - v * sinTilt);
      const orbitY = this.CAULDRON_CY + (u * sinTilt + v * cosTilt) + yOffset;

      // Velocity components for tangent rotation
      const uPrime = -rx * s.speed * sinT;
      const vPrime = ry * s.speed * cosT;
      const vx = uPrime * cosTilt - vPrime * sinTilt;
      const vy = uPrime * sinTilt + vPrime * cosTilt;

      // Tangent rotation: Point sword tip along velocity vector atan2(vy, vx) + pi/2
      const orbitRot = Math.atan2(vy, vx) + Math.PI * 0.5;

      // True 2.5D Depth Sorting:
      // - If sin(theta) < 0 (back arc behind cauldron): depth 1.8, scale ~0.85, alpha ~0.75
      // - If sin(theta) >= 0 (front arc in front of cauldron): depth 2.4, scale ~1.1, alpha ~0.95
      let orbitDepth: number;
      let baseScale: number;
      let baseAlpha: number;

      if (sinT < 0) {
        orbitDepth = 1.8;
        baseScale = 0.85 + 0.1 * (1 + sinT);
        baseAlpha = 0.75 + 0.1 * (1 + sinT);
      } else {
        orbitDepth = 2.4;
        baseScale = 0.95 + 0.15 * sinT;
        baseAlpha = 0.85 + 0.1 * sinT;
      }

      // Reactive burst scale & flare adjustments
      let finalScale = baseScale;
      let finalAlpha = baseAlpha;
      if (burstWeight > 0) {
        finalScale *= 1.0 + 0.22 * burstWeight;
        finalAlpha = Math.min(1.0, baseAlpha + 0.18 * burstWeight);
        s.sprite.setTint(0xfffbeb);
      } else if (tribWeight === 0) {
        s.sprite.clearTint();
      }

      // Reactive Tribulation Canopy Calculation
      let finalX = orbitX;
      let finalY = orbitY;
      let finalRot = orbitRot;
      let finalDepth = orbitDepth;

      if (tribWeight > 0) {
        // Protective canopy dome above cauldron: center (540, 560)
        // Spread 8 swords across an upward protective umbrella arc
        const k = s.indexInRing;
        const archSpan = Math.PI * 0.75;
        const archAngle = -Math.PI * 0.5 + ((k - 3.5) / 3.5) * (archSpan * 0.5);
        const archRadius = s.ring === 0 ? 210 : s.ring === 1 ? 270 : 330;
        const ringY = s.ring === 0 ? 0 : s.ring === 1 ? -32 : -64;

        const canopyTargetX = 540 + Math.cos(archAngle) * archRadius;
        const canopyTargetY =
          560 + Math.sin(archAngle) * (archRadius * 0.44) + ringY;

        // Sword tip radiating upward towards tribulation thunderclouds
        const canopyTargetRot = (archAngle + Math.PI * 0.5) * 0.35;

        // Celestial energy high-frequency vibration
        const vibeX = Math.sin(evalTime * 0.048 + i * 2.1) * 3.8 * tribWeight;
        const vibeY = Math.cos(evalTime * 0.054 + i * 1.7) * 3.8 * tribWeight;

        // Blend smoothly between orbit position and canopy position
        finalX =
          (1 - tribWeight) * orbitX + tribWeight * (canopyTargetX + vibeX);
        finalY =
          (1 - tribWeight) * orbitY + tribWeight * (canopyTargetY + vibeY);
        finalRot = (1 - tribWeight) * orbitRot + tribWeight * canopyTargetRot;
        finalDepth = tribWeight > 0.4 ? 2.5 : orbitDepth;
        finalScale = baseScale * (1.0 + 0.15 * tribWeight);
        finalAlpha = Math.min(1.0, baseAlpha + 0.2 * tribWeight);

        // Brilliant lightning celestial cyan-white tint
        s.sprite.setTint(0xe0f2fe);
      }

      s.sprite.setPosition(finalX, finalY);
      s.sprite.setRotation(finalRot);
      s.sprite.setScale(finalScale);
      s.sprite.setAlpha(finalAlpha);
      s.sprite.setDepth(finalDepth);
    }

    // 5. Update Trail Afterimages (Zero allocations)
    if (!capture) {
      this.trailTimer += evalDelta;
      const trailInterval =
        this.burstTimer > 0 ? 28 : this.tribulationTimer > 0 ? 35 : 60;

      if (this.trailTimer >= trailInterval) {
        this.trailTimer = 0;
        const swordCount =
          this.burstTimer > 0 || this.tribulationTimer > 0 ? 24 : 16;
        const targetSword = this.swords[this.trailSwordCycle % swordCount];
        this.trailSwordCycle++;

        if (targetSword && targetSword.active && targetSword.sprite.visible) {
          const trailAlpha =
            targetSword.sprite.alpha *
            0.55 *
            (this.burstTimer > 0 || this.tribulationTimer > 0 ? 1.3 : 1.0);
          this.spawnTrail(
            targetSword.sprite.x,
            targetSword.sprite.y,
            targetSword.sprite.scaleX * 0.8,
            Math.min(0.9, trailAlpha),
            this.burstTimer > 0 ? 280 : 360,
            targetSword.sprite.depth - 0.01,
          );
        }
      }
    }

    // Step active trails forward
    for (let i = 0; i < 32; i++) {
      const t = this.trails[i];
      if (t.life <= 0) continue;

      t.life -= evalDelta;
      if (t.life <= 0) {
        t.life = 0;
        t.sprite.setVisible(false);
      } else {
        const factor = t.life / t.maxLife; // 1 down to 0
        t.sprite.setAlpha(t.baseAlpha * factor);
        t.sprite.setScale(t.baseScale * (0.6 + 0.4 * factor));
      }
    }
  }

  /**
   * Cleans up all created sprites and graphics.
   */
  public destroy(): void {
    if (this.baguaImage) {
      this.baguaImage.destroy();
      this.baguaImage = undefined;
    }

    for (let i = 0; i < this.swords.length; i++) {
      this.swords[i].sprite.destroy();
    }
    this.swords.length = 0;

    for (let i = 0; i < this.trails.length; i++) {
      this.trails[i].sprite.destroy();
    }
    this.trails.length = 0;
  }

  // Getters for inspection / testing
  public getSwords(): readonly PooledSword[] {
    return this.swords;
  }

  public getTrails(): readonly PooledTrail[] {
    return this.trails;
  }

  public getBaguaImage(): Phaser.GameObjects.Image | undefined {
    return this.baguaImage;
  }

  public isBursting(): boolean {
    return this.burstTimer > 0;
  }

  public isTribulating(): boolean {
    return this.tribulationTimer > 0;
  }
}
