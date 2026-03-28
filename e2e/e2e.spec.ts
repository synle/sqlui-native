/** End-to-end tests for sqlui-native web app. */
import { test, expect, Page } from "@playwright/test";

/** Increased timeout for app initialization and session selection. */
test.setTimeout(60_000);

/**
 * Handles the session selection that appears on first load when no session exists.
 * Either selects an existing session or creates a new one, then waits for the main app.
 */
async function selectOrCreateSession(page: Page) {
  const createSessionButton = page.getByRole("button", { name: "Create Session", exact: true });
  const appHeader = page.getByText("SQLUI NATIVE", { exact: false }).first();

  // Wait for the app to render something meaningful
  await expect(createSessionButton.or(appHeader).first()).toBeVisible({ timeout: 45_000 });

  if (await createSessionButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    // Check if there's an existing session checkbox to click
    const existingSession = page.locator("role=checkbox").first();
    const hasExisting = await existingSession.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasExisting) {
      await existingSession.click();
    } else {
      const input = page.locator("input[required]");
      await input.fill("E2E Test Session");
      await createSessionButton.click();
    }

    // Selecting a session triggers window.location.reload()
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await expect(appHeader).toBeVisible({ timeout: 30_000 });
  }
}

test.describe("App Launch", () => {
  test("should load the main page", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await expect(page.getByText("SQLUI NATIVE", { exact: false }).first()).toBeVisible();
  });

  test("should display the connection sidebar", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await expect(page.getByRole("group", { name: "Connection" })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("New Connection Page", () => {
  test("should navigate to new connection page", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await page.getByRole("group", { name: "Connection" }).getByRole("button").first().click();
    await expect(page).toHaveURL(/connection/i);
  });

  test("should show dialect options", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await page.getByRole("group", { name: "Connection" }).getByRole("button").first().click();
    await expect(page.getByText("Mysql", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });
});
