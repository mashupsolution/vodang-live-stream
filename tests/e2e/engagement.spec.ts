import { test, expect, seed, fixedTime } from "./fixture";

test("TikTok instructions, gift-only flowers and session boards synchronize and reset", async ({
  page,
  context,
  request,
  temple,
}) => {
  temple.engine.updateSettings({
    ...temple.engine.snapshot().settings,
    cooldownSeconds: 0,
  });
  await page.goto("/admin");
  const overlay = await context.newPage();
  // Keep this scoring/reset test on the gift board. Live rotation has its own
  // clock-controlled coverage and must not race these state assertions.
  await overlay.emulateMedia({ reducedMotion: "reduce" });
  await overlay.goto("/overlay");
  await expect(
    overlay.getByRole("region", { name: "Bảng tri ân", exact: true }),
  ).toBeVisible();
  await expect(overlay.getByText("!tu", { exact: true })).toBeVisible();
  expect(await overlay.getByRole("button").count()).toBe(0);

  const user = { id: "test-helper", name: "Thanh Huyền" };
  const send = async (id: string, text: string) =>
    (
      await request.post("/api/events", {
        data: {
          id,
          type: "comment",
          source: "mock",
          timestamp: fixedTime,
          user,
          text,
        },
      })
    ).json();

  // Free !phapbao requires gift, without adding points or triggering cooldown
  expect((await send("phapbao-command", "!phapbao")).result).toBe(
    "gift-required",
  );
  await expect(overlay.getByTestId("progress-value")).toHaveText("0 / 100");

  // !tu ("meditate") adds 1 progress and records participation
  expect((await send("meditate-command", "!tu")).result).toBe("meditate");
  await expect(overlay.getByTestId("progress-value")).toHaveText("1 / 100");
  await expect(
    page
      .locator(".admin-thanks-columns")
      .getByText("Thanh Huyền", { exact: true }),
  ).toBeVisible();

  // mock-linh-thach gift via admin adds 10 progress
  await page.getByLabel("Tên khách", { exact: true }).fill("Vân Tiêu");
  await page.getByRole("button", { name: "Gửi quà", exact: true }).click();
  await expect(overlay.locator(".stream-thanks")).toContainText("Vân Tiêu");
  await expect(overlay.getByTestId("progress-value")).toHaveText("11 / 100");
  await overlay.reload();
  await expect(overlay.locator(".stream-thanks")).toContainText("Vân Tiêu");

  // mock-tien-dan (intensity 2, 25 points -> 75 tuVi) gives instant Hộ Pháp breakthrough
  const tierUser = { id: "ho-phap-cultivator", name: "Bạch Tiểu Thuần" };
  await request.post("/api/events", {
    data: {
      id: "tien-dan-gift",
      type: "gift",
      source: "mock",
      timestamp: fixedTime,
      user: tierUser,
      giftId: "mock-tien-dan",
      giftName: "Cửu Chuyển Kim Đan",
      count: 1,
      streakId: "ho-phap-streak",
      final: true,
    },
  });
  // 75 tuVi reaches Ngoại Môn Đệ Tử (min 35 tuVi)
  const stateWithBreakthrough = await (await request.get("/api/state")).json();
  expect(
    stateWithBreakthrough.realms.some(
      (c: any) =>
        c.userName === "Bạch Tiểu Thuần" && c.realmName === "Ngoại Môn Đệ Tử",
    ),
  ).toBe(true);
  await expect(overlay.getByTestId("progress-value")).toHaveText("36 / 100");

  // Session reset clears session boards while preserving total progress and cultivator realms
  await page
    .getByRole("button", { name: "Bắt đầu phiên mới", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận phiên mới", exact: true })
    .click();
  await expect(overlay.locator(".stream-thanks")).toContainText(
    "Chưa có lượt ghi nhận",
  );
  await expect(overlay.getByTestId("progress-value")).toHaveText("36 / 100");

  const stateAfterReset = await (await request.get("/api/state")).json();
  expect(stateAfterReset.progress).toBe(36);
  expect(
    stateAfterReset.realms.some(
      (c: any) =>
        c.userName === "Bạch Tiểu Thuần" && c.realmName === "Ngoại Môn Đệ Tử",
    ),
  ).toBe(true);

  // Navigate to game view: verify sound control and zero operator buttons
  await page.goto("/game");
  await expect(
    page.getByRole("button", { name: "Luyện quyền", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bật âm thanh", exact: true }),
  ).toBeVisible();
});

test("engagement layout fits native portrait and mobile admin", async ({
  page,
  temple,
}) => {
  seed(temple, 40);
  const xianxiaDisciples = [
    "Vân Tiêu",
    "Thanh Huyền",
    "Hàn Lập",
    "Lăng Phong",
    "Lạc Tuyết",
  ];
  for (let i = 0; i < 5; i++) {
    const user = {
      id: `board:${i}`,
      name: xianxiaDisciples[i],
    };
    temple.engine.ingest({
      id: `board-free:${i}`,
      timestamp: fixedTime,
      type: "comment",
      source: "mock",
      user,
      text: "!tu",
    });
    temple.engine.ingest({
      id: `board-gift:${i}`,
      timestamp: fixedTime,
      type: "gift",
      source: "mock",
      user,
      giftId: "mock-linh-thach",
      giftName: "Linh Thạch Hạ Phẩm",
      count: 5 - i,
      streakId: `board:${i}`,
      final: true,
    });
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/overlay?capture=1");
  await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".stream-thanks .thanks-list li")).toHaveCount(3);
  await expect(page.locator(".stream-thanks")).toContainText("Hàn Lập");
  await expect(page.locator(".stream-thanks")).not.toContainText("Lạc Tuyết");
  await page.screenshot({
    path: "docs/qa/engagement-portrait.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin?capture=1");
  await page.waitForFunction(() => window.__TEMPLE_STATS__?.ready);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/qa/engagement-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
