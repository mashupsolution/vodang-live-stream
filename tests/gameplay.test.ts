import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../apps/server/src/engine.ts";
import { Store } from "../apps/server/src/store.ts";
import { normalizeTikTok } from "../apps/server/src/connectors.ts";
import {
  defaultSettings,
  liveEventSchema,
  REALMS,
  getRealm,
  type LiveEvent,
  type AdminSnapshot,
} from "../packages/shared/src/index.ts";

function fixture(rng: () => number = Math.random) {
  let now = 100000;
  const store = new Store(":memory:"),
    engine = new Engine(store, () => now, rng);
  return {
    store,
    engine,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function comment(
  id: string,
  text: string,
  user = "cultivator-1",
  name = "Đạo Hữu",
): LiveEvent {
  return {
    id,
    type: "comment",
    source: "mock",
    timestamp: 100000,
    user: { id: user, name },
    text,
  };
}

function gift(
  id: string,
  count: number,
  final = false,
  streakId = "streak",
  giftId = "mock-linh-thach",
  giftName = "Linh Thạch Hạ Phẩm",
  user = "giver",
): LiveEvent {
  return {
    id,
    type: "gift",
    source: "mock",
    timestamp: 100000,
    user: { id: user, name: "Tiên Gia" },
    giftId,
    giftName,
    count,
    streakId,
    final,
  };
}

test("free commands, gift guidance, empty vow and per-viewer cooldown boundaries", () => {
  const { store, engine, advance } = fixture();
  try {
    assert.equal(engine.ingest(comment("0", "!daotam")).result, "empty-prayer");
    assert.equal(engine.ingest(comment("1", "!TU")).result, "meditate");
    assert.equal(engine.ingest(comment("2", "!dan")).result, "cooldown");
    assert.equal(
      engine.ingest(comment("3", "!dan", "other-cultivator")).result,
      "elixir",
    );
    advance(9999);
    assert.equal(
      engine.ingest(comment("4", "!phapbao")).result,
      "gift-required",
    );
    assert.equal(
      engine.ingest(comment("5", "!linhdan")).result,
      "gift-required",
    );
    advance(1);
    assert.equal(engine.ingest(comment("6", "!dan")).result, "elixir");
    assert.equal(engine.snapshot().progress, 3);
    assert.equal(engine.snapshot().totals.meditate, 1);
    assert.equal(engine.snapshot().totals.elixir, 2);

    // Wudang command aliases: !quyen, !kiem, !lephap, !loithe
    assert.equal(
      engine.ingest(comment("7", "!quyen", "wudang-1")).result,
      "meditate",
    );
    assert.equal(
      engine.ingest(comment("8", "!kiem", "wudang-2")).result,
      "elixir",
    );
    assert.equal(
      engine.ingest(comment("9", "!lephap", "wudang-3")).result,
      "gift-required",
    );
    assert.equal(
      engine.ingest(comment("10", "!loithe", "wudang-4")).result,
      "empty-prayer",
    );
    assert.equal(
      engine.ingest(comment("11", "!loithe Thề bảo vệ Võ Đang", "wudang-4"))
        .result,
      "pending-approval",
    );
    assert.equal(engine.snapshot().totals.meditate, 2);
    assert.equal(engine.snapshot().totals.elixir, 3);
  } finally {
    store.close();
  }
});

test("vow queue moderation: private until approved, gives +5 tuVi on approval", () => {
  const { store, engine } = fixture();
  try {
    engine.ingest(comment("v1", "!daotam Cầu ngộ đạo kim đan"));
    assert.equal(engine.snapshot().prayers.length, 0);
    const admin = engine.snapshot(true) as AdminSnapshot;
    assert.equal(admin.pendingPrayers.length, 1);
    const prayerId = admin.pendingPrayers[0].id;
    assert.equal(engine.moderate(prayerId, "approved"), true);
    assert.equal(engine.snapshot().prayers[0].text, "Cầu ngộ đạo kim đan");
    assert.equal(engine.moderate(prayerId, "approved"), false);

    // Approval grants +5 tuVi to the cultivator
    const c = engine.snapshot().realms.find((r) => r.userId === "cultivator-1");
    assert.ok(c);
    assert.equal(c.tuVi, 5);

    engine.ingest(comment("v2", "!daotam Tà đạo tâm ma", "other"));
    engine.moderate(2, "rejected");
    assert.equal(engine.snapshot().prayers.length, 1);
  } finally {
    store.close();
  }
});

test("deterministic tribulation breakthrough via injected rng", () => {
  let nextRandom = 0.5;
  const { store, engine } = fixture(() => nextRandom);
  try {
    // Phàm Nhân (tier 0) needs 10 tuVi for Luyện Khí (tier 1)
    assert.equal(
      engine.ingest(comment("t0", "!dokiep")).result,
      "insufficient-tuvi",
    );

    // Gain 10 tuVi via two meditate commands (cooldown bypassed by changing user or settings)
    engine.updateSettings({ ...defaultSettings, cooldownSeconds: 0 });
    engine.ingest(comment("t1", "!tu"));
    engine.ingest(comment("t2", "!tu"));
    assert.equal(engine.snapshot().realms[0].tuVi, 10);
    assert.equal(engine.snapshot().realms[0].bottlenecked, true);

    // Tribulation attempt 1: force failure (nextRandom >= chance)
    // Luyện Khí baseChance = 0.95. If nextRandom = 0.99 => fail
    nextRandom = 0.99;
    const failResult = engine.ingest(comment("t3", "!dokiep"));
    assert.equal(failResult.result, "tribulation-fail");
    assert.equal(engine.snapshot().realms[0].realmIndex, 0); // Not demoted
    assert.equal(
      engine.snapshot().ceremonies.at(-1)?.action,
      "tribulation-fail",
    );

    // Tribulation attempt 2: force success (nextRandom < chance)
    // chance was 0.95 + 0.20 pity = 1.0 (clamped). Any roll passes.
    nextRandom = 0.1;
    const successResult = engine.ingest(comment("t4", "!dokiep"));
    assert.equal(successResult.result, "tribulation-success");
    assert.equal(engine.snapshot().realms[0].realmIndex, 1);
    assert.equal(engine.snapshot().realms[0].realmName, "Ký Danh Đệ Tử");
    assert.equal(engine.snapshot().totals.breakthroughs, 1);
    assert.equal(engine.snapshot().visitors[0].realmIndex, 1);
    assert.equal(engine.snapshot().visitors[0].realmName, "Ký Danh Đệ Tử");
  } finally {
    store.close();
  }
});

test("Nội Môn+ breakthrough emits Tiên Âm announcement and Tier 9 caps at max-realm", () => {
  const { store, engine } = fixture(() => 0.01);
  try {
    engine.updateSettings({ ...defaultSettings, cooldownSeconds: 0 });
    // Use high tier gift to quickly raise tuVi to Ngoại Môn (tier 2, 35 tuVi) -> Nội Môn (tier 3, 80 tuVi)
    engine.ingest(
      gift(
        "g_huge",
        3,
        true,
        "s1",
        "mock-phi-kiem",
        "Phi Kiếm",
        "cultivator-kd",
      ),
    );
    // mock-phi-kiem intensity=3, points=50. tuVi += 50 * 3 * 3 = 450.
    // Instant Ngoại Môn breakthrough while tuVi >= next.minTuVi advances all realms!
    const cult = engine
      .snapshot()
      .realms.find((r) => r.userId === "cultivator-kd");
    assert.ok(cult);
    assert.ok(cult.realmIndex >= 3); // At least Nội Môn or higher!

    // Announcements should have recorded breakthrough
    const breakthroughs = engine
      .snapshot()
      .announcements.filter((a) => a.kind === "breakthrough");
    assert.ok(breakthroughs.length >= 1);
    assert.match(breakthroughs[0].text, /vượt qua thiên kiếp/);

    // If a cultivator reaches Tier 9 (Chân Tiên), dokiep returns max-realm
    const state = store.load<any>();
    state.cultivators["cultivator-kd"].realmIndex = 9;
    state.cultivators["cultivator-kd"].tuVi = 9999;
    store.save(state);
    const reloaded = new Engine(store, () => 100000);
    assert.equal(
      reloaded.ingest(comment("max", "!dokiep", "cultivator-kd")).result,
      "max-realm",
    );
  } finally {
    store.close();
  }
});

test("gift streak count increases once, including final and out-of-order packets", () => {
  const { store, engine } = fixture();
  try {
    engine.ingest(gift("g1", 1));
    engine.ingest(gift("g2", 3));
    engine.ingest(gift("g3", 2));
    engine.ingest(gift("g4", 3, true));
    engine.ingest(gift("g4", 3, true));
    // mock-linh-thach: points=10 => 3 * 10 = 30
    assert.equal(engine.snapshot().progress, 30);
    assert.equal(engine.snapshot().totals.meditate, 3);
    engine.ingest(gift("g5", 1, true, "new-streak"));
    assert.equal(engine.snapshot().progress, 40);
  } finally {
    store.close();
  }
});

test("milestones coalesce bursts and never repeat already reached progress", () => {
  const { store, engine } = fixture();
  try {
    engine.ingest(gift("m1", 10, true));
    assert.deepEqual(engine.snapshot().milestones, [100]);
    engine.ingest(gift("m2", 25, true));
    assert.deepEqual(engine.snapshot().milestones, [100, 250]);
    engine.ingest(gift("m3", 50, true));
    engine.ingest(gift("m4", 100, true));
    assert.deepEqual(engine.snapshot().milestones, [100, 250, 500, 1000]);
    assert.match(
      engine.snapshot().ceremonies.at(-1)?.name ?? "",
      /Linh mạch khai mở/,
    );
    const seq = engine.snapshot().seq;
    engine.ingest(gift("m4", 100, true));
    assert.equal(engine.snapshot().seq, seq);
  } finally {
    store.close();
  }
});

test("40-visitor and ceremony bounds hold under bursts; expired guests leave", () => {
  const { store, engine, advance } = fixture();
  try {
    for (let n = 0; n < 100; n++)
      engine.ingest(comment(`b${n}`, "!tu", `v${n}`, `Đạo Hữu ${n}`));
    const state = engine.snapshot();
    assert.equal(state.visitors.length, 40);
    assert.equal(new Set(state.visitors.map((v) => v.slot)).size, 40);
    assert.ok(state.ceremonies.length <= 16);
    advance(120001);
    assert.equal(engine.snapshot().visitors.length, 0);
    assert.equal(engine.snapshot().ceremonies.length, 0);
  } finally {
    store.close();
  }
});

test("unmapped gifts have a modest fallback; configured mappings persist", () => {
  const { store, engine } = fixture();
  try {
    const e = gift("u", 2, true);
    if (e.type !== "gift") throw new Error();
    e.giftId = "unknown";
    engine.ingest(e);
    assert.equal(engine.snapshot().progress, 2);
    assert.equal(engine.snapshot().totals.elixir, 2);
    engine.updateMappings([
      {
        giftId: "unknown",
        name: "Linh Bảo Tự Tạo",
        action: "sword",
        intensity: 3,
        points: 5,
      },
    ]);
    engine.ingest({ ...e, id: "u2", streakId: "other" });
    assert.equal(engine.snapshot().progress, 12);
    assert.equal(engine.snapshot().totals.sword, 2);
    const reloaded = new Engine(store, () => 100000);
    assert.equal(
      (reloaded.snapshot(true) as AdminSnapshot).mappings[0].points,
      5,
    );
    engine.updateSettings({ ...defaultSettings, camera: "close" });
    assert.equal(new Engine(store).snapshot().settings.camera, "close");
  } finally {
    store.close();
  }
});

test("replay creates new IDs and keeps vows pending", () => {
  const { store, engine } = fixture();
  try {
    engine.ingest(gift("r1", 2, true));
    assert.equal(engine.replay(1), 1);
    assert.equal(engine.snapshot().progress, 40);
    assert.equal(engine.snapshot(true).recent[0].source, "replay");
  } finally {
    store.close();
  }
});

test("TikTok boundary normalizes supported payloads and stable streak groups", () => {
  const user = { userId: "123", nickname: "Hàn Lập" };
  const first = normalizeTikTok("gift", {
    user,
    msgId: "1",
    giftId: 5655,
    giftType: 1,
    groupId: "group",
    repeatCount: 1,
    repeatEnd: false,
  });
  const final = normalizeTikTok("gift", {
    user,
    msgId: "2",
    giftId: 5655,
    giftType: 1,
    groupId: "group",
    repeatCount: 3,
    repeatEnd: true,
  });
  assert.ok(first && final && first.type === "gift" && final.type === "gift");
  assert.equal(first.streakId, final.streakId);
  assert.equal(final.final, true);
  for (const [type, payload] of Object.entries({
    chat: { comment: "!tu" },
    member: {},
    like: { likeCount: 10 },
    follow: {},
  }))
    assert.equal(
      liveEventSchema.safeParse(
        normalizeTikTok(type, { user, msgId: type, ...payload }),
      ).success,
      true,
    );
  assert.equal(normalizeTikTok("chat", {}), undefined);
  assert.equal(normalizeTikTok("unknown", { user }), undefined);
});

test("installed v2.5 SDK protobuf shapes use user.id, common.msgId and gift.type", () => {
  const user = { id: "731", nickname: "Tu Sĩ Chân Chính" },
    common = { msgId: "200" };
  const chat = normalizeTikTok("chat", { user, common, comment: "!tu" });
  assert.ok(chat && chat.type === "comment");
  assert.equal(chat.user.id, "731");
  assert.equal(chat.id, "tt:chat:200");
  assert.ok(liveEventSchema.safeParse(chat).success);
  const gift = normalizeTikTok("gift", {
    user,
    common,
    giftId: "5655",
    gift: { id: "5655", name: "Linh Dược", type: 1 },
    groupId: "g",
    repeatCount: 2,
    repeatEnd: 0,
  });
  assert.ok(gift && gift.type === "gift");
  assert.equal(gift.final, false);
  assert.equal(gift.giftName, "Linh Dược");
  assert.equal(gift.count, 2);
  assert.equal(
    normalizeTikTok("gift", {
      user,
      common,
      giftId: "5655",
      gift: { type: 1 },
      groupId: "0",
      repeatCount: 2,
      repeatEnd: 0,
    }),
    undefined,
  );
  const final = normalizeTikTok("gift", {
    user,
    common,
    giftId: "5655",
    gift: { type: 1 },
    groupId: "0",
    repeatCount: 3,
    repeatEnd: 1,
  });
  assert.ok(final && final.type === "gift");
  assert.equal(final.count, 3);
  assert.equal(final.final, true);
});

test("gift points promote donor tiers once, boost practice and persist", () => {
  const { store, engine, advance } = fixture();
  try {
    // 10 points = Hộ Pháp Đồng (tier 1)
    engine.ingest(gift("d1", 1, true, "d-a"));
    let snap = engine.snapshot();
    assert.equal(snap.visitors.find((v) => v.id === "giver")?.donorTier, 1);
    assert.equal(
      snap.ceremonies.filter((c) => c.action === "donor-tier").length,
      1,
    );
    assert.equal(snap.session.recentDonors.at(-1)?.tier, 1);

    // Another gift inside the same tier does not re-promote.
    advance(1);
    engine.ingest(gift("d2", 1, true, "d-b"));
    assert.equal(
      engine.snapshot().ceremonies.filter((c) => c.action === "donor-tier")
        .length,
      1,
    );

    // Tier 1 gives +10% practice (5 -> 6 tuVi, rounded).
    const before = engine.snapshot().visitors.find((v) => v.id === "giver")!
      .tuVi;
    advance(20000);
    engine.ingest(comment("t1", "!tu", "giver"));
    snap = engine.snapshot();
    assert.equal(snap.visitors.find((v) => v.id === "giver")!.tuVi, before + 6);
  } finally {
    store.close();
  }
});

test("default TikTok gifts are seeded and added to older databases", () => {
  const { store, engine } = fixture();
  try {
    const ids = (engine.snapshot(true) as AdminSnapshot).mappings.map(
      (m) => m.giftId,
    );
    for (const id of ["5655", "5487", "5660"]) assert.ok(ids.includes(id));
    engine.updateMappings([
      {
        giftId: "custom",
        name: "Tự Tạo",
        action: "sword",
        intensity: 3,
        points: 7,
      },
    ]);
    const mappings = (
      new Engine(store, () => 100000).snapshot(true) as AdminSnapshot
    ).mappings;
    assert.equal(mappings[0].giftId, "custom");
    assert.ok(mappings.some((m) => m.giftId === "5487"));
  } finally {
    store.close();
  }
});

test("simulator honors the requested disciple count and clamps it", async () => {
  const { Simulator } = await import("../apps/server/src/simulator.ts");
  const demoCount = (engine: ReturnType<typeof fixture>["engine"]) =>
    engine.snapshot().visitors.filter((v) => v.id.startsWith("demo:visitor:"))
      .length;
  for (const [asked, expected] of [
    [3, 3],
    [1, 1],
    [0, 1],
  ] as const) {
    const { engine } = fixture();
    const sim = new Simulator(engine, () => 100000);
    sim.start(undefined, undefined, asked);
    sim.step();
    assert.equal(demoCount(engine), expected, `asked ${asked}`);
    sim.stop();
  }
  const { engine } = fixture();
  const sim = new Simulator(engine, () => 100000);
  sim.start(undefined, undefined, 9999);
  sim.step();
  assert.ok(engine.snapshot().visitors.length > 0);
  assert.ok(
    engine.snapshot().visitors.length + engine.snapshot().visitorOverflow <= 500,
  );
  sim.stop();
});

test("simulator audience equals the simulated disciple count", async () => {
  const { Simulator } = await import("../apps/server/src/simulator.ts");
  const { engine } = fixture();
  const sim = new Simulator(engine, () => 100000);
  sim.start(undefined, undefined, 25);
  assert.equal(engine.snapshot().audience.current, 25);
  sim.stop();
});

test("simulator stop clears demo disciples but keeps scores; reset clears both", async () => {
  const { Simulator } = await import("../apps/server/src/simulator.ts");
  const { engine } = fixture();
  const sim = new Simulator(engine, () => 100000);
  engine.ingest(comment("real-1", "!tu", "real-user", "Người Thật"));
  sim.start();
  sim.step();
  sim.step();
  assert.equal(engine.simulating, true);
  assert.ok(engine.hasDemoVisitors());
  const before = engine.snapshot().totals.visits;
  sim.step();
  assert.equal(engine.snapshot().totals.visits, before, "no re-join while running");
  const participation = engine.snapshot().session.participation.length;
  assert.ok(participation > 0);

  sim.stop();
  assert.equal(engine.simulating, false);
  assert.ok(!engine.hasDemoVisitors());
  assert.ok(engine.snapshot().visitors.some((v) => v.id === "real-user"));
  assert.equal(engine.snapshot().session.participation.length, participation);
  sim.step();
  assert.ok(!engine.hasDemoVisitors(), "stopped simulator emits nothing");

  sim.start();
  sim.step();
  assert.equal(
    engine.snapshot().session.participation.length >= participation,
    true,
    "restart keeps scores",
  );
  engine.resetDemo();
  const snap = engine.snapshot();
  assert.equal(snap.session.participation.length, 0);
  assert.equal(snap.session.gifts.length, 0);
  assert.ok(!engine.hasDemoVisitors());
  sim.stop();
});
