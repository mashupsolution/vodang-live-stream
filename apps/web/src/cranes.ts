import Phaser from "phaser";

/**
 * Tiên Hạc Đan Đỉnh (Red-Crowned Celestial Crane)
 * Procedural Sprite & Animation System for Tu Tiên Online LIVE.
 *
 * Designed for 1080×1920 portrait canvas.
 * Sky/cloud corridor: Y between 180 and 460.
 * Depth: ~1.2 (above background hall & mist, behind foreground lights and text).
 * Performance: Strictly pooled sprites with ZERO allocations in the update loop.
 */

export interface CraneItem {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseY: number;
  phase: number;
  flapTimer: number;
  flapDuration: number;
  glideDuration: number;
  isGliding: boolean;
  scale: number;
}

const FRAME_SIZE = 80;
const FRAME_COUNT = 4;

/**
 * Generates the 4-frame procedural spritesheet for the Celestial Crane and registers
 * the "crane-fly" looping animation in Phaser.
 */
export function generateCraneTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("crane-flap")) {
    registerCraneAnimation(scene);
    return;
  }

  if (typeof document === "undefined") {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE * FRAME_COUNT;
  canvas.height = FRAME_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  for (let f = 0; f < FRAME_COUNT; f++) {
    drawCraneFrame(ctx, f, f * FRAME_SIZE, 0, FRAME_SIZE);
  }

  const texture = scene.textures.addCanvas("crane-flap", canvas);
  if (texture) {
    for (let i = 0; i < FRAME_COUNT; i++) {
      texture.add(i, 0, i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);
    }
  }

  registerCraneAnimation(scene);
}

function registerCraneAnimation(scene: Phaser.Scene): void {
  if (scene.anims && !scene.anims.exists("crane-fly")) {
    scene.anims.create({
      key: "crane-fly",
      frames: scene.anims.generateFrameNumbers("crane-flap", {
        start: 0,
        end: 3,
      }),
      frameRate: 7,
      repeat: -1,
    });
  }
}

/**
 * Procedurally draws a single frame of the Celestial Crane onto HTML5 Canvas.
 *
 * Frame 0 (Up-stroke): White wings angled up in steep V, slender neck, black wingtips, red cinnabar crown.
 * Frame 1 (Gliding spread): Wings outstretched horizontally, white feather body, black primary edges, trailing black legs.
 * Frame 2 (Down-stroke): Wings swept downwards with power, curved tips cupping celestial qi.
 * Frame 3 (Recovery glide): Wings leveling out, streamlined recovery glide.
 */
function drawCraneFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  ox: number,
  oy: number,
  size: number,
): void {
  const WHITE_PLUMAGE = "#ffffff";
  const FEATHER_SHADOW = "#e2e8f0";
  const WING_HIGHLIGHT = "#f8fafc";
  const BLACK_PRIMARY = "#1e293b";
  const DEEP_BLACK = "#0f172a";
  const CROWN_RED = "#ef4444";
  const BEAK_AMBER = "#d97706";
  const BEAK_TIP = "#78350f";
  const EYE_DARK = "#0f172a";
  const JADE_QI_MIST = "rgba(110, 231, 183, 0.16)";
  const GOLD_QI_MIST = "rgba(254, 240, 138, 0.12)";

  // 0. Soft Daoist Celestial Spirit Aura around the Crane
  ctx.save();
  const auraGrad = ctx.createRadialGradient(
    ox + 40,
    oy + 40,
    6,
    ox + 40,
    oy + 40,
    38,
  );
  auraGrad.addColorStop(0, GOLD_QI_MIST);
  auraGrad.addColorStop(0.5, JADE_QI_MIST);
  auraGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = auraGrad;
  ctx.fillRect(ox, oy, size, size);
  ctx.restore();

  // 1. Far Wing (Drawn behind body for 2.5D depth)
  ctx.save();
  ctx.fillStyle = FEATHER_SHADOW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (frame === 0) {
    // Up-stroke: far wing points up and slightly back
    ctx.beginPath();
    ctx.moveTo(ox + 40, oy + 36);
    ctx.bezierCurveTo(ox + 36, oy + 24, ox + 32, oy + 12, ox + 26, oy + 6);
    ctx.lineTo(ox + 20, oy + 12);
    ctx.lineTo(ox + 25, oy + 22);
    ctx.bezierCurveTo(ox + 30, oy + 28, ox + 34, oy + 34, ox + 38, oy + 38);
    ctx.closePath();
    ctx.fill();

    // Far black wingtips
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 26, oy + 6);
    ctx.lineTo(ox + 20, oy + 12);
    ctx.lineTo(ox + 24, oy + 18);
    ctx.lineTo(ox + 28, oy + 12);
    ctx.closePath();
    ctx.fill();
  } else if (frame === 1) {
    // Gliding spread: far wing outstretched horizontally behind
    ctx.beginPath();
    ctx.moveTo(ox + 42, oy + 38);
    ctx.bezierCurveTo(ox + 36, oy + 32, ox + 24, oy + 28, ox + 14, oy + 26);
    ctx.lineTo(ox + 10, oy + 30);
    ctx.bezierCurveTo(ox + 20, oy + 34, ox + 30, oy + 38, ox + 38, oy + 40);
    ctx.closePath();
    ctx.fill();

    // Black trailing edge feathers on far wing
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 14, oy + 26);
    ctx.lineTo(ox + 10, oy + 30);
    ctx.lineTo(ox + 24, oy + 34);
    ctx.lineTo(ox + 26, oy + 30);
    ctx.closePath();
    ctx.fill();
  } else if (frame === 2) {
    // Down-stroke: far wing swept down
    ctx.beginPath();
    ctx.moveTo(ox + 42, oy + 38);
    ctx.bezierCurveTo(ox + 38, oy + 46, ox + 32, oy + 56, ox + 26, oy + 64);
    ctx.lineTo(ox + 22, oy + 60);
    ctx.bezierCurveTo(ox + 28, oy + 50, ox + 34, oy + 42, ox + 38, oy + 38);
    ctx.closePath();
    ctx.fill();

    // Black wingtip
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 26, oy + 64);
    ctx.lineTo(ox + 22, oy + 60);
    ctx.lineTo(ox + 28, oy + 52);
    ctx.lineTo(ox + 31, oy + 56);
    ctx.closePath();
    ctx.fill();
  } else {
    // Frame 3 (Recovery glide): far wing leveling out
    ctx.beginPath();
    ctx.moveTo(ox + 42, oy + 38);
    ctx.bezierCurveTo(ox + 34, oy + 36, ox + 24, oy + 38, ox + 14, oy + 42);
    ctx.lineTo(ox + 18, oy + 46);
    ctx.bezierCurveTo(ox + 26, oy + 44, ox + 34, oy + 42, ox + 40, oy + 40);
    ctx.closePath();
    ctx.fill();

    // Black wingtip
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 14, oy + 42);
    ctx.lineTo(ox + 18, oy + 46);
    ctx.lineTo(ox + 26, oy + 44);
    ctx.lineTo(ox + 22, oy + 40);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 2. Trailing Black Legs (long, slender, streamlined behind in flight)
  ctx.save();
  ctx.strokeStyle = DEEP_BLACK;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";

  // Leg 1 (upper leg)
  ctx.beginPath();
  ctx.moveTo(ox + 32, oy + 42);
  ctx.lineTo(ox + 18, oy + 44);
  ctx.lineTo(ox + 4, oy + 45);
  ctx.stroke();

  // Small claw 1
  ctx.beginPath();
  ctx.moveTo(ox + 4, oy + 45);
  ctx.lineTo(ox + 1, oy + 44.5);
  ctx.stroke();

  // Leg 2 (lower leg)
  ctx.beginPath();
  ctx.moveTo(ox + 30, oy + 44);
  ctx.lineTo(ox + 16, oy + 47);
  ctx.lineTo(ox + 2, oy + 48.5);
  ctx.stroke();

  // Small claw 2
  ctx.beginPath();
  ctx.moveTo(ox + 2, oy + 48.5);
  ctx.lineTo(ox - 1, oy + 48);
  ctx.stroke();
  ctx.restore();

  // 3. Tail & Black Plumes (trailing tertial plumes)
  ctx.save();
  ctx.fillStyle = BLACK_PRIMARY;
  ctx.beginPath();
  ctx.moveTo(ox + 28, oy + 41);
  ctx.quadraticCurveTo(ox + 18, oy + 41, ox + 10, oy + 44);
  ctx.quadraticCurveTo(ox + 20, oy + 45, ox + 26, oy + 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. White Torso / Body (sleek, aerodynamic)
  ctx.save();
  ctx.fillStyle = WHITE_PLUMAGE;
  ctx.beginPath();
  ctx.moveTo(ox + 26, oy + 42);
  ctx.bezierCurveTo(ox + 26, oy + 37, ox + 34, oy + 36, ox + 46, oy + 38);
  ctx.bezierCurveTo(ox + 52, oy + 39, ox + 54, oy + 42, ox + 50, oy + 45);
  ctx.bezierCurveTo(ox + 42, oy + 47, ox + 32, oy + 47, ox + 26, oy + 42);
  ctx.closePath();
  ctx.fill();

  // Soft belly shading
  ctx.fillStyle = FEATHER_SHADOW;
  ctx.beginPath();
  ctx.moveTo(ox + 28, oy + 43);
  ctx.bezierCurveTo(ox + 34, oy + 46, ox + 42, oy + 46, ox + 48, oy + 44);
  ctx.bezierCurveTo(ox + 44, oy + 46.5, ox + 34, oy + 46.5, ox + 28, oy + 43);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. Slender Graceful Neck & Head
  ctx.save();
  // White neck
  ctx.strokeStyle = WHITE_PLUMAGE;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ox + 48, oy + 40);
  ctx.bezierCurveTo(ox + 55, oy + 39, ox + 60, oy + 36, ox + 66, oy + 32);
  ctx.stroke();

  // Black throat stripe (Daoist crane signature black neck stripe)
  ctx.strokeStyle = BLACK_PRIMARY;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ox + 50, oy + 41);
  ctx.bezierCurveTo(ox + 56, oy + 40, ox + 60, oy + 37, ox + 65, oy + 33);
  ctx.stroke();

  // White Head
  ctx.fillStyle = WHITE_PLUMAGE;
  ctx.beginPath();
  ctx.ellipse(ox + 67, oy + 31.5, 3.8, 2.8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Red Cinnabar Crown (Đan Đỉnh) - vivid crimson ruby mark on forehead
  ctx.fillStyle = CROWN_RED;
  ctx.beginPath();
  ctx.ellipse(ox + 66, oy + 29, 2.2, 1.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Golden Beak (slender and sharp)
  ctx.fillStyle = BEAK_AMBER;
  ctx.beginPath();
  ctx.moveTo(ox + 70, oy + 30.5);
  ctx.lineTo(ox + 78, oy + 32);
  ctx.lineTo(ox + 70, oy + 33);
  ctx.closePath();
  ctx.fill();

  // Beak tip dark accent
  ctx.fillStyle = BEAK_TIP;
  ctx.beginPath();
  ctx.moveTo(ox + 75, oy + 31.5);
  ctx.lineTo(ox + 78, oy + 32);
  ctx.lineTo(ox + 75, oy + 32.5);
  ctx.closePath();
  ctx.fill();

  // Sharp Eye
  ctx.fillStyle = EYE_DARK;
  ctx.beginPath();
  ctx.arc(ox + 67, oy + 31, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Near Wing (Main foreground wing, distinct per frame)
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (frame === 0) {
    // Frame 0: Up-stroke - powerful wings raised high in steep V
    ctx.fillStyle = WING_HIGHLIGHT;
    ctx.beginPath();
    ctx.moveTo(ox + 44, oy + 39);
    ctx.bezierCurveTo(ox + 40, oy + 26, ox + 36, oy + 15, ox + 30, oy + 4);
    ctx.lineTo(ox + 23, oy + 12);
    ctx.lineTo(ox + 27, oy + 24);
    ctx.bezierCurveTo(ox + 32, oy + 32, ox + 38, oy + 38, ox + 42, oy + 41);
    ctx.closePath();
    ctx.fill();

    // Wing edge shadow
    ctx.strokeStyle = FEATHER_SHADOW;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Jet black primary flight feathers at tips
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 30, oy + 4);
    ctx.lineTo(ox + 23, oy + 12);
    ctx.lineTo(ox + 27, oy + 20);
    ctx.lineTo(ox + 31, oy + 14);
    ctx.closePath();
    ctx.fill();

    // Individual primary feather tip cuts
    ctx.fillStyle = DEEP_BLACK;
    ctx.beginPath();
    ctx.moveTo(ox + 23, oy + 12);
    ctx.lineTo(ox + 18, oy + 10);
    ctx.lineTo(ox + 25, oy + 16);
    ctx.closePath();
    ctx.fill();
  } else if (frame === 1) {
    // Frame 1: Gliding spread - wings outstretched horizontally, broad and majestic
    ctx.fillStyle = WING_HIGHLIGHT;
    ctx.beginPath();
    ctx.moveTo(ox + 46, oy + 39);
    ctx.bezierCurveTo(ox + 38, oy + 33, ox + 25, oy + 29, ox + 12, oy + 27);
    ctx.lineTo(ox + 8, oy + 32);
    ctx.bezierCurveTo(ox + 20, oy + 36, ox + 32, oy + 40, ox + 42, oy + 42);
    ctx.closePath();
    ctx.fill();

    // Soft wing feather lines
    ctx.strokeStyle = FEATHER_SHADOW;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ox + 40, oy + 38);
    ctx.lineTo(ox + 22, oy + 33);
    ctx.stroke();

    // Black primary feather edges along the trailing wing edge
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 27);
    ctx.lineTo(ox + 6, oy + 33);
    ctx.lineTo(ox + 16, oy + 37);
    ctx.lineTo(ox + 28, oy + 38);
    ctx.lineTo(ox + 24, oy + 33);
    ctx.closePath();
    ctx.fill();

    // Trailing feather points
    ctx.fillStyle = DEEP_BLACK;
    ctx.beginPath();
    ctx.moveTo(ox + 6, oy + 33);
    ctx.lineTo(ox + 2, oy + 35);
    ctx.lineTo(ox + 10, oy + 36);
    ctx.closePath();
    ctx.fill();
  } else if (frame === 2) {
    // Frame 2: Down-stroke - wings swept downwards with power
    ctx.fillStyle = WING_HIGHLIGHT;
    ctx.beginPath();
    ctx.moveTo(ox + 46, oy + 39);
    ctx.bezierCurveTo(ox + 42, oy + 48, ox + 36, oy + 58, ox + 28, oy + 68);
    ctx.lineTo(ox + 22, oy + 63);
    ctx.bezierCurveTo(ox + 30, oy + 52, ox + 36, oy + 44, ox + 42, oy + 41);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = FEATHER_SHADOW;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Black wingtips swept back & down
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 28, oy + 68);
    ctx.lineTo(ox + 22, oy + 63);
    ctx.lineTo(ox + 28, oy + 54);
    ctx.lineTo(ox + 33, oy + 60);
    ctx.closePath();
    ctx.fill();

    // Trailing feather tips
    ctx.fillStyle = DEEP_BLACK;
    ctx.beginPath();
    ctx.moveTo(ox + 28, oy + 68);
    ctx.lineTo(ox + 24, oy + 73);
    ctx.lineTo(ox + 22, oy + 65);
    ctx.closePath();
    ctx.fill();
  } else {
    // Frame 3: Recovery glide - wings leveling out, streamlined glide
    ctx.fillStyle = WING_HIGHLIGHT;
    ctx.beginPath();
    ctx.moveTo(ox + 46, oy + 39);
    ctx.bezierCurveTo(ox + 36, oy + 37, ox + 24, oy + 39, ox + 12, oy + 44);
    ctx.lineTo(ox + 16, oy + 49);
    ctx.bezierCurveTo(ox + 26, oy + 46, ox + 36, oy + 43, ox + 42, oy + 41);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = FEATHER_SHADOW;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ox + 40, oy + 40);
    ctx.lineTo(ox + 24, oy + 42);
    ctx.stroke();

    // Black wingtip trailing
    ctx.fillStyle = BLACK_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 44);
    ctx.lineTo(ox + 8, oy + 47);
    ctx.lineTo(ox + 18, oy + 50);
    ctx.lineTo(ox + 24, oy + 46);
    ctx.closePath();
    ctx.fill();

    // Tip feather
    ctx.fillStyle = DEEP_BLACK;
    ctx.beginPath();
    ctx.moveTo(ox + 8, oy + 47);
    ctx.lineTo(ox + 4, oy + 49);
    ctx.lineTo(ox + 14, oy + 49);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * CraneManager manages the fixed pool of Celestial Cranes in the sky corridor.
 * Guarantees zero memory allocations during update().
 */
export class CraneManager {
  public static readonly POOL_SIZE = 8;
  public static readonly SKY_Y_MIN = 180;
  public static readonly SKY_Y_MAX = 460;
  public static readonly CRANE_DEPTH = 1.2;

  private scene?: Phaser.Scene;
  private pool: CraneItem[] = [];
  private ambientTimer = 0;
  private nextAmbientDelay = 25000;
  private reducedMotion = false;

  /**
   * Pre-warms the fixed pool of 8 Crane sprites.
   */
  public create(scene: Phaser.Scene): void {
    this.scene = scene;
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    generateCraneTextures(scene);

    // Clean up any existing pool sprites
    this.destroy();
    this.scene = scene;

    this.pool = [];
    for (let i = 0; i < CraneManager.POOL_SIZE; i++) {
      const sprite = scene.add
        .sprite(0, 0, "crane-flap", 0)
        .setDepth(CraneManager.CRANE_DEPTH)
        .setVisible(false)
        .setActive(false);

      this.pool.push({
        sprite,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        baseY: 0,
        phase: 0,
        flapTimer: 0,
        flapDuration: 2000,
        glideDuration: 3500,
        isGliding: false,
        scale: 1,
      });
    }

    // Schedule initial ambient appearance
    this.ambientTimer = 0;
    this.nextAmbientDelay = 12000 + Math.random() * 15000;
  }

  /**
   * Spawns a single crane from the fixed pool if available.
   * Returns true if successfully spawned, false if pool is full.
   */
  public spawnCrane(
    x: number,
    y: number,
    vx: number,
    vy: number,
    scale = 0.85,
    phase = 0,
  ): CraneItem | null {
    for (let i = 0; i < CraneManager.POOL_SIZE; i++) {
      const crane = this.pool[i];
      if (!crane.active) {
        crane.active = true;
        crane.x = x;
        crane.y = y;
        crane.baseY = y;
        crane.vx = vx;
        crane.vy = vy;
        crane.scale = scale;
        crane.phase = phase;
        crane.flapTimer = 0;
        crane.flapDuration = 1800 + Math.random() * 600; // ~2s flap
        crane.glideDuration = 3000 + Math.random() * 1500; // 3 - 4.5s glide
        crane.isGliding = false;

        crane.sprite
          .setPosition(x, y)
          .setScale(scale)
          .setAlpha(0.92)
          .setVisible(true)
          .setActive(true)
          .setFlipX(vx < 0);

        if (this.scene?.anims.exists("crane-fly")) {
          crane.sprite.play("crane-fly");
        }

        return crane;
      }
    }
    return null;
  }

  /**
   * Spawns a flock in V-formation across the sky corridor.
   * Leader at (x, y) with followers staggered behind in a majestic V-wedge.
   */
  public triggerFlock(count = 5, startX = -80, startY?: number): void {
    const leaderY =
      startY !== undefined
        ? startY
        : CraneManager.SKY_Y_MIN +
          60 +
          Math.random() *
            (CraneManager.SKY_Y_MAX - CraneManager.SKY_Y_MIN - 120);
    const leaderX = startX;
    const vx = 48 + Math.random() * 8; // flock flies in coordinated rhythm
    const vy = (Math.random() - 0.5) * 3;

    // Leader
    this.spawnCrane(leaderX, leaderY, vx, vy, 0.9, 0);

    // Followers in alternating V-wing formation
    const totalToSpawn = Math.min(count, CraneManager.POOL_SIZE);
    for (let i = 1; i < totalToSpawn; i++) {
      const rank = Math.floor((i + 1) / 2);
      const side = i % 2 === 1 ? -1 : 1;
      const followerX = leaderX - rank * 72;
      const followerY = leaderY + side * rank * 36;
      const scale = 0.88 - rank * 0.025;
      const phaseOffset = i * 0.75; // subtle out-of-sync wing phase

      const spawned = this.spawnCrane(
        followerX,
        followerY,
        vx,
        vy,
        Math.max(scale, 0.72),
        phaseOffset,
      );
      if (!spawned) {
        break;
      }
    }
  }

  /**
   * Updates all active cranes without ANY heap allocations in the per-frame loop.
   */
  public update(time: number, delta: number, capture = false): void {
    // Ambient scheduler: spawns 1 solitary crane or a pair gliding across the sky
    if (!capture) {
      this.ambientTimer += delta;
      if (this.ambientTimer >= this.nextAmbientDelay) {
        this.ambientTimer = 0;
        this.nextAmbientDelay = 25000 + Math.random() * 15000; // 25-40 seconds
        this.spawnAmbient();
      }
    }

    const dt = delta * 0.001;

    for (let i = 0; i < CraneManager.POOL_SIZE; i++) {
      const crane = this.pool[i];
      if (!crane.active) {
        continue;
      }

      // Update horizontal & base vertical positions
      crane.x += crane.vx * dt;
      crane.baseY += crane.vy * dt;

      // Gliding vs Flapping cycle
      crane.flapTimer += delta;

      if (!crane.isGliding) {
        if (crane.flapTimer >= crane.flapDuration) {
          crane.isGliding = true;
          crane.flapTimer = 0;
          crane.sprite.anims.stop();
          crane.sprite.setFrame(1); // Majestic spread glide pose
        }
      } else {
        if (crane.flapTimer >= crane.glideDuration) {
          crane.isGliding = false;
          crane.flapTimer = 0;
          if (this.scene?.anims.exists("crane-fly")) {
            crane.sprite.play("crane-fly");
          }
        }
      }

      // Gentle sinusoidal bob during glide
      if (capture || this.reducedMotion) {
        crane.y = crane.baseY;
      } else {
        crane.y = crane.baseY + Math.sin(time * 0.002 + crane.phase) * 12;
      }

      crane.sprite.setPosition(crane.x, crane.y);

      // Deactivate when off-screen
      if (crane.x > 1180 || crane.x < -120) {
        this.deactivateCrane(crane);
      }
    }
  }

  /**
   * Deactivates a crane and hides its sprite back into the pool.
   */
  public deactivateCrane(crane: CraneItem): void {
    crane.active = false;
    crane.sprite.setVisible(false);
    crane.sprite.setActive(false);
    crane.sprite.anims.stop();
  }

  /**
   * Ambient spawner: Solitary crane (70%) or pair (30%).
   */
  private spawnAmbient(): void {
    const isPair = Math.random() < 0.3;
    const startX = -80;
    const baseY =
      CraneManager.SKY_Y_MIN +
      20 +
      Math.random() * (CraneManager.SKY_Y_MAX - CraneManager.SKY_Y_MIN - 40);
    const vx = 38 + Math.random() * 16; // 38-54 px/s (takes ~25-30s to traverse screen)
    const vy = (Math.random() - 0.5) * 5; // slight diagonal drift
    const scale = 0.78 + Math.random() * 0.18;

    this.spawnCrane(startX, baseY, vx, vy, scale, Math.random() * Math.PI * 2);

    if (isPair) {
      const companionX = startX - 70 - Math.random() * 20;
      const companionY = baseY + (Math.random() < 0.5 ? 32 : -32);
      this.spawnCrane(
        companionX,
        companionY,
        vx,
        vy,
        scale * 0.95,
        Math.random() * Math.PI * 2,
      );
    }
  }

  /**
   * Count of currently active cranes.
   */
  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < CraneManager.POOL_SIZE; i++) {
      if (this.pool[i].active) {
        count++;
      }
    }
    return count;
  }

  /**
   * Access the pool for inspection or tests.
   */
  public getPool(): readonly CraneItem[] {
    return this.pool;
  }

  /**
   * Cleans up sprites and resets pool.
   */
  public destroy(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const crane = this.pool[i];
      if (crane.sprite) {
        crane.sprite.destroy();
      }
    }
    this.pool = [];
    this.scene = undefined;
  }
}
