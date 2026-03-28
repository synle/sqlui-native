/** End-to-end tests for sqlui-native web app. */
import { test, expect, Page } from "@playwright/test";

/** Increased timeout for app initialization and session selection. */
test.setTimeout(60_000);

/**
 * Handles the session selection that appears on first load when no session exists.
 * Either selects an existing session or creates a new one, then waits for the main app.
 */
async function selectOrCreateSession(page: Page) {
  // The Connection ButtonGroup only appears in the main app, never on the session select page
  const mainAppIndicator = page.getByRole("group", { name: "Connection" });
  // The welcome banner appears on the session select page even while sessions are loading
  const welcomeBanner = page.getByText("Welcome to SQLUI Native", { exact: false });

  // Wait for either the session selection page or the main app to appear
  await expect(welcomeBanner.or(mainAppIndicator).first()).toBeVisible({ timeout: 45_000 });

  // If the main app is already showing, session is already selected
  if (await mainAppIndicator.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  // We're on the session selection screen — wait for the session list to finish loading
  const sessionPrompt = page.getByText("Please select a session from below:");
  await expect(sessionPrompt).toBeVisible({ timeout: 30_000 });

  // Check for existing sessions - they appear as checkboxes
  const existingSession = page.getByRole("checkbox").first();
  const hasExisting = await existingSession.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasExisting) {
    // Clicking the checkbox selects the session and triggers reload
    await existingSession.click();
  } else {
    // No existing sessions — create a new one
    const input = page.locator("input[required]");
    await input.fill(`E2E Session ${Date.now()}`);
    await page.getByRole("button", { name: "Create Session" }).click();
  }

  // Session selection triggers window.location.reload() — wait for the main app
  await expect(mainAppIndicator).toBeVisible({ timeout: 45_000 });
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
