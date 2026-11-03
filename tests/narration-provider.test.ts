import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex, Readable } from "node:stream";
import { OUTPUT_FORMAT } from "msedge-tts";
import { createTempleApp } from "../apps/server/src/app.ts";
import {
  Narrator,
  createEdgeProvider,
  type NarrationProvider,
} from "../apps/server/src/narrator.ts";
import {
  settingsSchema,
  defaultSettings,
  type Announcement,
} from "../packages/shared/src/index.ts";

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
  ): Promise<{
    status: number;
    text: string;
    json: any;
    contentType: string | undefined;
  }> {
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
            resolve({
              status: res.statusCode ?? 500,
              text,
              json,
              contentType: res.headers["content-type"],
            });
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

const nam = "vi-VN-NamMinhNeural";
const hoai = "vi-VN-HoaiMyNeural";
const announcement: Announcement = {
  id: "id",
  text: "hello",
  at: 1,
  sessionId: "s",
  kind: "gift",
};
function fake(
  contentType: "audio/wav" | "audio/mpeg",
  calls: string[] = [],
): NarrationProvider {
  return {
    contentType,
    effectiveVoice: (voice) => (contentType === "audio/wav" ? "Linh" : voice),
    async status(voice) {
      return {
        available: true,
        voice: this.effectiveVoice(voice),
        detail: "ready",
        provider: contentType === "audio/wav" ? "native" : "edge",
      };
    },
    async synthesize(text, voice) {
      calls.push(voice);
      return Buffer.from(`${voice}:${text}`);
    },
  };
}

test("settings validate voice and hydrate legacy defaults", () => {
  const { narratorVoice: _, ...legacy } = defaultSettings;
  assert.equal(settingsSchema.parse(legacy).narratorVoice, nam);
  assert.equal(
    settingsSchema.safeParse({ ...defaultSettings, narratorVoice: "invalid" })
      .success,
    false,
  );
});

test("voice changes use distinct cached and pending synthesis; macOS stays Linh", async () => {
  const calls: string[] = [];
  const narrator = new Narrator(fake("audio/mpeg", calls));
  const [a, b, duplicate] = await Promise.all([
    narrator.audio(announcement, nam),
    narrator.audio(announcement, hoai),
    narrator.audio(announcement, nam),
  ]);
  assert.deepEqual(calls, [nam, hoai]);
  assert.equal(a.bytes.toString(), duplicate.bytes.toString());
  assert.match(b.bytes.toString(), /HoaiMy/);
  await narrator.audio(announcement, hoai);
  assert.equal(calls.length, 2);
  await narrator.close();
  const nativeCalls: string[] = [];
  const native = new Narrator(fake("audio/wav", nativeCalls));
  await native.audio(announcement, nam);
  await native.audio(announcement, hoai);
  assert.deepEqual(nativeCalls, ["Linh"]);
  await native.close();
});

test("shutdown aborts in-flight provider and rejects queued jobs", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const provider = fake("audio/mpeg");
  provider.synthesize = async (_text, _voice, signal) =>
    new Promise((_, reject) => {
      started();
      signal.addEventListener("abort", () => reject(new Error("cancelled")), {
        once: true,
      });
    });
  const narrator = new Narrator(provider);
  const active = narrator.audio(announcement);
  const queued = narrator.audio({ ...announcement, id: "other" });
  const results = Promise.allSettled([active, queued]);
  await ready;
  await narrator.close();
  assert.deepEqual(
    (await results).map((r) => r.status),
    ["rejected", "rejected"],
  );
});

for (const format of ["audio/wav", "audio/mpeg"] as const) {
  test(`narration HTTP MIME and legacy WAV route: ${format}`, async () => {
    const calls: string[] = [];
    const temple = createTempleApp(
      ":memory:",
      Date.now,
      Math.random,
      new Narrator(fake(format, calls)),
    );
    const call = createClient(temple.server);
    try {
      temple.engine.ingest({
        id: "f",
        type: "follow",
        source: "mock",
        timestamp: Date.now(),
        user: { id: "u", name: "Lan" },
      });
      const id = temple.engine.snapshot().announcements[0].id;
      const response = await call(`/api/narration/${id}/audio`);
      assert.equal(response.status, 200);
      assert.match(response.contentType!, new RegExp(`^${format}`));
      const legacy = await call(`/api/narration/${id}.wav`);
      assert.equal(legacy.status, format === "audio/wav" ? 200 : 406);
      assert.equal(calls.length, 1);
      assert.equal((await call("/api/narration/not-an-id/audio")).status, 404);
      const status = await call("/api/narrator");
      assert.equal(
        status.json.provider,
        format === "audio/wav" ? "native" : "edge",
      );
      const put = await call("/api/settings", "PUT", {
        ...temple.engine.snapshot().settings,
        narratorVoice: hoai,
      });
      assert.equal(put.status, 200);
      assert.equal(
        (await call("/api/narrator")).json.voice,
        format === "audio/wav" ? "Linh" : hoai,
      );
      const switched = await call(`/api/narration/${id}/audio`);
      assert.equal(switched.status, 200);
      assert.equal(calls.length, format === "audio/wav" ? 1 : 2);
    } finally {
      await temple.close();
    }
  });
}

test("Edge provider selects MP3, escapes SSML, consumes stream and closes", async () => {
  let input = "";
  let selectedVoice = "";
  let format: OUTPUT_FORMAT | undefined;
  let closed = 0;
  const provider = createEdgeProvider(() => ({
    async setMetadata(voice, output) {
      selectedVoice = voice;
      format = output;
    },
    toStream(text) {
      input = text;
      return {
        audioStream: Readable.from([Buffer.from("mp"), Buffer.from("3")]),
        metadataStream: null,
      };
    },
    close() {
      closed++;
    },
  }));
  const bytes = await provider.synthesize(
    `A <tag> & "'`,
    hoai,
    new AbortController().signal,
  );
  assert.equal(bytes.toString(), "mp3");
  assert.equal(selectedVoice, hoai);
  assert.equal(format, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  assert.equal(input, "A &lt;tag&gt; &amp; &quot;&apos;");
  assert.equal(closed, 1);
});

test("Edge provider closes and propagates stream errors", async () => {
  let closed = 0;
  const provider = createEdgeProvider(() => ({
    async setMetadata() {},
    toStream() {
      return {
        audioStream: Readable.from(
          (async function* () {
            throw new Error("stream failure");
          })(),
        ),
        metadataStream: null,
      };
    },
    close() {
      closed++;
    },
  }));
  await assert.rejects(
    provider.synthesize("hello", nam, new AbortController().signal),
    /stream failure/,
  );
  assert.equal(closed, 1);
});

test("Edge connection handshake is cancellable even if client metadata never resolves", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  let closed = 0;
  const provider = createEdgeProvider(() => ({
    async setMetadata() {
      started();
      return new Promise<void>(() => {});
    },
    toStream() {
      throw new Error("must not stream");
    },
    close() {
      closed++;
    },
  }));
  const narrator = new Narrator(provider);
  const result = narrator.audio(announcement);
  const rejected = assert.rejects(result, /aborted/);
  await ready;
  await narrator.close();
  await rejected;
  assert.equal(closed, 1);
});

for (const stuck of ["metadata", "stream"] as const) {
  test(`Edge ${stuck} timeout closes client, frees queue and recovers per voice`, async () => {
    let created = 0;
    let closed = 0;
    const provider = createEdgeProvider(() => {
      const attempt = ++created;
      let stream: Readable | undefined;
      return {
        async setMetadata() {
          if (attempt === 1 && stuck === "metadata")
            return new Promise<void>(() => {});
        },
        toStream() {
          stream =
            attempt === 1 && stuck === "stream"
              ? new Readable({ read() {} })
              : Readable.from([Buffer.from("ok")]);
          return { audioStream: stream, metadataStream: null };
        },
        close() {
          closed++;
          stream?.destroy();
        },
      };
    });
    const narrator = new Narrator(provider, 20);
    try {
      await assert.rejects(
        narrator.audio(announcement, hoai),
        /synthesis-timeout/,
      );
      assert.ok(closed >= 1);
      assert.equal((await narrator.status(hoai)).available, true);
      assert.match((await narrator.status(hoai)).detail, /thất bại.*Internet/);
      assert.doesNotMatch((await narrator.status(nam)).detail, /thất bại/);
      const retry = await narrator.audio(announcement, hoai);
      assert.equal(retry.bytes.toString(), "ok");
      assert.doesNotMatch((await narrator.status(hoai)).detail, /thất bại/);
      assert.equal(created, 2);
    } finally {
      await narrator.close();
    }
  });
}

for (const [name, chunks, error] of [
  ["empty", [], /empty-audio/],
  ["too large", [Buffer.alloc(4 * 1024 * 1024 + 1)], /audio-too-large/],
] as const) {
  test(`Edge rejects ${name} output and closes client`, async () => {
    let closed = 0;
    const provider = createEdgeProvider(() => ({
      async setMetadata() {},
      toStream() {
        return { audioStream: Readable.from(chunks), metadataStream: null };
      },
      close() {
        closed++;
      },
    }));
    await assert.rejects(
      provider.synthesize("test", nam, new AbortController().signal),
      error,
    );
    assert.equal(closed, 1);
  });
}

test("a timed-out Edge request releases an already queued request", async () => {
  let attempt = 0;
  const provider = createEdgeProvider(() => {
    const current = ++attempt;
    return {
      async setMetadata() {
        if (current === 1) return new Promise<void>(() => {});
      },
      toStream() {
        return {
          audioStream: Readable.from([Buffer.from("next")]),
          metadataStream: null,
        };
      },
      close() {},
    };
  });
  const narrator = new Narrator(provider, 20);
  try {
    const first = narrator.audio(announcement);
    const queued = narrator.audio({ ...announcement, id: "next" });
    await assert.rejects(first, /synthesis-timeout/);
    assert.equal((await queued).bytes.toString(), "next");
  } finally {
    await narrator.close();
  }
});

test("Edge retries truncated response from scratch and discards partial audio", async () => {
  let attempts = 0;
  let closed = 0;
  const provider = createEdgeProvider(() => {
    const attempt = ++attempts;
    return {
      async setMetadata() {},
      toStream() {
        const audioStream = Readable.from(
          (async function* () {
            if (attempt < 3) {
              yield Buffer.from("partial");
              throw new Error(
                "Stream closed before the synthesis completed (no turn.end received). The audio is likely truncated.",
              );
            }
            yield Buffer.from("complete");
          })(),
        );
        return { audioStream, metadataStream: null };
      },
      close() {
        closed++;
      },
    };
  });
  assert.equal(
    (
      await provider.synthesize("test", nam, new AbortController().signal)
    ).toString(),
    "complete",
  );
  assert.equal(attempts, 3);
  assert.equal(closed, 3);
});

test("Edge surfaces error after bounded truncated-response retries", async () => {
  let attempts = 0;
  const provider = createEdgeProvider(() => {
    attempts++;
    return {
      async setMetadata() {},
      toStream() {
        return {
          audioStream: Readable.from(
            (async function* () {
              throw new Error("Stream closed before the synthesis completed");
            })(),
          ),
          metadataStream: null,
        };
      },
      close() {},
    };
  });
  await assert.rejects(
    provider.synthesize("test", nam, new AbortController().signal),
    /Stream closed before/,
  );
  assert.equal(attempts, 3);
});

test("cancelled queued work never starts and later request proceeds", async () => {
  const calls: string[] = [];
  let release!: () => void;
  let start!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const provider = fake("audio/mpeg");
  provider.synthesize = async (text) => {
    calls.push(text);
    if (text === "hold") {
      start();
      await gate;
    }
    return Buffer.from(text);
  };
  const narrator = new Narrator(provider);
  try {
    const first = narrator.audio({ ...announcement, text: "hold" });
    await started;
    const controller = new AbortController();
    const cancelled = narrator.audio(
      { ...announcement, id: "cancel", text: "cancel" },
      nam,
      controller.signal,
    );
    const rejected = assert.rejects(cancelled, /aborted/);
    controller.abort();
    const next = narrator.audio({ ...announcement, id: "next", text: "next" });
    release();
    await rejected;
    assert.equal((await first).bytes.toString(), "hold");
    assert.equal((await next).bytes.toString(), "next");
    assert.deepEqual(calls, ["hold", "next"]);
  } finally {
    await narrator.close();
  }
});

test("last interested client aborts active work without marking voice failed", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  let aborted = false;
  const provider = fake("audio/mpeg");
  provider.synthesize = async (_text, _voice, signal) =>
    new Promise((_, reject) => {
      started();
      signal.addEventListener(
        "abort",
        () => {
          aborted = true;
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
  const narrator = new Narrator(provider);
  try {
    const controller = new AbortController();
    const result = narrator.audio(announcement, nam, controller.signal);
    const rejected = assert.rejects(result, /aborted/);
    await ready;
    controller.abort();
    await rejected;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(aborted, true);
    assert.doesNotMatch((await narrator.status(nam)).detail, /thất bại/);
  } finally {
    await narrator.close();
  }
});

test("one subscriber abort does not cancel another sharing synthesis", async () => {
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  let aborted = false;
  const provider = fake("audio/mpeg");
  provider.synthesize = async (_text, _voice, signal) => {
    calls++;
    signal.addEventListener(
      "abort",
      () => {
        aborted = true;
      },
      { once: true },
    );
    started();
    await gate;
    return Buffer.from("ok");
  };
  const narrator = new Narrator(provider);
  try {
    const controller = new AbortController();
    const first = narrator.audio(announcement, nam, controller.signal);
    const rejected = assert.rejects(first, /aborted/);
    const second = narrator.audio(announcement, nam);
    await ready;
    controller.abort();
    await rejected;
    assert.equal(aborted, false);
    release();
    assert.equal((await second).bytes.toString(), "ok");
    assert.equal(calls, 1);
    assert.equal(
      (await narrator.audio(announcement, nam)).bytes.toString(),
      "ok",
    );
    assert.equal(calls, 1);
  } finally {
    await narrator.close();
  }
});

test("HTTP disconnect aborts synthesis when no other client is waiting", async () => {
  let started!: () => void;
  let cancelled!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const aborted = new Promise<void>((resolve) => {
    cancelled = resolve;
  });
  const provider = fake("audio/mpeg");
  provider.synthesize = async (_text, _voice, signal) =>
    new Promise((_, reject) => {
      started();
      signal.addEventListener(
        "abort",
        () => {
          cancelled();
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
  const temple = createTempleApp(
    ":memory:",
    Date.now,
    Math.random,
    new Narrator(provider),
  );
  try {
    temple.engine.ingest({
      id: "f-http",
      type: "follow",
      source: "mock",
      timestamp: Date.now(),
      user: { id: "u", name: "Lan" },
    });
    const id = temple.engine.snapshot().announcements[0].id;
    const [serverSock, clientSock] = createPair();
    temple.server.emit("connection", serverSock);
    const req = http.request({
      path: `/api/narration/${id}/audio`,
      headers: { host: "localhost", connection: "close" },
      createConnection: () => clientSock as any,
    });
    req.on("error", () => {});
    req.end();
    await ready;
    req.destroy();
    await aborted;
  } finally {
    await temple.close();
  }
});
