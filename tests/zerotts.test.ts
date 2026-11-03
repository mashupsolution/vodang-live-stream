import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Narrator } from "../apps/server/src/narrator.ts";
import {
  createZeroTtsProvider,
  zeroTtsConfigured,
  zeroTtsVoiceId,
} from "../apps/server/src/zerotts.ts";
import type { Announcement } from "../packages/shared/src/index.ts";

const script = join(import.meta.dirname, "fixtures", "fake-zerotts-worker.py");
const announcement = (text: string): Announcement => ({
  id: crypto.randomUUID(),
  at: Date.now(),
  sessionId: "s",
  kind: "gift",
  text,
});

test("voice mapping falls back to Mai Chi for non-ZeroTTS voices", () => {
  assert.equal(zeroTtsVoiceId("vi-VN-NamMinhNeural"), "maichi");
  assert.equal(zeroTtsVoiceId("zerotts-hamy"), "hamy");
});

test("ZeroTTS is opt-in by model, python or ZEROTTS_MODEL_PATH", () => {
  assert.equal(zeroTtsConfigured({ ZEROTTS: "0", ZEROTTS_PYTHON: "x" }), false);
  assert.equal(zeroTtsConfigured({ ZEROTTS_PYTHON: "python3" }), true);
  assert.equal(
    zeroTtsConfigured({ ZEROTTS_DATA_DIR: "/nonexistent-zerotts" }),
    false,
  );
});

test("stale ZEROTTS paths fall back to the native or Edge provider", () => {
  assert.equal(
    zeroTtsConfigured({ ZEROTTS_PYTHON: "/nonexistent-zerotts/bin/python" }),
    false,
  );
  assert.equal(
    zeroTtsConfigured({ ZEROTTS_MODEL_PATH: "/nonexistent-zerotts/model" }),
    false,
  );
  assert.equal(
    zeroTtsConfigured({
      ZEROTTS_PYTHON: "python3",
      ZEROTTS_MODEL_PATH: "/nonexistent-zerotts/model",
    }),
    false,
  );
});

test("provider reads worker results by id and reports worker errors", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "zerotts-test-"));
  const provider = createZeroTtsProvider({
    python: "python3",
    script,
    dataDir,
  });
  const narrator = new Narrator(provider);
  try {
    const status = await narrator.status("zerotts-hamy");
    assert.equal(status.provider, "zerotts");
    const audio = await narrator.audio(
      announcement("xin chào"),
      "zerotts-hamy",
    );
    assert.equal(audio.contentType, "audio/wav");
    assert.match(audio.bytes.toString(), /^WAV:hamy:xin chào$/);
    const fallback = await narrator.audio(
      announcement("tạ ơn"),
      "vi-VN-NamMinhNeural",
    );
    assert.match(fallback.bytes.toString(), /^WAV:maichi:/);
    await assert.rejects(
      narrator.audio(announcement("boom"), "zerotts-maichi"),
      /Filtered/,
    );
  } finally {
    await narrator.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("worker crash is surfaced and the next request restarts it", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "zerotts-test-"));
  const provider = createZeroTtsProvider({
    python: "python3",
    script,
    dataDir,
  });
  const narrator = new Narrator(provider);
  try {
    await narrator.audio(announcement("một"), "zerotts-maichi");
    provider.close();
    await new Promise((r) => setTimeout(r, 200));
    const again = await narrator.audio(announcement("hai"), "zerotts-maichi");
    assert.match(again.bytes.toString(), /hai$/);
  } finally {
    await narrator.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
