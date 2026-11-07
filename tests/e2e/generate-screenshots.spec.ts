import { test, expect, seed, fixedTime } from "./fixture";

test("capture game screenshot", async ({ page, temple }) => {
  seed(temple, 40);
  for (let i = 0; i < 3; i++) {
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
      giftName: "Lệnh Bài Võ Đang",
      count: 3 - i,
      streakId: `layout:${i}`,
      final: true,
    });
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/overlay?capture=1");
  await page.waitForFunction(() => (window as any).__TEMPLE_STATS__?.ready);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "screenshots/game.png",
    animations: "disabled",
  });
});

test("capture admin dashboard screenshot", async ({ page, temple }) => {
  seed(temple, 40);
  for (let i = 0; i < 3; i++) {
    temple.engine.ingest({
      id: `admin-gift:${i}`,
      type: "gift",
      source: "mock",
      timestamp: fixedTime,
      user: {
        id: `seed:${i}`,
        name: ["Vân Tiêu", "Thanh Huyền", "Hàn Lập"][i],
      },
      giftId: "mock-tien-dan",
      giftName: "Thái Cực Bát Quái Bàn",
      count: 5 - i,
      streakId: `admin:${i}`,
      final: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/admin?capture=1");
  await page.waitForFunction(() => (window as any).__TEMPLE_STATS__?.ready);
  await page.evaluate(() => document.fonts.ready);
  await page.getByLabel("Tên khách", { exact: true }).fill("Vân Tiêu");
  await page.screenshot({
    path: "screenshots/admin-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("capture admin settings screenshot", async ({ page, temple }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/admin?capture=1");
  await page.waitForFunction(() => (window as any).__TEMPLE_STATS__?.ready);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.screenshot({
    path: "screenshots/admin-setting.png",
    fullPage: true,
    animations: "disabled",
  });
});
