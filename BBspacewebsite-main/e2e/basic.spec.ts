import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/KBAI Terminal/);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("text=KBAI Terminal")).toBeVisible();
});
