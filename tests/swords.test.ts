import { test } from "node:test";
import assert from "node:assert/strict";

// Setup browser globals before importing Phaser and swords module
if (typeof (globalThis as any).Image === "undefined") {
  (globalThis as any).Image = class Image {};
}

if (typeof (globalThis as any).HTMLCanvasElement === "undefined") {
  (globalThis as any).HTMLCanvasElement = class HTMLCanvasElement {};
}

if (typeof (globalThis as any).window === "undefined") {
  const mockWindow = {
    location: { href: "http://localhost/" },
    addEventListener() {},
    removeEventListener() {},
    Image: (globalThis as any).Image,
    HTMLCanvasElement: (globalThis as any).HTMLCanvasElement,
  };
  Object.defineProperty(globalThis, "window", {
    value: mockWindow,
    configurable: true,
    writable: true,
  });
}

const mockDocument = {
  documentElement: {},
  createElement(tag: string) {
    if (tag === "canvas") {
      return createMockCanvas(256, 256);
    }
    return {};
  },
};
Object.defineProperty(globalThis, "document", {
  value: mockDocument,
  configurable: true,
  writable: true,
});

if (typeof (globalThis as any).navigator !== "undefined") {
  try {
    Object.defineProperty((globalThis as any).navigator, "maxTouchPoints", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty((globalThis as any).navigator, "msPointerEnabled", {
      value: false,
      configurable: true,
    });
    Object.defineProperty((globalThis as any).navigator, "pointerEnabled", {
      value: false,
      configurable: true,
    });
  } catch {
    // Ignore if already defined
  }
}

// Mock canvas and 2D context for headless node environment
function createMockCanvas(width: number, height: number) {
  const ctx = {
    shadowColor: "",
    shadowBlur: 0,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {},
    fill() {},
    fillRect() {},
    save() {},
    restore() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    getImageData(_sx: number, _sy: number, sw: number, sh: number) {
      return {
        data: new Uint8ClampedArray(sw * sh * 4),
      };
    },
    putImageData(_im: unknown, _dx: number, _dy: number) {},
  };

  const canvas = Object.create((globalThis as any).HTMLCanvasElement.prototype);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext = () => ctx;
  canvas.parentNode = {
    removeChild() {},
  };
  return canvas;
}

class MockImage {
  public x = 0;
  public y = 0;
  public scaleX = 1;
  public scaleY = 1;
  public alpha = 1;
  public depth = 0;
  public visible = true;
  public rotation = 0;
  public blendMode = 0;
  public originX = 0.5;
  public originY = 0.5;
  public tint = 0;
  public isDestroyed = false;

  constructor(
    x: number,
    y: number,
    public textureKey: string,
  ) {
    this.x = x;
    this.y = y;
  }

  setOrigin(x: number, y: number) {
    this.originX = x;
    this.originY = y;
    return this;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  setScale(x: number, y?: number) {
    this.scaleX = x;
    this.scaleY = y ?? x;
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

  setBlendMode(bm: number) {
    this.blendMode = bm;
    return this;
  }

  setRotation(r: number) {
    this.rotation = r;
    return this;
  }

  setTint(t: number) {
    this.tint = t;
    return this;
  }

  clearTint() {
    this.tint = 0;
    return this;
  }

  destroy() {
    this.isDestroyed = true;
  }
}

function createMockScene(): any {
  const textures = new Map<string, unknown>();
  const createdImages: MockImage[] = [];

  return {
    textures: {
      exists: (key: string) => textures.has(key),
      addCanvas: (key: string, canvas: unknown) => {
        textures.set(key, canvas);
        return { key };
      },
    },
    add: {
      image: (x: number, y: number, key: string) => {
        const img = new MockImage(x, y, key);
        createdImages.push(img);
        return img;
      },
    },
  };
}

test("procedural texture generation registers flying-sword, sword-trail, and bagua-array", async () => {
  const { generateSwordTextures } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();

  assert.equal(scene.textures.exists("flying-sword"), false);
  assert.equal(scene.textures.exists("sword-trail"), false);
  assert.equal(scene.textures.exists("bagua-array"), false);

  generateSwordTextures(scene);

  assert.equal(scene.textures.exists("flying-sword"), true);
  assert.equal(scene.textures.exists("sword-trail"), true);
  assert.equal(scene.textures.exists("bagua-array"), true);
});

test("SwordFormationManager pre-warms Bagua Dais, 24 swords pool, and 32 trails pool", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  const bagua = manager.getBaguaImage() as unknown as MockImage;
  assert.ok(bagua, "Bagua image must be created");
  assert.equal(bagua.x, 540);
  assert.equal(bagua.y, 1060);
  assert.equal(bagua.depth, 1.2);
  assert.equal(bagua.scaleX, 1.8);
  assert.ok(
    Math.abs(bagua.scaleY - 1.8 * 0.45) < 0.001,
    "scaleY should match ~0.45 flat perspective",
  );

  const swords = manager.getSwords();
  assert.equal(swords.length, 24, "Must pre-warm exactly 24 swords");

  // Ring 1 (indices 0..7)
  for (let i = 0; i < 8; i++) {
    const s = swords[i];
    assert.equal(s.ring, 0);
    assert.equal(s.baseRx, 310);
    assert.equal(s.baseRy, 100);
    assert.equal(s.active, true);
    assert.ok(s.speed > 0, "Ring 1 rotates counter-clockwise / positive");
  }

  // Ring 2 (indices 8..15)
  for (let i = 8; i < 16; i++) {
    const s = swords[i];
    assert.equal(s.ring, 1);
    assert.equal(s.baseRx, 360);
    assert.equal(s.baseRy, 120);
    assert.equal(s.active, true);
    assert.ok(s.speed < 0, "Ring 2 counter-rotates");
  }

  // Reserve swords (indices 16..23)
  for (let i = 16; i < 24; i++) {
    const s = swords[i];
    assert.equal(s.ring, 2);
    assert.equal(s.baseRx, 420);
    assert.equal(s.baseRy, 140);
    assert.equal(s.active, false, "Reserve swords start inactive");
  }

  const trails = manager.getTrails();
  assert.equal(trails.length, 32, "Must pre-warm exactly 32 trail sprites");
});

test("2.5D Orbit physics sorts back arc (sin < 0) behind cauldron and front arc (sin >= 0) in front", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  // Update over multiple frames
  for (let f = 0; f < 30; f++) {
    manager.update(f * 33.3, 33.3, false);
  }

  const swords = manager.getSwords();
  let foundBackArc = false;
  let foundFrontArc = false;

  for (let i = 0; i < 16; i++) {
    const s = swords[i];
    const img = s.sprite as unknown as MockImage;
    const sinT = Math.sin(s.angle);

    if (sinT < 0) {
      foundBackArc = true;
      assert.equal(
        img.depth,
        1.8,
        "Back arc sword must have depth 1.8 (behind cauldron at depth 2.0)",
      );
      assert.ok(
        img.scaleX >= 0.84 && img.scaleX <= 0.96,
        `Back arc scale should be ~0.85..0.95 (got ${img.scaleX})`,
      );
      assert.ok(
        img.alpha >= 0.74 && img.alpha <= 0.86,
        `Back arc alpha should be ~0.75..0.85 (got ${img.alpha})`,
      );
    } else {
      foundFrontArc = true;
      assert.equal(
        img.depth,
        2.4,
        "Front arc sword must have depth 2.4 (in front of cauldron at depth 2.0)",
      );
      assert.ok(
        img.scaleX >= 0.94 && img.scaleX <= 1.12,
        `Front arc scale should be ~0.95..1.10 (got ${img.scaleX})`,
      );
      assert.ok(
        img.alpha >= 0.84 && img.alpha <= 0.96,
        `Front arc alpha should be ~0.85..0.95 (got ${img.alpha})`,
      );
    }
  }

  assert.ok(foundBackArc, "Should encounter swords on back arc");
  assert.ok(foundFrontArc, "Should encounter swords on front arc");
});

test("triggerBurst activates reserve swords and accelerates orbits, returning to idle smoothly", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  const swords = manager.getSwords();
  assert.equal(swords[16].active, false);
  assert.equal(manager.isBursting(), false);

  manager.triggerBurst(2);
  assert.equal(manager.isBursting(), true);
  assert.equal(swords[16].active, true, "Reserve swords activated on burst");
  assert.equal((swords[16].sprite as unknown as MockImage).visible, true);

  // Advance partway through burst (e.g. 1.2s into 3.5s burst)
  for (let f = 0; f < 20; f++) {
    manager.update(f * 60, 60, false);
  }
  assert.equal(manager.isBursting(), true);
  assert.equal(swords[16].active, true);

  // Advance past 3.5s burst duration (another 50 frames of 60ms = 3.0s, total 4.2s)
  for (let f = 20; f < 70; f++) {
    manager.update(f * 60, 60, false);
  }
  assert.equal(manager.isBursting(), false);
  assert.equal(
    swords[16].active,
    false,
    "Reserve swords deactivated after burst completes",
  );
  assert.equal((swords[16].sprite as unknown as MockImage).visible, false);
});

test("triggerTribulation activates protective canopy formation above cauldron with vibration", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  assert.equal(manager.isTribulating(), false);

  manager.triggerTribulation();
  assert.equal(manager.isTribulating(), true);

  // Advance 1.5s into tribulation sustain (25 frames of 60ms)
  for (let f = 0; f < 25; f++) {
    manager.update(f * 60, 60, false);
  }
  const swords = manager.getSwords();

  // Swords should be positioned in canopy arch above cauldron (y < 750, cauldron is at y=770)
  for (let i = 0; i < 8; i++) {
    const img = swords[i].sprite as unknown as MockImage;
    assert.ok(
      img.y < 750,
      `Tribulation canopy sword should be hovering above cauldron (got y=${img.y})`,
    );
    assert.equal(
      img.depth,
      2.5,
      "Canopy depth should be 2.5 protective shield depth",
    );
  }

  // Advance past 4s tribulation duration (another 50 frames of 60ms = 3.0s, total 4.5s)
  for (let f = 25; f < 75; f++) {
    manager.update(f * 60, 60, false);
  }
  assert.equal(manager.isTribulating(), false);
});

test("deterministic capture mode yields stable positions and rotation", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  manager.update(1000, 16.6, true);
  const swords = manager.getSwords();
  const pos1X = (swords[0].sprite as unknown as MockImage).x;
  const pos1Y = (swords[0].sprite as unknown as MockImage).y;
  const rot1 = (swords[0].sprite as unknown as MockImage).rotation;

  // Run update again with completely different time and delta in capture mode
  manager.update(99999, 100, true);
  const pos2X = (swords[0].sprite as unknown as MockImage).x;
  const pos2Y = (swords[0].sprite as unknown as MockImage).y;
  const rot2 = (swords[0].sprite as unknown as MockImage).rotation;

  assert.equal(pos1X, pos2X, "Capture mode positions must be deterministic");
  assert.equal(pos1Y, pos2Y, "Capture mode positions must be deterministic");
  assert.equal(rot1, rot2, "Capture mode rotation must be deterministic");
});

test("destroy cleans up Bagua Dais image and all pooled sprites", async () => {
  const { SwordFormationManager } = await import("../apps/web/src/swords.ts");
  const scene = createMockScene();
  const manager = new SwordFormationManager(scene);

  const bagua = manager.getBaguaImage() as unknown as MockImage;
  const swords = [...manager.getSwords()];
  const trails = [...manager.getTrails()];

  assert.equal(bagua.isDestroyed, false);
  assert.equal(swords[0].sprite.isDestroyed, false);

  manager.destroy();

  assert.equal(bagua.isDestroyed, true);
  assert.equal(manager.getBaguaImage(), undefined);
  assert.equal(manager.getSwords().length, 0);
  assert.equal(manager.getTrails().length, 0);
  for (const s of swords) {
    assert.equal((s.sprite as unknown as MockImage).isDestroyed, true);
  }
  for (const t of trails) {
    assert.equal((t.sprite as unknown as MockImage).isDestroyed, true);
  }
});
