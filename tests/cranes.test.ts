import { test } from "node:test";
import assert from "node:assert/strict";

// Setup browser globals before importing Phaser and cranes module
if (typeof (globalThis as any).window === "undefined") {
  const mockWindow = {
    navigator: { userAgent: "Node" },
    location: { href: "http://localhost/" },
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as any).window = mockWindow;
  (globalThis as any).document = {
    createElement(tag: string) {
      if (tag === "canvas") {
        return createMockCanvas(320, 80);
      }
      return {};
    },
  };
}

if (typeof (globalThis as any).Image === "undefined") {
  (globalThis as any).Image = class MockImageElement {};
}

function createMockCanvas(width: number, height: number) {
  const ctx = {
    shadowColor: "",
    shadowBlur: 0,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "round",
    lineJoin: "round",
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    save() {},
    restore() {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
  };

  return {
    width,
    height,
    getContext: () => ctx,
  };
}

class MockSprite {
  public x = 0;
  public y = 0;
  public scaleX = 1;
  public scaleY = 1;
  public alpha = 1;
  public depth = 0;
  public visible = true;
  public active = true;
  public flipX = false;
  public currentFrame: number | string = 0;
  public currentAnim = "";
  public isPlaying = false;
  public isDestroyed = false;

  public anims = {
    stop: () => {
      this.isPlaying = false;
    },
  };

  constructor(
    x: number,
    y: number,
    public textureKey: string,
    frame: number | string = 0,
  ) {
    this.x = x;
    this.y = y;
    this.currentFrame = frame;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  setScale(s: number) {
    this.scaleX = s;
    this.scaleY = s;
    return this;
  }

  setAlpha(a: number) {
    this.alpha = a;
    return this;
  }

  setDepth(d: number) {
    this.depth = d;
    return this;
  }

  setVisible(v: boolean) {
    this.visible = v;
    return this;
  }

  setActive(a: boolean) {
    this.active = a;
    return this;
  }

  setFlipX(f: boolean) {
    this.flipX = f;
    return this;
  }

  setFrame(f: number | string) {
    this.currentFrame = f;
    return this;
  }

  play(animKey: string) {
    this.currentAnim = animKey;
    this.isPlaying = true;
    return this;
  }

  destroy() {
    this.isDestroyed = true;
  }
}

function createMockScene(): any {
  const textures = new Map<string, any>();
  const anims = new Map<string, any>();
  const createdSprites: MockSprite[] = [];

  return {
    textures: {
      exists: (key: string) => textures.has(key),
      get: (key: string) => textures.get(key),
      addCanvas: (key: string, canvas: any) => {
        const frames = new Map<number | string, any>();
        const tex = {
          key,
          canvas,
          frames,
          has: (frame: number | string) => frames.has(frame),
          add: (
            name: number | string,
            sourceIndex: number,
            x: number,
            y: number,
            w: number,
            h: number,
          ) => {
            frames.set(name, { name, x, y, w, h });
          },
        };
        textures.set(key, tex);
        return tex;
      },
    },
    anims: {
      exists: (key: string) => anims.has(key),
      create: (config: any) => {
        anims.set(config.key, config);
        return config;
      },
      generateFrameNumbers: (
        key: string,
        config: { start: number; end: number },
      ) => {
        const out = [];
        for (let i = config.start; i <= config.end; i++) {
          out.push({ key, frame: i });
        }
        return out;
      },
    },
    add: {
      sprite: (x: number, y: number, key: string, frame = 0) => {
        const s = new MockSprite(x, y, key, frame);
        createdSprites.push(s);
        return s;
      },
    },
    _createdSprites: createdSprites,
    _anims: anims,
    _textures: textures,
  };
}

test("generateCraneTextures generates 4 frames and registers crane-fly animation", async () => {
  const { generateCraneTextures } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();

  assert.equal(scene.textures.exists("crane-flap"), false);
  assert.equal(scene.anims.exists("crane-fly"), false);

  generateCraneTextures(scene);

  assert.equal(scene.textures.exists("crane-flap"), true);
  assert.equal(scene.anims.exists("crane-fly"), true);

  const tex = scene._textures.get("crane-flap");
  assert.ok(tex);
  assert.equal(tex.has(0), true, "Frame 0 (Up-stroke) should exist");
  assert.equal(tex.has(1), true, "Frame 1 (Gliding spread) should exist");
  assert.equal(tex.has(2), true, "Frame 2 (Down-stroke) should exist");
  assert.equal(tex.has(3), true, "Frame 3 (Recovery glide) should exist");

  const anim = scene._anims.get("crane-fly");
  assert.ok(anim);
  assert.equal(anim.frameRate, 7);
  assert.equal(anim.repeat, -1);
  assert.equal(anim.frames.length, 4);
});

test("CraneManager pre-warms a fixed pool of 8 Crane sprites with depth 1.2", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();

  manager.create(scene);

  const pool = manager.getPool();
  assert.equal(pool.length, 8, "Must pre-warm exactly 8 cranes in fixed pool");

  for (let i = 0; i < 8; i++) {
    const crane = pool[i];
    assert.equal(crane.active, false);
    assert.equal(crane.sprite.visible, false);
    assert.equal(
      crane.sprite.depth,
      1.2,
      "Depth must be ~1.2 above background/mist",
    );
  }
});

test("spawnCrane sets active crane state correctly", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  const crane = manager.spawnCrane(-80, 260, 45, 2, 0.85, 0.5);
  assert.ok(crane);
  assert.equal(crane.active, true);
  assert.equal(crane.x, -80);
  assert.equal(crane.y, 260);
  assert.equal(crane.baseY, 260);
  assert.equal(crane.vx, 45);
  assert.equal(crane.vy, 2);
  assert.equal(crane.scale, 0.85);
  assert.equal(crane.phase, 0.5);
  assert.equal(crane.isGliding, false);
  assert.equal(crane.sprite.visible, true);
  assert.equal(crane.sprite.flipX, false);

  assert.equal(manager.getActiveCount(), 1);
});

test("triggerFlock spawns V-formation across the sky corridor", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  manager.triggerFlock(5, -80, 300);

  assert.equal(manager.getActiveCount(), 5);
  const pool = manager.getPool();

  // Leader
  const leader = pool[0];
  assert.equal(leader.active, true);
  assert.equal(leader.x, -80);
  assert.equal(leader.baseY, 300);

  // Upper wing follower 1
  const f1 = pool[1];
  assert.equal(f1.active, true);
  assert.equal(f1.x, -80 - 72);
  assert.equal(f1.baseY, 300 - 36);

  // Lower wing follower 2
  const f2 = pool[2];
  assert.equal(f2.active, true);
  assert.equal(f2.x, -80 - 72);
  assert.equal(f2.baseY, 300 + 36);

  // Upper wing follower 3
  const f3 = pool[3];
  assert.equal(f3.active, true);
  assert.equal(f3.x, -80 - 144);
  assert.equal(f3.baseY, 300 - 72);

  // Lower wing follower 4
  const f4 = pool[4];
  assert.equal(f4.active, true);
  assert.equal(f4.x, -80 - 144);
  assert.equal(f4.baseY, 300 + 72);
});

test("update advances position, cycles flapping and gliding, and bobs gently", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  const crane = manager.spawnCrane(100, 250, 50, 0, 0.85, 0)!;
  crane.flapDuration = 2000;
  crane.glideDuration = 3000;

  // Step 1: Flapping for 1000ms
  manager.update(1000, 1000, false);
  assert.equal(crane.isGliding, false);
  assert.equal(crane.x, 150); // 100 + 50 * 1.0s

  // Step 2: Crosses flapDuration (advance by 1100ms -> total 2100ms)
  manager.update(2100, 1100, false);
  assert.equal(crane.isGliding, true, "Should transition to glide");
  assert.equal(
    (crane.sprite as unknown as MockSprite).currentFrame,
    1,
    "Should set frame 1 (gliding spread)",
  );

  // Check sinusoidal bobbing: y = baseY + Math.sin(time * 0.002 + phase) * 12
  const expectedBob = 250 + Math.sin(2100 * 0.002 + 0) * 12;
  assert.ok(Math.abs(crane.y - expectedBob) < 0.001);

  // Step 3: Glides for 3100ms -> transitions back to flapping
  manager.update(5200, 3100, false);
  assert.equal(crane.isGliding, false, "Should cycle back to flapping");
  assert.equal((crane.sprite as unknown as MockSprite).isPlaying, true);
});

test("capture mode and reduced motion disable bobbing deterministically", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  const crane = manager.spawnCrane(100, 250, 50, 0, 0.85, 1.5)!;

  // With capture = true, y should strictly equal baseY
  manager.update(1500, 500, true);
  assert.equal(crane.y, crane.baseY);
  assert.equal(crane.sprite.y, 250);
});

test("cranes deactivate when flying off-screen (x > 1180)", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  const crane = manager.spawnCrane(1170, 250, 50, 0)!;
  assert.equal(crane.active, true);

  // After 500ms at 50px/s, x = 1195 > 1180
  manager.update(500, 500, false);
  assert.equal(crane.active, false);
  assert.equal(crane.sprite.visible, false);
  assert.equal(crane.sprite.active, false);
  assert.equal(manager.getActiveCount(), 0);
});

test("destroy cleans up all sprites and empties pool", async () => {
  const { CraneManager } = await import("../apps/web/src/cranes.ts");
  const scene = createMockScene();
  const manager = new CraneManager();
  manager.create(scene);

  const pool = manager.getPool();
  const sprites = pool.map((c) => c.sprite as unknown as MockSprite);

  manager.destroy();

  for (const s of sprites) {
    assert.equal(s.isDestroyed, true, "Sprite should be destroyed");
  }
  assert.equal(manager.getPool().length, 0);
});
