/** End-to-end tests for sqlui-native web app. */
import { test, expect, Page } from "@playwright/test";

/** Increased timeout for app initialization and session selection. */
test.setTimeout(60_000);

/**
 * Handles the session selection that appears on first load when no session exists.
 * Either selects an existing session or creates a new one, then waits for the main app.
 */
async function selectOrCreateSession(page: Page) {
  const mainAppIndicator = page.getByRole("group", { name: "Connection" });
  const welcomeBanner = page.getByText("Welcome to SQLUI Native", { exact: false });

  await expect(welcomeBanner.or(mainAppIndicator).first()).toBeVisible({ timeout: 45_000 });

  if (await mainAppIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  // Wait for session form to finish loading — the first API call can be slow
  const newSessionInput = page.getByLabel("New Session Name");
  const checkboxEl = page.getByRole("checkbox").first();
  await expect(newSessionInput.or(checkboxEl).first()).toBeVisible({ timeout: 45_000 });

  const hasExisting = await checkboxEl.isVisible({ timeout: 3_000 }).catch(() => false);
  if (hasExisting) {
    await checkboxEl.click();
  } else {
    await page.getByRole("button", { name: "Create Session" }).click();
  }

  await expect(mainAppIndicator).toBeVisible({ timeout: 45_000 });
}

/** Unique suffix to avoid collisions between test runs. */
const TEST_ID = Date.now();
const SQLITE_CONNECTION_NAME = `E2E SQLite ${TEST_ID}`;
const SQLITE_CONNECTION_STRING = `sqlite:///tmp/e2e-test-${TEST_ID}.sqlite`;

/** Counter to generate unique connection names within a single test run. */
let connectionCounter = 0;

/**
 * Creates a new SQLite connection via the UI.
 * Returns the connection name so callers can reference it.
 */
async function createSqliteConnection(page: Page): Promise<string> {
  connectionCounter++;
  const connName = `${SQLITE_CONNECTION_NAME} ${connectionCounter}`;
  const connString = `sqlite:///tmp/e2e-test-${TEST_ID}-${connectionCounter}.sqlite`;

  await page.getByRole("group", { name: "Connection" }).getByRole("button").first().click();
  await expect(page).toHaveURL(/connection/i);

  await page.getByText("Sqlite", { exact: true }).click();

  await page.getByRole("textbox", { name: "Name" }).fill(connName);
  await page.getByRole("textbox", { name: "Connection" }).fill(connString);

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.locator(".ConnectionDescription").filter({ hasText: connName }).first()).toBeVisible({
    timeout: 15_000,
  });

  return connName;
}

/**
 * Selects a connection in the QueryBox Connection dropdown.
 */
async function selectConnectionInQueryBox(page: Page, connectionName: string) {
  const connectionSelect = page.locator("[data-testid='query-connection-select']");
  const optionValue = await connectionSelect.locator("option", { hasText: connectionName }).first().getAttribute("value");
  await connectionSelect.selectOption(optionValue!);
}

/**
 * Sets text in the Monaco editor via clipboard paste.
 */
async function typeInEditor(page: Page, text: string) {
  const editorContainer = page.locator(".CodeEditorBox__QueryBox .monaco-editor").first();
  await editorContainer.click();

  const textarea = page.locator(".CodeEditorBox__QueryBox .monaco-editor textarea");
  await textarea.focus();

  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+A`);
  await page.keyboard.press("Backspace");

  await page.evaluate((val) => navigator.clipboard.writeText(val), text);
  await page.keyboard.press(`${modifier}+V`);
  await page.waitForTimeout(300);
}

/** Clicks execute and waits for results. */
async function executeQuery(page: Page) {
  await page.locator("#btnExecuteCommand").click();
  // Wait for "Query took" text which appears for all successful queries
  await expect(page.getByText("Query took", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
}

// ============================================================
// Phase 1: Basic app loading
// ============================================================
test.describe("Phase 1: App Launch", () => {
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

// ============================================================
// Phase 2: Connection CRUD with SQLite
// ============================================================
test.describe("Phase 2: SQLite Connection CRUD", () => {
  test("should create a new SQLite connection", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await createSqliteConnection(page);
  });

  test("should show dialect options on new connection page", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await page.getByRole("group", { name: "Connection" }).getByRole("button").first().click();
    await expect(page.getByText("Mysql", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Sqlite", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Postgres", { exact: true }).first()).toBeVisible();
  });
});

// ============================================================
// Phase 3: Query execution (create DB objects, insert, select)
// ============================================================
test.describe("Phase 3: Query Execution", () => {
  test("should create a table and insert data", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createSqliteConnection(page);
    await selectConnectionInQueryBox(page, connName);
    await typeInEditor(page, "CREATE TABLE e2e_users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);");
    await executeQuery(page);
  });

  test("should insert and select data", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createSqliteConnection(page);
    await selectConnectionInQueryBox(page, connName);

    await typeInEditor(page, "CREATE TABLE e2e_items (id INTEGER PRIMARY KEY, title TEXT, qty INTEGER);");
    await executeQuery(page);

    await typeInEditor(
      page,
      `INSERT INTO e2e_items (title, qty) VALUES ('Acme Widget', 10), ('Globex Gadget', 25), ('Initech Device', 5);`,
    );
    await executeQuery(page);

    await typeInEditor(page, "SELECT * FROM e2e_items ORDER BY id;");
    await executeQuery(page);

    await expect(page.getByText("Acme Widget").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Globex Gadget").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Initech Device").first()).toBeVisible({ timeout: 5_000 });
  });

  test("should select with WHERE clause", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createSqliteConnection(page);
    await selectConnectionInQueryBox(page, connName);

    await typeInEditor(page, "CREATE TABLE e2e_products (id INTEGER PRIMARY KEY, name TEXT, price REAL);");
    await executeQuery(page);
    await typeInEditor(page, `INSERT INTO e2e_products (name, price) VALUES ('Alpha', 9.99), ('Beta', 19.99), ('Gamma', 29.99);`);
    await executeQuery(page);

    await typeInEditor(page, "SELECT * FROM e2e_products WHERE price > 15;");
    await executeQuery(page);

    await expect(page.getByText("Beta").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Gamma").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ============================================================
// Phase 4: Query tab management
// ============================================================
test.describe("Phase 4: Query Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
  });

  test("should add a new query tab", async ({ page }) => {
    const queryTabs = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)");
    const tabsBefore = await queryTabs.count();

    const addTab = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:last-child");
    await addTab.click();

    await expect(queryTabs).toHaveCount(tabsBefore + 1, { timeout: 5_000 });
  });

  test("should switch between query tabs", async ({ page }) => {
    const addTab = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:last-child");
    await addTab.click();

    const queryTabs = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)");
    const tabCount = await queryTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    await queryTabs.first().click();
    await queryTabs.nth(1).click();
  });

  test("should rename a query tab", async ({ page }) => {
    const firstTab = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)").first();
    await firstTab.click({ button: "right" });

    await page.getByRole("menuitem", { name: "Rename" }).click();

    const newName = `Renamed Tab ${TEST_ID}`;
    const dialogInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await dialogInput.clear();
    await dialogInput.fill(newName);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("#QueryBoxTabs .Tab__Headers [role='tab']").filter({ hasText: newName })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("should close a query tab via context menu", async ({ page }) => {
    const addTab = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:last-child");
    await addTab.click();
    await page.waitForTimeout(500);

    const queryTabs = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)");
    const tabsBefore = await queryTabs.count();
    expect(tabsBefore).toBeGreaterThanOrEqual(2);

    await queryTabs.last().click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Close$/ }).click();

    // Confirm the deletion dialog
    const yesButton = page.getByRole("button", { name: "Yes" });
    await expect(yesButton).toBeVisible({ timeout: 5_000 });
    await yesButton.click();

    await expect(queryTabs).toHaveCount(tabsBefore - 1, { timeout: 10_000 });
  });

  test("should duplicate a query tab", async ({ page }) => {
    const queryTabs = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)");
    const tabsBefore = await queryTabs.count();

    await queryTabs.first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Duplicate" }).click();

    await expect(queryTabs).toHaveCount(tabsBefore + 1, { timeout: 5_000 });
  });
});

// ============================================================
// Phase 5: Edit connection
// ============================================================
test.describe("Phase 5: Edit Connection", () => {
  test("should edit a connection name", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createSqliteConnection(page);

    const connectionRow = page.locator(".ConnectionDescription").filter({ hasText: connName }).first();
    await connectionRow.click();
    await connectionRow.click({ button: "right" });

    const editItem = page.getByRole("menuitem", { name: /Edit/i });
    await expect(editItem).toBeVisible({ timeout: 5_000 });
    await editItem.click();

    await expect(page).toHaveURL(/connection/i, { timeout: 10_000 });

    const newName = `Edited SQLite ${TEST_ID}`;
    const nameField = page.getByRole("textbox", { name: "Name" });
    await nameField.clear();
    await nameField.fill(newName);

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator(".ConnectionDescription").filter({ hasText: newName })).toBeVisible({ timeout: 15_000 });
  });
});
