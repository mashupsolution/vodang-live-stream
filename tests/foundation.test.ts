import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Duplex } from "node:stream";
import http from "node:http";
import { WebSocket } from "ws";
import { Engine } from "../apps/server/src/engine.ts";
import { Store } from "../apps/server/src/store.ts";
import { createTempleApp } from "../apps/server/src/app.ts";
import type { LiveEvent } from "../packages/shared/src/index.ts";

function createPair() {
  let destroying = false;
  const a = new Duplex({
    read() {},
    write(chunk, _encoding, cb) {
      if (!b.destroyed) b.push(chunk);
      cb();
    },
    destroy(err, cb) {
      if (!destroying) {
        destroying = true;
        b.destroy(err ?? undefined);
      }
      cb(err);
    },
  });
  const b = new Duplex({
    read() {},
    write(chunk, _encoding, cb) {
      if (!a.destroyed) a.push(chunk);
      cb();
    },
    destroy(err, cb) {
      if (!destroying) {
        destroying = true;
        a.destroy(err ?? undefined);
      }
      cb(err);
    },
  });
  a.on("end", () => {
    if (!b.destroyed) b.push(null);
  });
  b.on("end", () => {
    if (!a.destroyed) a.push(null);
  });
  return [a, b] as const;
}

export const comment = (
  id: string,
  text = "!tu",
  uid = "cultivator-1",
): LiveEvent => ({
  id,
  type: "comment",
  source: "mock",
  timestamp: 100000,
  user: { id: uid, name: "Hàn Lập" },
  text,
});

test("progress, cultivators and duplicate IDs survive closing and reopening SQLite", () => {
  const dir = mkdtempSync(join(tmpdir(), "tutien-test-")),
    db = join(dir, "test.sqlite");
  try {
    let store = new Store(db),
      engine = new Engine(store, () => 100000);
    assert.equal(engine.ingest(comment("one")).result, "meditate");
    assert.equal(engine.snapshot().totals.meditate, 1);
    assert.equal(engine.snapshot().realms[0].tuVi, 5);
    store.close();

    store = new Store(db);
    engine = new Engine(store, () => 101000);
    assert.equal(engine.snapshot().progress, 1);
    assert.equal(engine.snapshot().totals.meditate, 1);
    assert.equal(engine.snapshot().realms[0].tuVi, 5);
    assert.equal(engine.ingest(comment("one")).result, "duplicate");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("two WebSocket views receive the same authoritative event and reconnect snapshot", async () => {
  const sect = createTempleApp(":memory:");

  const createMockWs = () => {
    const messages: any[] = [];
    let onMessage: ((data: any) => void) | undefined;
    const ws = {
      readyState: WebSocket.OPEN as number,
      bufferedAmount: 0,
      send(data: string) {
        messages.push(JSON.parse(data));
        onMessage?.(data);
      },
      terminate() {
        this.readyState = WebSocket.CLOSED;
        sect.wss.clients.delete(ws as any);
      },
      close() {
        this.readyState = WebSocket.CLOSED;
        sect.wss.clients.delete(ws as any);
      },
    };
    sect.wss.clients.add(ws as any);
    sect.wss.emit("connection", ws as any);
    return {
      ws,
      messages,
      nextMessage: () =>
        new Promise<any>((resolve) => {
          onMessage = (data) => {
            onMessage = undefined;
            resolve(JSON.parse(data));
          };
        }),
    };
  };

  const callHttp = (path: string, body?: unknown) =>
    new Promise<{ status: number; text: string }>((resolve, reject) => {
      const [srvSock, cliSock] = createPair();
      sect.server.emit("connection", srvSock);
      const payload = body !== undefined ? JSON.stringify(body) : undefined;
      const headers: Record<string, string | number> = {
        host: "localhost",
        origin: "http://localhost",
        connection: "close",
      };
      if (payload) {
        headers["content-type"] = "application/json";
        headers["content-length"] = Buffer.byteLength(payload);
      }
      const req = http.request(
        {
          path,
          method: "POST",
          headers,
          createConnection: () => cliSock as any,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            srvSock.destroy();
            cliSock.destroy();
            resolve({
              status: res.statusCode ?? 500,
              text: Buffer.concat(chunks).toString("utf8"),
            });
          });
        },
      );
      req.on("error", (err) => {
        srvSock.destroy();
        cliSock.destroy();
        reject(err);
      });
      if (payload) req.write(payload);
      req.end();
    });

  const first = createMockWs(),
    second = createMockWs();
  try {
    assert.equal(first.messages.length, 1);
    assert.equal(second.messages.length, 1);
    assert.equal(first.messages[0].state.progress, 0);
    assert.equal(second.messages[0].state.progress, 0);

    const firstNext = first.nextMessage();
    const secondNext = second.nextMessage();

    const response = await callHttp("/api/events", comment("ws-one"));
    assert.equal(response.status, 200);

    const [msg1, msg2] = await Promise.all([firstNext, secondNext]);
    assert.equal(msg1.state.progress, 1);
    assert.equal(msg1.state.totals.meditate, 1);
    assert.equal(msg1.state.realms[0].userName, "Hàn Lập");
    assert.equal(msg2.state.progress, 1);
    assert.equal(msg2.state.totals.meditate, 1);
    assert.equal(msg2.state.realms[0].userName, "Hàn Lập");

    const reconnect = createMockWs();
    assert.equal(reconnect.messages.length, 1);
    assert.equal(reconnect.messages[0].state.progress, 1);
    assert.equal(reconnect.messages[0].state.totals.meditate, 1);
    reconnect.ws.close();
  } finally {
    first.ws.terminate();
    second.ws.terminate();
    await sect.close();
  }
});
