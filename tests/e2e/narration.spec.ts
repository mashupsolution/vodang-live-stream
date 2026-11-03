import { test, expect, fixedTime } from "./fixture";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

test.use({
  launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
});

function toneWave() {
  const rate = 22050,
    samples = rate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(
      Math.round(Math.sin((i * 440 * 2 * Math.PI) / rate) * 1200),
      44 + i * 2,
    );
  return wav;
}

test("native Vietnamese narration endpoint returns playable WAV and rejects unknown text", async ({
  request,
  temple,
}) => {
  test.skip(
    process.platform !== "darwin",
    "Native Linh synthesis is a macOS acceptance check.",
  );
  const status = await (await request.get("/api/narrator")).json();
  expect(status.voice).toBe("Linh");
  expect(status.available).toBe(true);
  temple.engine.ingest({
    id: "native-gift",
    type: "gift",
    source: "mock",
    timestamp: fixedTime,
    user: { id: "native", name: "Vân Tiêu" },
    giftId: "mock-linh-thach",
    giftName: "Linh Thạch Hạ Phẩm",
    count: 3,
    streakId: "native",
    final: true,
  });
  const announcement = temple.engine.snapshot().announcements.at(-1)!;
  const response = await request.get(`/api/narration/${announcement.id}.wav`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("audio/wav");
  const bytes = await response.body();
  expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
  expect(bytes.length).toBeGreaterThan(22050);

  // Check non-zero waveform (PCM 16-bit audio samples after 44-byte header)
  let nonzero = false;
  for (let i = 44; i < bytes.length; i += 2) {
    if (bytes.readInt16LE(i) !== 0) {
      nonzero = true;
      break;
    }
  }
  expect(nonzero).toBe(true);

  // Save fresh native Vietnamese Tiên Âm WAV sample
  mkdirSync("docs/qa", { recursive: true });
  writeFileSync("docs/qa/narration-sample.wav", bytes);

  expect(
    (await request.get("/api/narration/not-an-announcement.wav")).status(),
  ).toBeGreaterThanOrEqual(400);
});

test("narrator skips bootstrap, groups streaks, serializes voice and restores music on disable", async ({
  page,
  request,
  temple,
}) => {
  const gift = (id: string, count = 1, final = true, streakId = id) => ({
    id,
    type: "gift" as const,
    source: "mock" as const,
    timestamp: fixedTime,
    user: { id: "voice", name: "Thanh Huyền" },
    giftId: "mock-linh-thach",
    giftName: "Linh Thạch Hạ Phẩm",
    count,
    streakId,
    final,
  });
  temple.engine.ingest(gift("bootstrap"));
  let fetched = 0;
  await page.route("**/api/narration/*/audio", async (route) => {
    fetched++;
    await route.fulfill({ contentType: "audio/wav", body: toneWave() });
  });
  await page.addInitScript(() => {
    const state = {
      starts: 0,
      active: 0,
      peak: 0,
      minMusic: 1,
      music: undefined as GainNode | undefined,
    };
    (window as any).voiceCheck = state;
    const media = AudioContext.prototype.createMediaElementSource;
    AudioContext.prototype.createMediaElementSource = function (element) {
      const node = media.call(this, element),
        connect = node.connect.bind(node);
      node.connect = ((destination: AudioNode) => {
        state.music = destination as GainNode;
        return connect(destination);
      }) as typeof node.connect;
      return node;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      state.starts++;
      state.active++;
      state.peak = Math.max(state.peak, state.active);
      this.addEventListener("ended", () => state.active--, { once: true });
      return start.apply(this, args);
    };
    setInterval(() => {
      if (state.active && state.music)
        state.minMusic = Math.min(state.minMusic, state.music.gain.value);
    }, 20);
  });
  await page.goto("/game");
  await expect(page.locator(".temple-mode")).toContainText("Mô phỏng");
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  await page.waitForTimeout(350);
  expect(fetched).toBe(0);
  await request.post("/api/events", {
    data: gift("partial", 3, false, "group"),
  });
  await page.waitForTimeout(100);
  expect(fetched).toBe(0);
  await request.post("/api/events", { data: gift("final", 3, true, "group") });
  await request.post("/api/events", {
    data: gift("final-again", 3, true, "group"),
  });
  await request.post("/api/events", { data: gift("next") });
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceCheck.starts))
    .toBe(2);
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceCheck.active))
    .toBe(0);
  expect(fetched).toBe(2);
  const stats = await page.evaluate(() => ({
    peak: (window as any).voiceCheck.peak,
    min: (window as any).voiceCheck.minMusic,
  }));
  expect(stats.peak).toBe(1);
  expect(stats.min).toBeLessThan(0.15);
  await request.post("/api/events", { data: gift("disable-during-voice") });
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceCheck.active))
    .toBe(1);
  await request.put("/api/settings", {
    data: { ...temple.engine.snapshot().settings, narratorEnabled: false },
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceCheck.active))
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).voiceCheck.music?.gain.value ?? 0),
    )
    .toBeGreaterThan(0.18);
  await request.post("/api/events", { data: gift("disabled") });
  await page.waitForTimeout(150);
  expect(fetched).toBe(3);
});

test("OBS auto audio handles its first snapshot and the first gift after a session reset", async ({
  page,
  request,
}) => {
  let fetched = 0;
  await page.route("**/api/narration/*/audio", async (route) => {
    fetched++;
    await route.fulfill({ contentType: "audio/wav", body: toneWave() });
  });
  await page.goto("/overlay?audio=1");
  await expect(page.locator(".temple-mode")).toContainText("Mô phỏng");
  await page.waitForTimeout(300);
  const gift = (id: string) => ({
    id,
    type: "gift",
    source: "mock",
    timestamp: fixedTime,
    user: { id: "obs", name: "Lạc Tuyết" },
    giftId: "mock-linh-thach",
    giftName: "Linh Thạch Hạ Phẩm",
    count: 1,
    streakId: id,
    final: true,
  });
  await request.post("/api/events", { data: gift("obs-first") });
  await expect.poll(() => fetched).toBe(1);
  await request.post("/api/session/new");
  await page.waitForTimeout(100);
  await request.post("/api/events", { data: gift("obs-new-session") });
  await expect.poll(() => fetched).toBe(2);
  await page.reload();
  await page.waitForTimeout(350);
  expect(fetched).toBe(2);
});

test("Windows voice selection persists and the common endpoint plays MP3", async ({
  page,
  request,
  temple,
}) => {
  await page.route("**/api/narrator", (route) =>
    route.fulfill({
      json: {
        available: true,
        provider: "edge",
        voice: "vi-VN-NamMinhNeural",
        detail: "Giọng Edge đã cấu hình; cần kết nối Internet để đọc.",
      },
    }),
  );
  // A local, valid MP3 tests browser decoding without contacting the speech service.
  const mp3 = readFileSync("apps/web/public/assets/music.mp3");
  await page.route("**/api/narration/*/audio", (route) =>
    route.fulfill({ contentType: "audio/mpeg", body: mp3 }),
  );
  await page.addInitScript(() => {
    (window as any).mp3Starts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      (window as any).mp3Starts++;
      return start.apply(this, args);
    };
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByLabel("Giọng đọc Windows").selectOption("vi-VN-HoaiMyNeural");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect(page.getByLabel("Giọng đọc Windows")).toHaveValue(
    "vi-VN-HoaiMyNeural",
  );
  await page.goto("/game");
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  await request.post("/api/events", {
    data: {
      id: "mp3-gift",
      type: "gift",
      source: "mock",
      timestamp: fixedTime,
      user: { id: "mp3", name: "Thanh Huyền" },
      giftId: "mock-linh-thach",
      giftName: "Linh Thạch",
      count: 1,
      streakId: "mp3",
      final: true,
    },
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).mp3Starts))
    .toBe(1);
  await request.put("/api/settings", {
    data: { ...temple.engine.snapshot().settings, narratorEnabled: false },
  });
});

test("slow synthesis leaves a full playback window and disable still stops voice", async ({
  page,
  request,
  temple,
}) => {
  await page.clock.install({ time: new Date(fixedTime) });
  const mp3 = readFileSync("apps/web/public/assets/music.mp3");
  let release!: () => void;
  let requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/narration/*/audio", async (route) => {
    requested = true;
    await gate;
    await route.fulfill({ contentType: "audio/mpeg", body: mp3 });
  });
  await page.addInitScript(() => {
    (window as any).delayedVoiceActive = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      (window as any).delayedVoiceActive++;
      this.addEventListener(
        "ended",
        () => (window as any).delayedVoiceActive--,
        { once: true },
      );
      return start.apply(this, args);
    };
  });
  await page.goto("/game");
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  await request.post("/api/events", {
    data: {
      id: "slow-gift",
      type: "gift",
      source: "mock",
      timestamp: fixedTime,
      user: { id: "slow", name: "Vân Tiêu" },
      giftId: "mock-linh-thach",
      giftName: "Linh Thạch",
      count: 1,
      streakId: "slow",
      final: true,
    },
  });
  await expect.poll(() => requested).toBe(true);
  await page.clock.fastForward(14000);
  release();
  await expect
    .poll(() => page.evaluate(() => (window as any).delayedVoiceActive))
    .toBe(1);
  await page.clock.fastForward(2000);
  expect(await page.evaluate(() => (window as any).delayedVoiceActive)).toBe(1);
  await request.put("/api/settings", {
    data: { ...temple.engine.snapshot().settings, narratorEnabled: false },
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).delayedVoiceActive))
    .toBe(0);
});
