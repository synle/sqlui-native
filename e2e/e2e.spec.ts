/** End-to-end tests for sqlui-native web app. */
import { test, expect } from "@playwright/test";

test.describe("App Launch", () => {
  test("should load the main page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/sqlui/i);
  });

  test("should display the connection sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=New Connection")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("New Connection Page", () => {
  test("should navigate to new connection page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=New Connection");
    await expect(page).toHaveURL(/connection/i);
  });

  test("should show dialect options", async ({ page }) => {
    await page.goto("/");
    await page.click("text=New Connection");
    // Verify at least one dialect option is visible
    await expect(page.locator("text=MySQL")).toBeVisible({ timeout: 10_000 });
  });
});
