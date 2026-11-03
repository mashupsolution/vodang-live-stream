import { test, expect, seed, fixedTime } from "./fixture";

for (const scenario of [
  { count: 0, width: 1080, height: 1920 },
  { count: 4, width: 390, height: 844 },
  { count: 40, width: 1080, height: 1920 },
  { count: 40, width: 390, height: 844 },
]) {
  test(`upper HUD clears ${scenario.count} disciples at ${scenario.width}px`, async ({
    page,
    temple,
  }) => {
    seed(temple, scenario.count);
    if (scenario.count === 40) {
      for (let i = 0; i < 3; i++)
        temple.engine.ingest({
          id: `layout-gift:${i}`,
          type: "gift",
          source: "mock",
          timestamp: fixedTime,
          user: {
            id: `seed:${i}`,
            name: ["Vân Tiêu", "Thanh Huyền", "Hàn Lập"][i],
          },
          giftId: "mock-linh-thach",
          giftName: "Linh Thạch",
          count: 3 - i,
          streakId: `layout:${i}`,
          final: true,
        });
    }
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    await page.goto("/overlay?capture=1");
    await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
    await page.evaluate(() => document.fonts.ready);
    const stage = (await page.locator(".temple-stage").boundingBox())!;
    const hud = (await page.getByTestId("stream-hud").boundingBox())!;
    expect(
      ((hud.y + hud.height - stage.y) / stage.height) * 1920,
    ).toBeLessThanOrEqual(480);
    expect(hud.x).toBeGreaterThanOrEqual(stage.x);
    expect(hud.x + hud.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
    await expect(
      page.getByRole("progressbar", { name: "Linh khí tông môn" }),
    ).toBeVisible();
    expect(await page.getByRole("button").count()).toBe(0);
    const guide = (await page
      .locator(".stream-comment-guide span")
      .boundingBox())!;
    const information = (await page
      .getByTestId("stream-information")
      .boundingBox())!;
    expect(guide.y + guide.height).toBeLessThanOrEqual(
      information.y + information.height,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/qa/livestream-${scenario.count}-${scenario.width}.png`,
      animations: "disabled",
    });
  });
}

test("breakthrough uses the bounded upper information slot", async ({
  page,
  temple,
}) => {
  seed(temple, 40);
  await page.clock.setFixedTime(new Date(fixedTime));
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/overlay");
  await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
  temple.engine.ingest({
    id: "presentation-gift",
    type: "gift",
    source: "mock",
    timestamp: fixedTime,
    user: { id: "seed:0", name: "Vân Tiêu" },
    giftId: "mock-tien-dan",
    giftName: "Cửu Chuyển Kim Đan",
    count: 1,
    streakId: "presentation",
    final: true,
  });
  await expect(page.locator(".offering-note")).toContainText(
    "Đột phá Ngoại Môn Đệ Tử",
  );
  const slot = (await page.getByTestId("stream-information").boundingBox())!;
  expect(slot.y + slot.height).toBeLessThanOrEqual(480);
  await expect(page.locator(".stream-thanks")).toHaveCount(0);
  await page.screenshot({
    path: "docs/qa/livestream-breakthrough.png",
    animations: "disabled",
  });
});

test("40 persistent nameplates fit the wide scene without row or label collisions", async ({
  page,
  temple,
}) => {
  seed(temple, 40);
  temple.engine.ingest({
    id: "long-name",
    type: "join",
    source: "mock",
    timestamp: fixedTime,
    user: {
      id: "seed:0",
      name: "Nguyễn Thanh Huyền Đạo Hữu Trường Sinh Vô Lượng",
    },
  });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/overlay?capture=1");
  await page.waitForFunction(
    () => window.__TEMPLE_STATS__?.disciples.length === 40,
  );
  await page.evaluate(() => document.fonts.ready);
  const disciples = await page.evaluate(
    () => window.__TEMPLE_STATS__!.disciples,
  );
  expect(disciples[0].text).toContain("…");
  for (let i = 0; i < disciples.length; i++) {
    const current = disciples[i];
    expect(current.text.length).toBeGreaterThan(0);
    expect(current.labelWidth).toBeGreaterThan(0);
    expect(current.labelX).toBeGreaterThanOrEqual(0);
    expect(current.labelX + current.labelWidth).toBeLessThanOrEqual(1080);
    expect(current.labelY + current.labelHeight).toBeLessThanOrEqual(1920);
    for (const other of disciples.slice(i + 1)) {
      const overlaps =
        current.labelX < other.labelX + other.labelWidth &&
        other.labelX < current.labelX + current.labelWidth &&
        current.labelY < other.labelY + other.labelHeight &&
        other.labelY < current.labelY + current.labelHeight;
      expect(overlaps).toBe(false);
      if (other.x === current.x && other.y > current.y) {
        expect(current.labelY + current.labelHeight).toBeLessThanOrEqual(
          other.bodyTop,
        );
      }
    }
  }
  await page.screenshot({
    path: "docs/qa/livestream-names-1080.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/qa/livestream-names-390.png",
    animations: "disabled",
  });
});

test("arrivals settle, reloaded participants stay seated, and likes target their character", async ({
  page,
  temple,
}) => {
  seed(temple, 4);
  await page.goto("/overlay");
  await page.waitForFunction(
    () => window.__TEMPLE_STATS__?.disciples.length === 4,
  );
  expect(
    await page.evaluate(() =>
      window.__TEMPLE_STATS__!.disciples.every((v) => v.phase === "idle"),
    ),
  ).toBe(true);
  const user = { id: "new-arrival", name: "Tô Minh" };
  temple.engine.ingest({
    id: "arrival",
    type: "join",
    source: "mock",
    timestamp: fixedTime,
    user,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__TEMPLE_STATS__!.disciples.find((v) => v.id === "new-arrival")
            ?.phase,
      ),
    )
    .toBe("enter");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__TEMPLE_STATS__!.disciples.find((v) => v.id === "new-arrival")
            ?.phase,
      ),
    )
    .toBe("idle");
  temple.engine.ingest({
    id: "targeted-like",
    type: "like",
    source: "mock",
    timestamp: fixedTime,
    count: 1,
    user,
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__TEMPLE_STATS__!.lastTarget?.userId),
    )
    .toBe(user.id);
  const location = await page.evaluate(() => ({
    target: window.__TEMPLE_STATS__!.lastTarget!,
    visitor: window.__TEMPLE_STATS__!.disciples.find(
      (v) => v.id === "new-arrival",
    )!,
  }));
  expect(location.target.x).toBeCloseTo(location.visitor.x);
  // The sprite breathes by at most 0.7 native pixels around its seat.
  expect(Math.abs(location.target.y - location.visitor.y)).toBeLessThan(1);
  await page.reload();
  await page.waitForFunction(
    () => window.__TEMPLE_STATS__?.disciples.length === 5,
  );
  expect(
    await page.evaluate(() =>
      window.__TEMPLE_STATS__!.disciples.every((v) => v.phase === "idle"),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.__TEMPLE_STATS__!.peakEffects)).toBe(
    0,
  );
  temple.engine.newSession();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__TEMPLE_STATS__!.disciples.every((v) => v.phase === "idle"),
      ),
    )
    .toBe(true);
});

test("reduced motion seats new arrivals immediately", async ({
  page,
  temple,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/overlay");
  await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
  temple.engine.ingest({
    id: "reduced-arrival",
    type: "join",
    source: "mock",
    timestamp: fixedTime,
    user: { id: "reduce", name: "Lạc Tuyết" },
  });
  await page.waitForFunction(
    () => window.__TEMPLE_STATS__?.disciples.length === 1,
  );
  expect(
    await page.evaluate(() => window.__TEMPLE_STATS__!.disciples[0].phase),
  ).toBe("idle");
});

test("fixed board stays visible across temporary action banners and banners expire", async ({
  page,
  temple,
}) => {
  await page.clock.install({ time: new Date(fixedTime) });
  await page.goto("/overlay");
  await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
  await expect(page.locator(".stream-thanks-heading").first()).toContainText(
    "Bảng Công Trạng",
  );
  await expect(page.locator(".gift-guide")).toContainText("Hoa Hồng");
  temple.engine.ingest({
    id: "rotation-action",
    type: "comment",
    source: "mock",
    timestamp: fixedTime,
    user: { id: "rotation", name: "Hàn Lập" },
    text: "!tu",
  });
  await expect(page.locator(".offering-note")).toContainText("Hàn Lập");
  await expect(page.locator(".gift-guide")).toBeVisible();
  await page.clock.fastForward(10000);
  await expect(page.locator(".offering-note")).toHaveCount(0);
  await expect(page.locator(".gift-guide")).toContainText("Hoa Hồng");
});
