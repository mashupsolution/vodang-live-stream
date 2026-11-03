import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../apps/server/src/engine.ts";
import { Store } from "../apps/server/src/store.ts";

test("like and follow ceremonies identify their participant without changing cultivation", () => {
  const store = new Store(":memory:");
  try {
    const engine = new Engine(store, () => 1000);
    const user = { id: "participant", name: "Thanh Huyền" };
    engine.ingest({
      id: "like",
      timestamp: 1000,
      source: "mock",
      type: "like",
      count: 3,
      user,
    });
    engine.ingest({
      id: "follow",
      timestamp: 1000,
      source: "mock",
      type: "follow",
      user,
    });
    const state = engine.snapshot();
    assert.deepEqual(
      state.ceremonies.map((c) => [c.action, c.userId]),
      [
        ["like", user.id],
        ["follow", user.id],
      ],
    );
    assert.equal(state.progress, 0);
    assert.equal(state.visitors.length, 1);
    assert.equal(state.totals.likes, 3);
    assert.equal(state.realms[0].tuVi, 0);
  } finally {
    store.close();
  }
});

test("heart goal feeds the formation once per milestone", () => {
  const store = new Store(":memory:");
  try {
    const engine = new Engine(store, () => 1000);
    const user = { id: "viewer", name: "Thanh Huyền" };
    const like = (id: string, count: number) =>
      engine.ingest({ id, timestamp: 1000, source: "mock", type: "like", count, user });
    like("l1", 60);
    assert.equal(engine.snapshot().progress, 0);
    like("l2", 60);
    assert.equal(engine.snapshot().progress, 5);
    like("l3", 10);
    assert.equal(engine.snapshot().progress, 5);
    like("l4", 400);
    assert.equal(engine.snapshot().progress, 10);
  } finally {
    store.close();
  }
});

test("every 10 hearts from one viewer earns one participation point", () => {
  const store = new Store(":memory:");
  try {
    const engine = new Engine(store, () => 1000);
    const user = { id: "viewer", name: "Thanh Huyền" };
    for (const [id, count] of [["a", 6], ["b", 6], ["c", 8]] as const)
      engine.ingest({ id, timestamp: 1000, source: "mock", type: "like", count, user });
    const s = engine.snapshot();
    assert.equal(s.session.participation[0]?.score, 2);
    assert.deepEqual(s.session.hearts, { count: 20, goal: 100 });
  } finally {
    store.close();
  }
});
