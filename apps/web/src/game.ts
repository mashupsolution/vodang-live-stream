import Phaser from "phaser";
import {
  DONOR_TIERS,
  getRealm,
  type Ceremony,
  type Visitor,
} from "../../../packages/shared/src/index.ts";
import type { TempleClient } from "./api";
import { discipleSeat } from "./discipleLayout";
import { CraneManager, generateCraneTextures } from "./cranes";
import { SwordFormationManager, generateSwordTextures } from "./swords";

export interface DiscipleStats {
  id: string;
  name: string;
  text: string;
  phase: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelWidth: number;
  labelHeight: number;
  bodyTop: number;
  bodyBottom: number;
  frame: number;
}

export interface GameStats {
  disciples: DiscipleStats[];
  lastTarget?: { userId: string; action: string; x: number; y: number };
  ready: boolean;
  fps: number;
  visibleVisitors: number;
  effects: number;
  peakEffects: number;
  frames: number;
  frameTimes: number[];
  renderer: string;
  gpu: string;
  updateMs: number;
}

declare global {
  interface Window {
    __TEMPLE_STATS__?: GameStats;
  }
}

interface VisitorArt {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  enteredAt: number;
  seat: ReturnType<typeof discipleSeat>;
  name: string;
  telemetry: DiscipleStats;
}

type ParticleKind =
  "qi-orb" | "petal" | "sword-ray" | "lightning-seg" | "spark";

interface Particle {
  image: Phaser.GameObjects.Image;
  start: number;
  duration: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: ParticleKind;
  size: number;
  rotSpeed: number;
  targetScaleX: number;
  targetScaleY: number;
}

export function mountGame(parent: HTMLElement, client: TempleClient) {
  const capture = new URLSearchParams(location.search).has("capture");
  const stats: GameStats = {
    disciples: [],
    ready: false,
    fps: 0,
    visibleVisitors: 0,
    effects: 0,
    peakEffects: 0,
    frames: 0,
    frameTimes: [],
    renderer: "",
    gpu: "",
    updateMs: 0,
  };
  window.__TEMPLE_STATS__ = stats;

  class LinhSonScene extends Phaser.Scene {
    private visitors = new Map<string, VisitorArt>();
    private particles: Particle[] = [];
    private seen = new Set<string>();
    private cameraMode = "";
    private lastStats = 0;
    private lastRawFrame = 0;
    private unsubscribe?: () => void;
    private qiLight!: Phaser.GameObjects.Image;
    private goldLight!: Phaser.GameObjects.Image;
    private cauldron!: Phaser.GameObjects.Image;
    private lanterns: Phaser.GameObjects.Image[] = [];
    private ready = false;
    private hasSnapshot = false;
    private sessionId = "";
    private serverOffset = 0;
    private reconcile = false;
    private communalChannelUntil = 0;
    private audienceStartedAt = 0;
    private audienceEndsAt = 0;
    private audienceLift = 0;
    private reducedMotion = false;
    private activeHallKey = "hall";
    private activeCauldronKey = "cauldron";
    private activeCultivatorKey = "cultivator";
    private craneManager!: CraneManager;
    private swordFormation!: SwordFormationManager;

    constructor() {
      super("linh-son");
    }

    preload() {
      // Primary Tu Tiên Online assets
      this.load.image("hall", "/assets/linh-son-hall.webp");
      this.load.image("cauldron", "/assets/tu-linh-dinh.webp");
      this.load.spritesheet("cultivator", "/assets/cultivators.png", {
        frameWidth: 512,
        frameHeight: 512,
      });

      // Safe fallbacks to keep runtime rock-solid in all pipeline phases
      this.load.image("hall-fallback", "/assets/temple-hall.webp");
      this.load.image("cauldron-fallback", "/assets/altar.webp");
      this.load.spritesheet("cultivator-fallback", "/assets/visitors.png", {
        frameWidth: 512,
        frameHeight: 512,
      });

      this.load.on("loaderror", () => {
        // Fallback texture will be selected smoothly in create()
      });
    }

    create() {
      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Select active texture keys
      this.activeHallKey = this.textures.exists("hall")
        ? "hall"
        : "hall-fallback";
      this.activeCauldronKey = this.textures.exists("cauldron")
        ? "cauldron"
        : "cauldron-fallback";
      this.activeCultivatorKey = this.textures.exists("cultivator")
        ? "cultivator"
        : "cultivator-fallback";

      // Background hall
      this.add
        .image(540, 960, this.activeHallKey)
        .setDisplaySize(1080, 1920)
        .setDepth(0);

      // Procedural textures
      this.generateProceduralTextures();

      // Central qi light & warm gold light
      this.qiLight = this.add
        .image(540, 760, "aura")
        .setDisplaySize(820, 920)
        .setDepth(1)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.goldLight = this.add
        .image(540, 680, "gold-aura")
        .setDisplaySize(560, 640)
        .setDepth(1.5)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Sword formation & Bagua Dais
      this.swordFormation = new SwordFormationManager();
      this.swordFormation.create(this);

      // Celestial Cranes in sky corridor
      this.craneManager = new CraneManager();
      this.craneManager.create(this);

      // Floating cauldron & pedestal
      this.cauldron = this.add
        .image(540, 1065, this.activeCauldronKey)
        .setOrigin(0.5, 1)
        .setDisplaySize(590, 585)
        .setDepth(2);

      // Twin spirit-pillar lantern glows
      for (const x of [135, 945]) {
        this.lanterns.push(
          this.add
            .image(x, 850, "aura")
            .setDisplaySize(240, 320)
            .setAlpha(0.35)
            .setDepth(3)
            .setBlendMode(Phaser.BlendModes.ADD),
        );
      }

      // Pre-warm strictly pooled 180 particles (zero allocations per frame)
      for (let i = 0; i < 180; i++) {
        this.particles.push({
          image: this.add
            .image(0, 0, "qi-orb")
            .setVisible(false)
            .setDepth(2500),
          start: 0,
          duration: 0,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          kind: "qi-orb",
          size: 1,
          rotSpeed: 0,
          targetScaleX: 1,
          targetScaleY: 1,
        });
      }

      this.unsubscribe = client.subscribe(() => this.sync());
      this.events.once("shutdown", () => {
        this.unsubscribe?.();
        this.craneManager?.destroy();
        this.swordFormation?.destroy();
      });
      this.events.once("destroy", () => {
        this.craneManager?.destroy();
        this.swordFormation?.destroy();
      });

      this.ready = true;
      stats.ready = true;
      stats.renderer =
        this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas";
      const gl = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
      const debug = gl?.getExtension("WEBGL_debug_renderer_info");
      stats.gpu = debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : stats.renderer;

      parent.dataset.ready = "true";
      this.sync();
    }

    private generateProceduralTextures() {
      generateCraneTextures(this);
      generateSwordTextures(this);

      // 1. "aura": 256×256 radial cyan-jade spirit aura
      if (!this.textures.exists("aura")) {
        const cAura = document.createElement("canvas");
        cAura.width = 256;
        cAura.height = 256;
        const ctxAura = cAura.getContext("2d")!;
        const gAura = ctxAura.createRadialGradient(128, 128, 0, 128, 128, 128);
        gAura.addColorStop(0, "rgba(110, 231, 183, 0.50)");
        gAura.addColorStop(0.45, "rgba(56, 189, 248, 0.20)");
        gAura.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctxAura.fillStyle = gAura;
        ctxAura.fillRect(0, 0, 256, 256);
        this.textures.addCanvas("aura", cAura);
      }

      // 2. "gold-aura": 256×256 warm golden elixir radial gradient
      if (!this.textures.exists("gold-aura")) {
        const cGold = document.createElement("canvas");
        cGold.width = 256;
        cGold.height = 256;
        const ctxGold = cGold.getContext("2d")!;
        const gGold = ctxGold.createRadialGradient(128, 128, 0, 128, 128, 128);
        gGold.addColorStop(0, "rgba(254, 240, 138, 0.55)");
        gGold.addColorStop(0.35, "rgba(245, 158, 11, 0.18)");
        gGold.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctxGold.fillStyle = gGold;
        ctxGold.fillRect(0, 0, 256, 256);
        this.textures.addCanvas("gold-aura", cGold);
      }

      // 3. "qi-orb": 20×20 glowing cyan-jade spirit orb circle with bright core
      if (!this.textures.exists("qi-orb")) {
        const g = this.add.graphics();
        g.fillStyle(0x38bdf8, 0.35);
        g.fillCircle(10, 10, 9);
        g.fillStyle(0x6ee7b7, 0.75);
        g.fillCircle(10, 10, 6);
        g.fillStyle(0xffffff, 1.0);
        g.fillCircle(10, 10, 3);
        g.generateTexture("qi-orb", 20, 20);
        g.destroy();
      }

      // 4. "petal": 24×32 jade-gold immortal lotus petal (0xa7f3d0 outer, 0xfef08a inner core)
      if (!this.textures.exists("petal")) {
        const g = this.add.graphics();
        g.fillStyle(0xa7f3d0, 0.9);
        g.fillEllipse(12, 16, 18, 30);
        g.fillStyle(0xfef08a, 0.95);
        g.fillEllipse(12, 14, 8, 18);
        g.generateTexture("petal", 24, 32);
        g.destroy();
      }

      // 5. "sword-ray": 16×96 vertical luminous flying-sword blade/ray (0xe0f2fe core, 0x38bdf8 edge)
      if (!this.textures.exists("sword-ray")) {
        const g = this.add.graphics();
        // outer glow
        g.fillStyle(0x38bdf8, 0.5);
        g.beginPath();
        g.moveTo(8, 0);
        g.lineTo(16, 24);
        g.lineTo(13, 96);
        g.lineTo(3, 96);
        g.lineTo(0, 24);
        g.closePath();
        g.fillPath();
        // inner brilliant blade
        g.fillStyle(0xe0f2fe, 0.95);
        g.beginPath();
        g.moveTo(8, 4);
        g.lineTo(12, 26);
        g.lineTo(10, 92);
        g.lineTo(6, 92);
        g.lineTo(4, 26);
        g.closePath();
        g.fillPath();
        g.generateTexture("sword-ray", 16, 96);
        g.destroy();
      }

      // 6. "lightning-seg": 48×220 jagged procedural multi-segment lightning bolt
      if (!this.textures.exists("lightning-seg")) {
        const cLight = document.createElement("canvas");
        cLight.width = 48;
        cLight.height = 220;
        const ctxLight = cLight.getContext("2d")!;
        ctxLight.shadowColor = "#38bdf8";
        ctxLight.shadowBlur = 12;
        ctxLight.strokeStyle = "#e879f9";
        ctxLight.lineWidth = 6;
        ctxLight.beginPath();
        ctxLight.moveTo(24, 0);
        ctxLight.lineTo(36, 45);
        ctxLight.lineTo(16, 85);
        ctxLight.lineTo(38, 140);
        ctxLight.lineTo(18, 180);
        ctxLight.lineTo(26, 220);
        ctxLight.stroke();

        ctxLight.strokeStyle = "#fef08a";
        ctxLight.lineWidth = 2.5;
        ctxLight.beginPath();
        ctxLight.moveTo(24, 0);
        ctxLight.lineTo(36, 45);
        ctxLight.lineTo(16, 85);
        ctxLight.lineTo(38, 140);
        ctxLight.lineTo(18, 180);
        ctxLight.lineTo(26, 220);
        ctxLight.stroke();
        this.textures.addCanvas("lightning-seg", cLight);
      }
    }

    private sync() {
      if (!client.connected) {
        this.reconcile = true;
        return;
      }
      if (!this.ready || !client.state) return;
      const state = client.state;
      this.serverOffset = state.serverTime - Date.now();
      const bootstrap =
        !this.hasSnapshot ||
        state.session.id !== this.sessionId ||
        this.reconcile;
      this.reconcile = false;
      const ids = new Set(state.visitors.map((v) => v.id));

      for (const [id, art] of this.visitors) {
        if (!ids.has(id)) {
          art.sprite.destroy();
          art.shadow.destroy();
          art.aura.destroy();
          art.label.destroy();
          this.visitors.delete(id);
        }
      }

      for (const v of state.visitors) {
        if (!this.visitors.has(v.id)) {
          const shadowColor =
            v.realmIndex >= 3
              ? Phaser.Display.Color.HexStringToColor(
                  getRealm(v.realmIndex).color,
                ).color
              : 0x0c2426;

          const seat = discipleSeat(v.slot);
          const telemetry: DiscipleStats = {
            id: v.id,
            name: v.name,
            text: "",
            phase: "idle",
            x: seat.x,
            y: seat.y,
            labelX: 0,
            labelY: 0,
            labelWidth: 0,
            labelHeight: 0,
            bodyTop: 0,
            bodyBottom: 0,
            frame: 1,
          };
          this.visitors.set(v.id, {
            enteredAt:
              bootstrap || capture || this.reducedMotion
                ? -Infinity
                : this.time.now,
            seat,
            name: "",
            telemetry,
            sprite: this.add
              .image(0, 0, this.activeCultivatorKey, (v.variant % 2) * 4 + 1)
              .setOrigin(0.5, 490 / 512),
            shadow: this.add.ellipse(
              0,
              0,
              72,
              20,
              shadowColor,
              v.realmIndex >= 3 ? 0.45 : 0.35,
            ),
            aura: this.add
              .image(0, 0, "gold-aura")
              .setBlendMode(Phaser.BlendModes.ADD)
              .setVisible(false),
            label: this.add
              .text(0, 0, "", {
                fontFamily: '"Be Vietnam Pro"',
                fontSize: "20px",
                color: "#ecfdf5",
                backgroundColor: "#0c2426e8",
                padding: { left: 6, right: 6, top: 2, bottom: 2 },
              })
              .setOrigin(0.5, 0),
          });
        }
        const art = this.visitors.get(v.id)!;
        if (bootstrap) art.enteredAt = -Infinity;
        art.seat = discipleSeat(v.slot);
        if (
          art.name !== v.name ||
          art.telemetry.labelWidth > art.seat.labelWidth
        ) {
          art.name = v.name;
          const chars = Array.from(v.name);
          art.label.setText(v.name);
          while (art.label.width > art.seat.labelWidth && chars.length > 1) {
            chars.pop();
            art.label.setText(chars.join("").trimEnd() + "…");
          }
        }
        art.shadow.setFillStyle(
          v.realmIndex >= 3
            ? Phaser.Display.Color.HexStringToColor(
                getRealm(v.realmIndex).color,
              ).color
            : 0x0c2426,
        );
        art.telemetry.name = v.name;
        art.telemetry.text = art.label.text;
      }
      stats.disciples = Array.from(
        this.visitors.values(),
        (art) => art.telemetry,
      );

      if (
        !this.hasSnapshot ||
        state.session.id !== this.sessionId ||
        bootstrap
      ) {
        this.hasSnapshot = true;
        this.sessionId = state.session.id;
        this.seen = new Set(state.ceremonies.map((c) => c.id));
      } else {
        for (const c of state.ceremonies) {
          if (!this.seen.has(c.id)) {
            this.seen.add(c.id);
            if (!capture && Math.abs(state.serverTime - c.at) < 2500) {
              if (
                c.action === "audience-milestone" ||
                c.action === "tribulation-success"
              ) {
                this.celebrateCommunal(c.count, c.intensity);
              }
              this.burst(c, state.visitors);
            }
          }
        }
      }

      if (this.seen.size > 256) {
        this.seen = new Set(state.ceremonies.map((c) => c.id));
      }
    }

    private burst(c: Ceremony, visitors: Visitor[]) {
      const action = c.action;
      const intensity = c.intensity || 1;
      const count = c.count || 0;

      // Locate target visitor coordinates for targeted lightning strikes
      let targetX = 540;
      let targetY = 820;
      if (c.userId) {
        const v = visitors.find((item) => item.id === c.userId);
        if (v) {
          const seat = discipleSeat(v.slot);
          const art = this.visitors.get(v.id);
          targetX = art?.sprite.x || seat.x;
          targetY = art?.sprite.y || seat.y;
          stats.lastTarget = {
            userId: c.userId,
            action,
            x: targetX,
            y: targetY,
          };
        }
      }

      if (action === "donor-tier") {
        this.celebrateDonorTier(targetX, targetY, intensity);
        return;
      }
      if (action === "tribulation-success") {
        this.swordFormation?.triggerTribulation();
        this.spawnLightningStrike(targetX, targetY, true, intensity);
        return;
      }
      if (action === "tribulation-fail") {
        this.swordFormation?.triggerTribulation();
        this.spawnLightningStrike(targetX, targetY, false, intensity);
        return;
      }

      if (action === "sword") {
        this.swordFormation?.triggerBurst(intensity);
      } else if (action === "audience-milestone" || action === "milestone") {
        this.craneManager?.triggerFlock(5);
      }

      const amount =
        action === "audience-milestone"
          ? Math.min(
              120,
              (count >= 1000 ? 90 : 24 + intensity * 16) *
                (this.reducedMotion ? 0.3 : 1),
            )
          : action === "milestone"
            ? 90
            : action === "sword"
              ? 24 * intensity
              : action === "like"
                ? 8
                : action === "share"
                  ? 16
                  : 20 * intensity;

      let spawned = 0;
      for (const p of this.particles) {
        if (p.duration > 0) continue;
        const i = spawned++;
        const angle = i * 2.399963 + this.time.now * 0.0001;

        p.start = this.time.now;
        if (action === "sword") {
          p.kind = "sword-ray";
          p.duration = 1800 + (i % 4) * 250;
          p.x = targetX + Math.sin(angle) * 65;
          p.y = targetY - 35 + (i % 6) * 8;
          p.vx = Math.sin(angle) * 40;
          p.vy = -(280 + (i % 5) * 40);
          p.size = 28;
          p.rotSpeed = 0;
          p.image
            .setTexture("sword-ray")
            .setVisible(true)
            .setTint(0xffffff)
            .setAlpha(0.9)
            .setBlendMode(Phaser.BlendModes.ADD);
        } else if (
          action === "elixir" ||
          action === "vow" ||
          action === "milestone" ||
          action === "audience-milestone"
        ) {
          p.kind = i % 2 === 0 ? "petal" : "qi-orb";
          p.duration = 3200 + (i % 5) * 350;
          p.x = targetX + Math.sin(angle) * 80;
          p.y = targetY - 40 + (i % 4) * 12;
          p.vx = Math.sin(angle) * 55;
          p.vy = -(75 + (i % 7) * 20);
          p.size = p.kind === "petal" ? 22 : 16;
          p.rotSpeed = p.kind === "petal" ? 2.5 : 0;
          p.image
            .setTexture(p.kind === "petal" ? "petal" : "qi-orb")
            .setVisible(true)
            .setTint(0xffffff)
            .setAlpha(0.85)
            .setBlendMode(Phaser.BlendModes.ADD);
        } else {
          // "meditate", "like", "follow", "share"
          p.kind = "qi-orb";
          p.duration = 2600 + (i % 4) * 300;
          p.x = targetX + Math.sin(angle) * 90;
          p.y = targetY - 40 + (i % 3) * 20;
          p.vx = Math.sin(angle) * 35;
          p.vy = -(60 + (i % 5) * 18);
          p.size = 14;
          p.rotSpeed = 0;
          p.image
            .setTexture("qi-orb")
            .setVisible(true)
            .setTint(0xffffff)
            .setAlpha(0.8)
            .setBlendMode(Phaser.BlendModes.ADD);
        }

        if (spawned >= amount) break;
      }
    }

    // Tier-up: golden light pillar, expanding ring, rising petals and a crane flock.
    private celebrateDonorTier(x: number, y: number, tierIndex: number) {
      const tier = DONOR_TIERS[Math.min(tierIndex, DONOR_TIERS.length - 1)]!;
      const color = Phaser.Display.Color.HexStringToColor(tier.color).color;
      this.swordFormation?.triggerBurst(Math.min(3, Math.max(1, tierIndex - 1)));
      this.craneManager?.triggerFlock(2 + tierIndex);
      if (this.reducedMotion) return;

      const pillar = this.add
        .image(x, y - 20, "gold-aura")
        .setOrigin(0.5, 1)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(90 + tierIndex * 20, 40)
        .setAlpha(0)
        .setDepth(2500);
      this.tweens.add({
        targets: pillar,
        displayHeight: 520 + tierIndex * 110,
        alpha: { from: 0.95, to: 0 },
        duration: 1900,
        ease: "Cubic.easeOut",
        onComplete: () => pillar.destroy(),
      });

      for (let ring = 0; ring < Math.min(3, tierIndex); ring++) {
        const wave = this.add
          .image(x, y - 40, "gold-aura")
          .setTint(color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDisplaySize(60, 60)
          .setAlpha(0.9)
          .setDepth(2490);
        this.tweens.add({
          targets: wave,
          displayWidth: 460 + tierIndex * 60,
          displayHeight: 460 + tierIndex * 60,
          alpha: 0,
          delay: ring * 280,
          duration: 1500,
          ease: "Sine.easeOut",
          onComplete: () => wave.destroy(),
        });
      }

      let spawned = 0;
      const amount = 28 + tierIndex * 14;
      for (const p of this.particles) {
        if (p.duration > 0) continue;
        const i = spawned++;
        const angle = i * 2.399963;
        p.start = this.time.now + (i % 6) * 60;
        p.kind = i % 2 === 0 ? "petal" : "qi-orb";
        p.duration = 3200 + (i % 5) * 350;
        p.x = x + Math.sin(angle) * 70;
        p.y = y - 40 + (i % 4) * 10;
        p.vx = Math.sin(angle) * 70;
        p.vy = -(110 + (i % 7) * 28);
        p.size = p.kind === "petal" ? 24 : 18;
        p.rotSpeed = p.kind === "petal" ? 2.5 : 0;
        p.image
          .setTexture(p.kind === "petal" ? "petal" : "qi-orb")
          .setVisible(false)
          .setTint(color)
          .setAlpha(0.9)
          .setBlendMode(Phaser.BlendModes.ADD);
        if (spawned >= amount) break;
      }
    }

    private spawnLightningStrike(
      targetX: number,
      targetY: number,
      success: boolean,
      intensity: number,
    ) {
      const bolts = success ? 4 : 2;
      let spawned = 0;

      for (const p of this.particles) {
        if (p.duration > 0) continue;
        const i = spawned++;
        p.start = this.time.now + i * 90; // Staggered lightning
        p.duration = 450;
        p.kind = "lightning-seg";
        p.x = targetX + (i % 2 === 0 ? -12 : 12);
        p.y = targetY - 110;
        p.vx = 0;
        p.vy = 40;
        p.size = 40;
        p.rotSpeed = 0;
        p.image
          .setTexture("lightning-seg")
          .setVisible(false) // becomes visible at p.start
          .setTint(success ? 0xffffff : 0xd8b4fe)
          .setAlpha(1)
          .setBlendMode(Phaser.BlendModes.ADD);

        if (spawned >= bolts) break;
      }

      // Add ascending elixir petals / qi sparks around target if successful
      if (success) {
        let petCount = 0;
        const maxPetals = 16 * intensity;
        for (const p of this.particles) {
          if (p.duration > 0) continue;
          const i = petCount++;
          const angle = i * 2.4;
          p.start = this.time.now + 200;
          p.duration = 2800;
          p.kind = "petal";
          p.x = targetX + Math.sin(angle) * 45;
          p.y = targetY - 30;
          p.vx = Math.sin(angle) * 50;
          p.vy = -(80 + (i % 4) * 15);
          p.size = 20;
          p.rotSpeed = 2;
          p.image
            .setTexture("petal")
            .setVisible(false)
            .setTint(0xfff08a)
            .setAlpha(0.9)
            .setBlendMode(Phaser.BlendModes.ADD);
          if (petCount >= maxPetals) break;
        }
      }
    }

    private celebrateCommunal(count: number, intensity: number) {
      const now = this.time.now;
      this.communalChannelUntil = Date.now() + 4200;
      if (this.reducedMotion) return;
      this.audienceStartedAt = now;
      this.audienceEndsAt = now + 6500;
      this.audienceLift = count >= 1000 ? 0.24 : intensity >= 2 ? 0.14 : 0.07;
    }

    private pose(v: Visitor, now: number): number {
      const age = now - v.actionAt;
      if (v.action && age >= 0 && age < 4200) {
        if (v.action === "tribulation" || v.action === "sword") return 2;
        if (v.action === "elixir" || v.action === "vow") return 3;
        return 2;
      }
      return now < this.communalChannelUntil ? 2 : 1;
    }

    update(time: number, delta: number) {
      if (!this.ready) return;
      const updateStart = performance.now();
      const state = client.state;
      const visualTime = capture ? 5000 : time;
      const now = capture
        ? (state?.serverTime ?? Date.now()) + 6000
        : Date.now() + this.serverOffset;

      this.swordFormation?.update(visualTime, delta, capture);
      this.craneManager?.update(visualTime, delta, capture);

      if (state) {
        let mode: string = state.settings.camera;
        if (state.settings.autoCamera && !capture) {
          mode = Math.floor(now / 16000) % 2 ? "close" : "wide";
        }

        if (mode !== this.cameraMode) {
          this.cameraMode = mode;
          const targetZoom = mode === "close" ? 1.42 : 1;
          const targetY = mode === "close" ? 800 : 960;
          if (capture) {
            this.cameras.main.setZoom(targetZoom);
            this.cameras.main.centerOn(540, targetY);
          } else {
            this.cameras.main.zoomTo(targetZoom, 1200, "Sine.easeInOut");
            this.cameras.main.pan(540, targetY, 1200, "Sine.easeInOut");
          }
        }

        const audienceProgress =
          this.audienceEndsAt > time
            ? Math.min(
                1,
                (time - this.audienceStartedAt) / 800,
                (this.audienceEndsAt - time) / 1800,
              )
            : 0;
        const glow = Math.max(0, audienceProgress) * this.audienceLift;
        const lightPulse = this.reducedMotion
          ? 0
          : Math.sin(visualTime * 0.0008) * 0.05;
        const lanternPulse = this.reducedMotion ? 0 : 0.035;

        // Subtle cauldron levitation bob
        if (!this.reducedMotion && !capture) {
          this.cauldron.setY(1065 + Math.sin(visualTime * 0.0018) * 5);
        }

        this.qiLight.setAlpha(
          0.66 +
            Math.min(0.2, state.milestones.length * 0.04) +
            lightPulse +
            glow,
        );
        this.goldLight.setAlpha(
          0.52 +
            Math.min(0.2, state.milestones.length * 0.04) +
            lightPulse * 0.8 +
            glow * 0.8,
        );

        this.lanterns.forEach((l, i) =>
          l.setAlpha(
            0.24 +
              Math.min(0.3, state.milestones.length * 0.06) +
              (this.reducedMotion
                ? 0
                : Math.sin(visualTime * 0.002 + i) * lanternPulse) +
              glow * 0.6,
          ),
        );

        for (const v of state.visitors) {
          const art = this.visitors.get(v.id);
          if (!art) continue;

          const { x, y, size } = art.seat;
          const age =
            capture || this.reducedMotion ? Infinity : time - art.enteredAt;
          const arriving = age < 650;
          const settling = age >= 650 && age < 1100;
          const entry = Phaser.Math.Clamp(age / 650, 0, 1);
          const exit = Phaser.Math.Clamp((v.expiresAt - now) / 900, 0, 1);
          const ease = 1 - Math.pow(1 - entry, 3);
          const px = x + (1 - ease) * (x < 540 ? -32 : 32);
          const py = y + (1 - ease) * 42;
          const active =
            !!v.action && now - v.actionAt >= 0 && now - v.actionAt < 4200;
          const pose = arriving || exit < 1 ? 0 : this.pose(v, now);
          const frame = (v.variant % 2) * 4 + pose;
          const breathe =
            this.reducedMotion || capture
              ? 0
              : Math.sin(visualTime * 0.0015 + v.slot) * 0.7;
          const settle = settling
            ? Math.sin(((age - 650) / 450) * Math.PI) * 3
            : 0;
          const alpha = Math.min(entry, exit);

          art.sprite
            .setFrame(frame)
            .setPosition(px, py + breathe + settle)
            .setDisplaySize(size, size)
            .setAlpha(alpha)
            .setDepth(py);
          art.shadow
            .setPosition(px, py + 2)
            .setScale(size / 154)
            .setAlpha((active ? 0.65 : 0.3) * alpha)
            .setDepth(py - 1);
          const tierIndex = v.donorTier ?? 0;
          if (tierIndex > 0) {
            const tier = DONOR_TIERS[tierIndex]!;
            const pulse =
              this.reducedMotion || capture
                ? 1
                : 1 + Math.sin(visualTime * 0.003 + v.slot) * 0.08;
            art.aura
              .setVisible(true)
              .setTint(Phaser.Display.Color.HexStringToColor(tier.color).color)
              .setPosition(px, py - size * 0.2)
              .setDisplaySize(size * (0.9 + tierIndex * 0.18) * pulse, size * (0.9 + tierIndex * 0.18) * pulse)
              .setAlpha((0.28 + tierIndex * 0.08) * alpha)
              .setDepth(py - 2);
          } else if (art.aura.visible) art.aura.setVisible(false);
          art.label
            .setPosition(px, py + 3)
            .setAlpha(alpha)
            .setVisible(true)
            .setDepth(2600);
          const color = active
            ? "#fef08a"
            : tierIndex > 0
              ? DONOR_TIERS[tierIndex]!.color
              : "#ecfdf5";
          if (art.label.style.color !== color) art.label.setColor(color);
          const telemetry = art.telemetry;
          telemetry.phase = arriving
            ? "enter"
            : settling
              ? "settle"
              : exit < 1
                ? "leave"
                : active
                  ? "action"
                  : "idle";
          telemetry.x = px;
          telemetry.y = py;
          telemetry.frame = frame;
          telemetry.labelX = px - art.label.width / 2;
          telemetry.labelY = py + 3;
          telemetry.labelWidth = art.label.width;
          telemetry.labelHeight = art.label.height;
          // Opaque seated sprite extents from the approved atlas (not transparent frame margins).
          telemetry.bodyTop =
            art.sprite.y -
            (size * (490 - (pose === 0 ? 42 : pose === 3 ? 58 : 125))) / 512;
          telemetry.bodyBottom = art.sprite.y;
        }
      }

      // Update 180 pooled particle sprites
      let active = 0;
      for (const p of this.particles) {
        if (p.duration === 0) continue;
        const age = time - p.start;
        if (age < 0) {
          // Staggered future start
          p.image.setVisible(false);
          continue;
        }

        const t = age / p.duration;
        if (t >= 1) {
          p.duration = 0;
          p.image.setVisible(false);
          continue;
        }

        active++;
        p.image.setVisible(true);

        if (p.kind === "lightning-seg") {
          p.image
            .setPosition(p.x, p.y + (p.vy * age) / 1000)
            .setAlpha((1 - t) * 0.95)
            .setDisplaySize(48 * (1 + t * 0.3), 220);
        } else if (p.kind === "sword-ray") {
          p.image
            .setPosition(p.x + (p.vx * age) / 1000, p.y + (p.vy * age) / 1000)
            .setAlpha((1 - t) * 0.95)
            .setDisplaySize(16, 96 * (1 + t * 0.2));
        } else {
          p.image
            .setPosition(
              p.x + (p.vx * age) / 1000 + Math.sin(age * 0.002) * 16,
              p.y + (p.vy * age) / 1000,
            )
            .setAlpha((1 - t) * 0.85)
            .setDisplaySize(
              p.size * (1 + t * 0.6),
              p.size * (p.kind === "petal" ? 1.35 : 1) * (1 + t * 0.6),
            )
            .setRotation(p.rotSpeed ? t * p.rotSpeed : 0);
        }
      }

      stats.frames++;
      stats.effects = active;
      stats.peakEffects = Math.max(stats.peakEffects, active);
      stats.visibleVisitors = this.visitors.size;

      if (this.lastRawFrame) {
        stats.frameTimes.push(updateStart - this.lastRawFrame);
        if (stats.frameTimes.length > 7200) stats.frameTimes.splice(0, 120);
      }
      this.lastRawFrame = updateStart;
      stats.updateMs = performance.now() - updateStart;

      if (time - this.lastStats > 1000) {
        this.lastStats = time;
        const recent = stats.frameTimes.slice(-60);
        stats.fps = recent.length
          ? 1000 / (recent.reduce((a, b) => a + b, 0) / recent.length)
          : 0;
      }
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1080,
    height: 1920,
    backgroundColor: "#0d2224",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    scene: [LinhSonScene],
    audio: { noAudio: true },
  });
}
