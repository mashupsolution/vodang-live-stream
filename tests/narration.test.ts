import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../apps/server/src/engine.ts";
import { Store } from "../apps/server/src/store.ts";
import { Narrator } from "../apps/server/src/narrator.ts";
import type { Announcement, LiveEvent } from "../packages/shared/src/index.ts";

const gift = (
  id: string,
  count: number,
  final: boolean,
  source: LiveEvent["source"] = "mock",
): LiveEvent => ({
  id,
  type: "gift",
  source,
  timestamp: 1,
  user: { id: "u", name: "💥 <Lan>!" },
  giftId: "mock-linh-thach",
  giftName: "Linh Thạch",
  count,
  streakId: "s",
  final,
});

test("gift final thanks once with maximum observed count, sanitized name and session expiration", () => {
  const store = new Store(":memory:");
  let now = 1000;
  try {
    const engine = new Engine(store, () => now);
    engine.ingest(gift("g1", 3, false));
    engine.ingest(gift("g2", 2, true));
    engine.ingest(gift("g3", 3, true));
    assert.equal(engine.snapshot().progress, 30);
    const all = engine.snapshot().announcements;
    // 30 gift points promote the donor to Hộ Pháp Đồng, announced separately.
    assert.deepEqual(all.map((a) => a.kind).sort(), ["gift", "tier-up"]);
    const announcements = all.filter((a) => a.kind === "gift");
    assert.equal(
      announcements[0].text,
      "Võ Đang Sơn đa tạ hiệp sĩ Lan đã ban tặng 3 Linh Thạch, phong Hộ Pháp Đồng. Phúc đức vô lượng.",
    );
    assert.equal(announcements[0].tier, 1);
    assert.ok(engine.announcement(announcements[0].id));
    engine.ingest(gift("replay", 10, true, "replay"));
    engine.ingest(gift("foreign", 10, true, "tiktok"));
    assert.equal(engine.snapshot().announcements.length, 2);
    now += 30000;
    assert.equal(engine.announcement(announcements[0].id), undefined);
    engine.newSession();
    assert.deepEqual(engine.snapshot().announcements, []);
  } finally {
    store.close();
  }
});

test("follow throttling, fallback name and legacy settings hydration survive restart", () => {
  const store = new Store(":memory:");
  let now = 1000;
  try {
    let engine = new Engine(store, () => now);
    const follow = (id: string): LiveEvent => ({
      id,
      type: "follow",
      source: "mock",
      timestamp: 1,
      user: { id: "x", name: "💥" },
    });
    engine.ingest(follow("f1"));
    engine.ingest(follow("f2"));
    assert.equal(engine.snapshot().announcements.length, 1);
    assert.match(engine.snapshot().announcements[0].text, /Chào mừng đệ tử/);
    const state = store.load<any>();
    delete state.settings.narratorEnabled;
    delete state.settings.narratorVolume;
    store.save(state);
    engine = new Engine(store, () => now);
    assert.equal(engine.snapshot().settings.narratorEnabled, true);
    assert.equal(engine.snapshot().settings.narratorVolume, 0.85);
    assert.equal(
      engine.snapshot().settings.narratorVoice,
      "vi-VN-NamMinhNeural",
    );
    engine.updateSettings({
      ...engine.snapshot().settings,
      narratorVoice: "vi-VN-HoaiMyNeural",
    });
    engine = new Engine(store, () => now);
    assert.equal(
      engine.snapshot().settings.narratorVoice,
      "vi-VN-HoaiMyNeural",
    );
    now += 30000;
    engine.ingest(follow("f3"));
    assert.equal(engine.snapshot().announcements.length, 1);
  } finally {
    store.close();
  }
});

test("narrator serializes, deduplicates, bounds queue, caches and recovers from failures", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const narrator = new Narrator({
    contentType: "audio/wav",
    effectiveVoice: () => "Linh",
    status: async () => ({
      available: true,
      voice: "Linh",
      detail: "ready",
      provider: "native",
    }),
    synthesize: async (text) => {
      calls++;
      if (text === "hold") await gate;
      if (text === "fail") throw new Error("failure");
      return Buffer.from(text);
    },
  });
  const a = (id: string, text = id): Announcement => ({
    id,
    text,
    at: 1,
    sessionId: "s",
    kind: "gift",
  });
  assert.equal((await narrator.status()).available, true);
  const first = narrator.audio(a("0", "hold"));
  const duplicate = narrator.audio(a("0", "hold"));
  const rest = Array.from({ length: 11 }, (_, i) =>
    narrator.audio(a(String(i + 1))),
  );
  await assert.rejects(narrator.audio(a("overflow")), /queue-full/);
  release();
  await Promise.all([first, duplicate, ...rest]);
  assert.equal(calls, 12);
  await narrator.audio(a("0", "hold"));
  assert.equal(calls, 12);
  await assert.rejects(narrator.audio(a("failure", "fail")), /failure/);
  assert.equal((await narrator.audio(a("later"))).bytes.toString(), "later");
  await narrator.close();
  await assert.rejects(narrator.audio(a("closed")), /unavailable/);
});

test("welcome greets each new viewer once, throttled, and can be disabled", () => {
  const store = new Store(":memory:");
  let now = 1000;
  const join = (id: string, name: string): LiveEvent => ({
    id: `j-${id}-${now}`,
    type: "join",
    source: "mock",
    timestamp: now,
    user: { id, name },
  });
  const welcomes = (engine: Engine) =>
    engine.snapshot().announcements.filter((a) => a.kind === "welcome");
  try {
    const engine = new Engine(store, () => now);
    engine.ingest(join("a", "Lan"));
    engine.ingest(join("a", "Lan"));
    assert.equal(welcomes(engine).length, 1);
    engine.ingest(join("b", "Minh"));
    assert.equal(welcomes(engine).length, 1);
    now += 13000;
    engine.ingest(join("c", "Hoa"));
    assert.equal(welcomes(engine).length, 2);
    now += 13000;
    engine.updateSettings({
      ...engine.snapshot().settings,
      welcomeEnabled: false,
    });
    engine.ingest(join("d", "Tuan"));
    assert.equal(welcomes(engine).length, 2);
  } finally {
    store.close();
  }
});
