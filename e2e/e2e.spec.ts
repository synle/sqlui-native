/** End-to-end tests for sqlui-native web app. */
import { test, expect, Page } from "@playwright/test";

/** Increased timeout for app initialization and CI environments. */
test.setTimeout(120_000);

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
const REST_CONNECTION_NAME = `E2E REST ${TEST_ID}`;

/** Counter to generate unique connection names within a single test run. */
let connectionCounter = 0;

/**
 * Navigates to the new connection page by clicking the Connection button.
 */
async function navigateToNewConnection(page: Page) {
  await page.getByRole("group", { name: "Connection" }).getByRole("button").first().click();
  await expect(page).toHaveURL(/connection/i, { timeout: 10_000 });
}

/**
 * Creates a new SQLite connection via the UI.
 * Returns the connection name so callers can reference it.
 */
async function createSqliteConnection(page: Page): Promise<string> {
  connectionCounter++;
  const connName = `${SQLITE_CONNECTION_NAME} ${connectionCounter}`;
  const connString = `sqlite:///tmp/e2e-test-${TEST_ID}-${connectionCounter}.sqlite`;

  await navigateToNewConnection(page);

  // ConnectionHint shows dialect names — click SQLite
  // getDialectName returns "Sqlite", rendered with CSS text-transform: uppercase
  const sqliteLink = page.getByText("Sqlite", { exact: true }).first();
  await expect(sqliteLink).toBeVisible({ timeout: 15_000 });
  await sqliteLink.click();

  // Wait for connection form to render after dialect selection
  const nameField = page.getByRole("textbox", { name: "Name" });
  await expect(nameField).toBeVisible({ timeout: 15_000 });
  await nameField.fill(connName);

  // Switch to Advanced tab to get the raw Connection string field
  await page.getByRole("tab", { name: "Advanced" }).click();
  const connectionField = page.getByRole("textbox", { name: "Connection" });
  await expect(connectionField).toBeVisible({ timeout: 5_000 });
  await connectionField.fill(connString);

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
  await expect(connectionSelect).toBeVisible({ timeout: 10_000 });
  const optionValue = await connectionSelect.locator("option", { hasText: connectionName }).first().getAttribute("value");
  await connectionSelect.selectOption(optionValue!);
}

/**
 * Sets text in the Monaco editor via the Monaco API.
 * Clipboard paste is unreliable in headless CI environments.
 */
async function typeInEditor(page: Page, text: string) {
  const editorContainer = page.locator(".CodeEditorBox__QueryBox .monaco-editor").first();
  await expect(editorContainer).toBeVisible({ timeout: 10_000 });
  await editorContainer.click();
  await page.waitForTimeout(200);

  await page.evaluate((val) => {
    const queryBoxEl = document.querySelector(".CodeEditorBox__QueryBox");
    const allEditors = (window as any).monaco?.editor?.getEditors() || [];
    const editor = allEditors.find((e: any) => {
      try {
        return queryBoxEl?.contains(e.getDomNode());
      } catch {
        return false;
      }
    });
    if (editor) {
      editor.setValue(val);
    }
  }, text);
  await page.waitForTimeout(300);
}

/** Clicks execute and waits for results (SQL queries). */
async function executeQuery(page: Page) {
  await page.locator("#btnExecuteCommand").click();
  await expect(page.getByText("Query took", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
}

/** Clicks execute and waits for REST API response (status code like "200 OK"). */
async function executeRestQuery(page: Page) {
  await page.locator("#btnExecuteCommand").click();
  await expect(page.getByText(/\d{3}\s+\w+/).first()).toBeVisible({ timeout: 30_000 });
}

/**
 * Creates a new REST API connection pointing to httpbin.org.
 * Returns the connection name.
 */
async function createRestApiConnection(page: Page): Promise<string> {
  connectionCounter++;
  const connName = `${REST_CONNECTION_NAME} ${connectionCounter}`;

  await navigateToNewConnection(page);

  // ConnectionHint shows "REST API" from getDialectName
  const restLink = page.getByText("REST API", { exact: true }).first();
  await expect(restLink).toBeVisible({ timeout: 15_000 });
  await restLink.click();

  // Wait for REST API form to render
  const nameField = page.getByRole("textbox", { name: "Name", exact: true });
  await expect(nameField).toBeVisible({ timeout: 15_000 });
  await nameField.fill(connName);

  // HOST field label is "HOST (base URL, used as {{HOST}})" — match with regex
  const hostField = page.getByRole("textbox", { name: /HOST/i });
  await expect(hostField).toBeVisible({ timeout: 5_000 });
  await hostField.clear();
  await hostField.fill("https://httpbin.org");

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.locator(".ConnectionDescription").filter({ hasText: connName }).first()).toBeVisible({
    timeout: 15_000,
  });

  return connName;
}

/**
 * Opens the context menu (DropdownButton) on a tree row via right-click.
 * Right-click on AccordionHeader triggers its onContextMenu which clicks the DropdownButton.
 */
async function openContextMenu(page: Page, rowLocator: ReturnType<Page["locator"]>) {
  await rowLocator.click();
  await page.waitForTimeout(300);
  await rowLocator.click({ button: "right" });
  await page.waitForTimeout(300);
}

/**
 * Deletes a connection via context menu and confirms the dialog.
 */
async function deleteConnection(page: Page, connName: string) {
  const connectionRow = page.locator(".ConnectionDescription").filter({ hasText: connName }).first();
  await openContextMenu(page, connectionRow);

  const deleteItem = page.getByRole("menuitem", { name: "Delete" });
  await expect(deleteItem).toBeVisible({ timeout: 5_000 });
  await deleteItem.click();

  // AlertDialog confirmation uses "Yes" button
  const yesButton = page.getByRole("button", { name: "Yes" });
  await expect(yesButton).toBeVisible({ timeout: 5_000 });
  await yesButton.click();

  await expect(connectionRow).not.toBeVisible({ timeout: 10_000 });
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
    await navigateToNewConnection(page);
    // ConnectionHint renders dialect names from getDialectName()
    await expect(page.getByText("Mysql", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
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
    const queryTabs = page.locator("#QueryBoxTabs > .Tab__Headers [role='tab']:not(:last-child)");
    const tabsBefore = await queryTabs.count();

    // Last tab is the "Add Query" tab
    const addTab = page.getByRole("tab", { name: "Add Query" });
    await addTab.click();

    await expect(queryTabs).toHaveCount(tabsBefore + 1, { timeout: 5_000 });
  });

  test("should switch between query tabs", async ({ page }) => {
    const addTab = page.getByRole("tab", { name: "Add Query" });
    await addTab.click();

    const queryTabs = page.locator("#QueryBoxTabs > .Tab__Headers [role='tab']:not(:last-child)");
    const tabCount = await queryTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    await queryTabs.first().click();
    await queryTabs.nth(1).click();
  });

  test("should rename a query tab", async ({ page }) => {
    const firstTab = page.locator("#QueryBoxTabs .Tab__Headers [role='tab']:not(:last-child)").first();
    await firstTab.click({ button: "right" });

    // Tab context menu uses DropdownMenu with MenuItem components
    await page.getByRole("menuitem", { name: "Rename" }).click();

    // PromptDialog opens — rename uses saveLabel: "Save"
    const newName = `Renamed Tab ${TEST_ID}`;
    const dialogInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await expect(dialogInput).toBeVisible({ timeout: 5_000 });
    await dialogInput.clear();
    await dialogInput.fill(newName);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.locator("#QueryBoxTabs .Tab__Headers [role='tab']").filter({ hasText: newName })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("should close a query tab via context menu", async ({ page }) => {
    const addTab = page.getByRole("tab", { name: "Add Query" });
    await addTab.click();
    await page.waitForTimeout(500);

    const queryTabs = page.locator("#QueryBoxTabs > .Tab__Headers [role='tab']:not(:last-child)");
    const tabsBefore = await queryTabs.count();
    expect(tabsBefore).toBeGreaterThanOrEqual(2);

    await queryTabs.last().click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Close$/ }).click();

    // AlertDialog confirmation uses "Yes" button
    const yesButton = page.getByRole("button", { name: "Yes" });
    await expect(yesButton).toBeVisible({ timeout: 5_000 });
    await yesButton.click();

    await expect(queryTabs).toHaveCount(tabsBefore - 1, { timeout: 10_000 });
  });

  test("should duplicate a query tab", async ({ page }) => {
    const queryTabs = page.locator("#QueryBoxTabs > .Tab__Headers [role='tab']:not(:last-child)");
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
    await openContextMenu(page, connectionRow);

    const editItem = page.getByRole("menuitem", { name: /^Edit$/ });
    await expect(editItem).toBeVisible({ timeout: 5_000 });
    await editItem.click();

    await expect(page).toHaveURL(/connection/i, { timeout: 10_000 });

    // Edit connection form — switch to Advanced tab for raw connection string
    const nameField = page.getByRole("textbox", { name: "Name" });
    await expect(nameField).toBeVisible({ timeout: 10_000 });

    const newName = `Edited SQLite ${TEST_ID}`;
    await nameField.clear();
    await nameField.fill(newName);

    // Ensure Advanced tab is active so connection string is preserved
    await page.getByRole("tab", { name: "Advanced" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator(".ConnectionDescription").filter({ hasText: newName })).toBeVisible({ timeout: 15_000 });
  });
});

// ============================================================
// Phase 6: REST API connection (managed metadata)
// ============================================================
test.describe("Phase 6: REST API", () => {
  test("should create a REST API connection to httpbin", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    await createRestApiConnection(page);
  });

  test("should create a folder and blank request via context menu", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createRestApiConnection(page);

    // Right-click connection to create a new folder
    const connectionRow = page.locator(".ConnectionDescription").filter({ hasText: connName }).first();
    await openContextMenu(page, connectionRow);
    await page.getByRole("menuitem", { name: "New Folder" }).click();

    // PromptDialog for folder name — "Save Changes" button
    const dialogInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await expect(dialogInput).toBeVisible({ timeout: 5_000 });
    await dialogInput.fill("E2E Folder");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Folder should appear in the tree
    const folderRow = page.locator(".DatabaseDescription").filter({ hasText: "E2E Folder" }).first();
    await expect(folderRow).toBeVisible({ timeout: 15_000 });

    // Right-click folder to add a blank request
    await openContextMenu(page, folderRow);
    await page.getByRole("menuitem", { name: "New Blank Request" }).click();

    // The request "New Request" should appear in the tree under the folder
    await expect(page.locator(".TableDescription").filter({ hasText: "New Request" }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should execute a curl GET request against httpbin", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createRestApiConnection(page);

    // Add a fresh query tab to avoid leftover content
    await page.getByRole("tab", { name: "Add Query" }).click();
    await page.waitForTimeout(300);
    await selectConnectionInQueryBox(page, connName);

    await typeInEditor(page, "curl 'https://httpbin.org/get'");
    await executeRestQuery(page);

    await expect(page.getByText("200 OK").first()).toBeVisible({ timeout: 15_000 });
  });

  test("should execute a fetch GET request against httpbin", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createRestApiConnection(page);

    await page.getByRole("tab", { name: "Add Query" }).click();
    await page.waitForTimeout(300);
    await selectConnectionInQueryBox(page, connName);

    await typeInEditor(page, `fetch("https://httpbin.org/get", {\n  "method": "GET",\n  "headers": { "accept": "application/json" }\n});`);
    await executeRestQuery(page);

    await expect(page.getByText("200").first()).toBeVisible({ timeout: 10_000 });
  });

  test("should rename and delete a request", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createRestApiConnection(page);

    // Create folder
    const connectionRow = page.locator(".ConnectionDescription").filter({ hasText: connName }).first();
    await openContextMenu(page, connectionRow);
    await page.getByRole("menuitem", { name: "New Folder" }).click();
    const folderInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await expect(folderInput).toBeVisible({ timeout: 5_000 });
    await folderInput.fill("Rename Test Folder");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Create blank request in folder
    const folderRow = page.locator(".DatabaseDescription").filter({ hasText: "Rename Test Folder" }).first();
    await expect(folderRow).toBeVisible({ timeout: 10_000 });
    await openContextMenu(page, folderRow);
    await page.getByRole("menuitem", { name: "New Blank Request" }).click();

    const requestRow = page.locator(".TableDescription").filter({ hasText: "New Request" }).first();
    await expect(requestRow).toBeVisible({ timeout: 10_000 });

    // Rename the request via "Edit Request" menu item
    await openContextMenu(page, requestRow);
    await page.getByRole("menuitem", { name: "Edit Request" }).click();
    const renameInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await expect(renameInput).toBeVisible({ timeout: 5_000 });
    await renameInput.clear();
    await renameInput.fill("Renamed Request");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.locator(".TableDescription").filter({ hasText: "Renamed Request" }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Delete the request via "Delete Request" menu item
    const renamedRow = page.locator(".TableDescription").filter({ hasText: "Renamed Request" }).first();
    await openContextMenu(page, renamedRow);
    await page.getByRole("menuitem", { name: "Delete Request" }).click();

    // Confirmation dialog uses "Delete" button
    const confirmButton = page.getByRole("button", { name: "Delete" });
    await expect(confirmButton).toBeVisible({ timeout: 5_000 });
    await confirmButton.click();

    await expect(renamedRow).not.toBeVisible({ timeout: 10_000 });
  });

  test("should delete a folder", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createRestApiConnection(page);

    // Create a folder
    const connectionRow = page.locator(".ConnectionDescription").filter({ hasText: connName }).first();
    await openContextMenu(page, connectionRow);
    await page.getByRole("menuitem", { name: "New Folder" }).click();
    const folderInput = page.locator("[role='dialog'] input, .MuiDialog-root input").last();
    await expect(folderInput).toBeVisible({ timeout: 5_000 });
    await folderInput.fill("Delete Test Folder");
    await page.getByRole("button", { name: "Save Changes" }).click();

    const folderRow = page.locator(".DatabaseDescription").filter({ hasText: "Delete Test Folder" }).first();
    await expect(folderRow).toBeVisible({ timeout: 10_000 });

    // Delete the folder via "Delete Folder" menu item
    await openContextMenu(page, folderRow);
    await page.getByRole("menuitem", { name: "Delete Folder" }).click();

    // Confirmation dialog uses "Delete" button
    const confirmButton = page.getByRole("button", { name: "Delete" });
    if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(folderRow).not.toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// Phase 7: Delete connection
// ============================================================
test.describe("Phase 7: Delete Connection", () => {
  test("should delete a connection", async ({ page }) => {
    await page.goto("/");
    await selectOrCreateSession(page);
    const connName = await createSqliteConnection(page);

    // Verify connection exists
    await expect(page.locator(".ConnectionDescription").filter({ hasText: connName }).first()).toBeVisible();

    // Delete it
    await deleteConnection(page, connName);

    // Should no longer be in the sidebar
    await expect(page.locator(".ConnectionDescription").filter({ hasText: connName })).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
