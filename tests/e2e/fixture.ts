import { test as base, expect, chromium } from "@playwright/test";
import express from "express";
import { resolve } from "node:path";
import { Duplex } from "node:stream";
import http from "node:http";
import { createTempleApp } from "../../apps/server/src/app.ts";

export const fixedTime = Date.UTC(2026, 9, 31, 5, 0, 0);

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

function handleHttp(
  server: http.Server,
  urlStr: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
) {
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve, reject) => {
    const url = new URL(urlStr, "http://127.0.0.1");
    const [cli, srv] = createPair();
    server.emit("connection", srv);
    const reqHeaders: Record<string, string | number> = {
      ...headers,
      host: "127.0.0.1",
      origin: headers.origin ?? "http://127.0.0.1",
    };
    if (body !== undefined && body.length > 0) {
      reqHeaders["content-length"] = body.length;
    }
    const req = http.request(
      {
        path: url.pathname + url.search,
        method,
        headers: reqHeaders,
        createConnection: () => cli as any,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          srv.destroy();
          cli.destroy();
          resolve({
            status: res.statusCode ?? 500,
            headers: res.headers as Record<string, string>,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", (err) => {
      srv.destroy();
      cli.destroy();
      reject(err);
    });
    if (body !== undefined && body.length > 0) req.write(body);
    req.end();
  });
}

function makeApiCaller(server: http.Server) {
  const call = async (
    url: string,
    method: string,
    options?: { data?: any; headers?: Record<string, string> },
  ) => {
    const payload =
      options?.data !== undefined
        ? typeof options.data === "string"
          ? Buffer.from(options.data)
          : Buffer.from(JSON.stringify(options.data))
        : undefined;
    const headers: Record<string, string> = {
      ...(options?.headers ?? {}),
    };
    if (payload !== undefined && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    const res = await handleHttp(server, url, method, headers, payload);
    return {
      status: () => res.status,
      ok: () => res.status >= 200 && res.status < 300,
      headers: () => res.headers,
      body: async () => res.body,
      text: async () => res.body.toString("utf8"),
      json: async () => JSON.parse(res.body.toString("utf8")),
    };
  };
  return {
    get: (url: string, options?: any) => call(url, "GET", options),
    post: (url: string, options?: any) => call(url, "POST", options),
    put: (url: string, options?: any) => call(url, "PUT", options),
    delete: (url: string, options?: any) => call(url, "DELETE", options),
  };
}

export const test = base.extend<{
  temple: ReturnType<typeof createTempleApp>;
  request: ReturnType<typeof makeApiCaller>;
}>({
  temple: async ({}, use) => {
    const startedAt = Date.now();
    const temple = createTempleApp(
      ":memory:",
      // Fixed calendar origin with elapsed time: fresh events stay fresh after
      // long operator flows, while capture=1 freezes the visual animation clock.
      process.env.TEMPLE_BENCHMARK === "1"
        ? Date.now
        : () => fixedTime + Date.now() - startedAt,
    );
    temple.app.use(express.static(resolve("dist/web")));
    temple.app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve("dist/web/index.html")),
    );
    try {
      await use(temple);
    } finally {
      await temple.close();
    }
  },
  baseURL: async ({}, use) => {
    await use("http://127.0.0.1");
  },
  context: async ({ temple }, use) => {
    const browser = await chromium.launch({
      headless:
        process.env.TEMPLE_BENCHMARK !== "1" ||
        process.env.TEMPLE_BENCHMARK_HEADLESS === "1",
      args: [
        "--single-process",
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      timezoneId: "Asia/Ho_Chi_Minh",
      locale: "vi-VN",
    });
    let isOffline = false;
    const origSetOffline = context.setOffline.bind(context);
    context.setOffline = async (offline: boolean) => {
      isOffline = offline;
      return origSetOffline(offline);
    };

    await context.route("**/*", async (route) => {
      if (isOffline) {
        await route.abort("failed");
        return;
      }
      const req = route.request();
      try {
        const res = await handleHttp(
          temple.server,
          req.url(),
          req.method(),
          req.headers(),
          req.postDataBuffer() || undefined,
        );
        await route.fulfill({
          status: res.status,
          headers: res.headers,
          body: res.body,
        });
      } catch {
        await route.abort();
      }
    });

    const listeners = new Set<() => void>();
    const oldOnChange = temple.engine.onChange;
    temple.engine.onChange = () => {
      oldOnChange.call(temple.engine);
      for (const fn of listeners) fn();
    };

    await context.routeWebSocket("**/ws*", (ws) => {
      if (isOffline) {
        ws.close();
        return;
      }
      const url = new URL(ws.url());
      const isAdmin = url.searchParams.get("role") === "admin";
      const send = () => {
        try {
          ws.send(
            JSON.stringify({
              type: "snapshot",
              state: temple.engine.snapshot(isAdmin),
            }),
          );
        } catch {}
      };
      send();
      listeners.add(send);
      ws.onClose(() => listeners.delete(send));
    });

    try {
      await use(context);
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  },
  request: async ({ temple }, use) => {
    await use(makeApiCaller(temple.server) as any);
  },
});

export { expect };

export function seed(temple: ReturnType<typeof createTempleApp>, count = 24) {
  const names = [
    "Vân Tiêu",
    "Thanh Huyền",
    "Hàn Lập",
    "Lăng Phong",
    "Lạc Tuyết",
    "Bạch Tiểu Thuần",
    "Tô Minh",
    "Diệp Trần",
    "Tiêu Viêm",
    "Lâm Động",
    "Mộ Dung",
    "Sở Hưu",
  ];
  for (let i = 0; i < count; i++)
    temple.engine.ingest({
      id: `seed:${i}`,
      timestamp: fixedTime,
      type: "join",
      source: "mock",
      user: { id: `seed:${i}`, name: names[i % names.length] },
    });
}
