import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex } from "node:stream";
import { createTempleApp } from "../apps/server/src/app.ts";

function createPair() {
  const a = new Duplex({
    read() {},
    write(chunk, _encoding, cb) {
      if (!b.destroyed) b.push(chunk);
      cb();
    },
    destroy(err, cb) {
      if (!b.destroyed) b.destroy(err ?? undefined);
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
      if (!a.destroyed) a.destroy(err ?? undefined);
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

function createClient(server: http.Server) {
  return function call(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<{ status: number; text: string; json: any }> {
    return new Promise((resolve, reject) => {
      const [serverSock, clientSock] = createPair();
      server.emit("connection", serverSock);

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
          method,
          headers,
          createConnection: () => clientSock as any,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            serverSock.destroy();
            clientSock.destroy();
            const text = Buffer.concat(chunks).toString("utf8");
            let json: any = null;
            try {
              json = JSON.parse(text);
            } catch {}
            resolve({ status: res.statusCode ?? 500, text, json });
          });
        },
      );
      req.on("error", (err) => {
        serverSock.destroy();
        clientSock.destroy();
        reject(err);
      });
      if (payload) req.write(payload);
      req.end();
    });
  };
}

async function withApp(
  run: (
    call: (
      path: string,
      method?: string,
      body?: unknown,
    ) => Promise<{ status: number; text: string; json: any }>,
  ) => Promise<void>,
) {
  const sect = createTempleApp(":memory:");
  const call = createClient(sect.server);
  try {
    await run(call);
  } finally {
    await sect.close();
  }
}

test("/api/health returns ok: true, app: tu-tien-online", async () => {
  await withApp(async (call) => {
    const res = await call("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, {
      ok: true,
      app: "tu-tien-online",
      version: 1,
    });
  });
});

test("TikTok username persists, the sign key is write-only and never leaks", async () => {
  const saved = { ...process.env };
  delete process.env.TIKTOK_USERNAME;
  delete process.env.TIKTOK_SIGN_API_KEY;
  try {
    await withApp(async (call) => {
      assert.deepEqual((await call("/api/tiktok")).json, {
        username: "",
        hasSignKey: false,
      });
      let r = await call("/api/tiktok", "PUT", {
        username: " @tu.tien_online ",
        signApiKey: "secret-key-123",
      });
      assert.deepEqual(r.json, {
        username: "tu.tien_online",
        hasSignKey: true,
      });
      assert.ok(!r.text.includes("secret-key-123"));
      // Omitted key is kept; the username can change independently.
      r = await call("/api/tiktok", "PUT", { username: "khac" });
      assert.deepEqual(r.json, { username: "khac", hasSignKey: true });
      for (const path of ["/api/tiktok", "/api/state", "/api/admin"]) {
        const body = (await call(path)).text;
        assert.ok(!body.includes("secret-key-123"), path);
      }
      assert.ok(!(await call("/api/state")).text.includes("khac"));
      // null or empty clears the key.
      r = await call("/api/tiktok", "PUT", {
        username: "khac",
        signApiKey: null,
      });
      assert.equal(r.json.hasSignKey, false);
      await call("/api/tiktok", "PUT", {
        username: "khac",
        signApiKey: "again",
      });
      r = await call("/api/tiktok", "PUT", {
        username: "khac",
        signApiKey: "",
      });
      assert.equal(r.json.hasSignKey, false);
    });
  } finally {
    Object.assign(process.env, saved);
  }
});

test("TikTok settings reject invalid usernames and connecting needs a username", async () => {
  const saved = { ...process.env };
  delete process.env.TIKTOK_USERNAME;
  try {
    await withApp(async (call) => {
      assert.equal(
        (await call("/api/tiktok", "PUT", { username: "có dấu cách" })).status,
        400,
      );
      assert.equal(
        (await call("/api/tiktok", "PUT", { username: "x".repeat(65) })).status,
        400,
      );
      const noName = await call("/api/connector", "POST", { mode: "tiktok" });
      assert.equal(noName.status, 400);
      assert.match(noName.json.error, /Cài đặt/);
    });
  } finally {
    Object.assign(process.env, saved);
  }
});

test("TIKTOK_USERNAME in the environment stays a fallback; stored value wins", async () => {
  const saved = { ...process.env };
  process.env.TIKTOK_USERNAME = "@from_env";
  try {
    await withApp(async (call) => {
      assert.equal((await call("/api/tiktok")).json.username, "from_env");
      await call("/api/tiktok", "PUT", { username: "from_settings" });
      assert.equal((await call("/api/tiktok")).json.username, "from_settings");
    });
  } finally {
    process.env = saved;
  }
});
