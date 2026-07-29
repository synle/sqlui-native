/**
 * Smoke test for the GitHub Pages download page.
 * Verifies that all download links on https://synle.github.io/sqlui-native/ resolve
 * to valid URLs (no 4xx/5xx errors). Uses HEAD requests to avoid downloading full binaries.
 */
import { test, expect } from "@playwright/test";

const GITHUB_PAGES_URL = "https://synle.github.io/sqlui-native/";

test.describe("Phase 0 — GitHub Pages download links", () => {
  test("all download links on the page are reachable", async ({ page }) => {
    const response = await page.goto(GITHUB_PAGES_URL, { waitUntil: "networkidle" });

    // If the GitHub Pages site itself doesn't exist yet (404), skip the
    // assertion. This happens on fresh repos before the first official
    // release has deployed Pages — the page can't be checked because it
    // hasn't been published. Without this short-circuit, the release
    // pipeline is blocked by a chicken-and-egg loop (Pages is deployed
    // by the release workflow, but the test runs before the deploy).
    const status = response?.status() ?? 0;
    if (status === 404) {
      console.warn(
        `Skipping assertion: GitHub Pages site not deployed yet (HTTP 404 from ${GITHUB_PAGES_URL})`,
      );
      return;
    }

    // Wait for the JS to populate download buttons (fetches from GitHub API)
    await page.waitForSelector("#download-buttons-container a.btn", { timeout: 15_000 });

    // Collect only download links (GitHub release URLs) and the Other Releases link
    const links = await page.$$eval("#download-buttons-container a[href]", (anchors) =>
      anchors.map((a) => ({ href: a.getAttribute("href")!, text: a.textContent?.trim() || "" })),
    );

    expect(links.length).toBeGreaterThan(0);
    console.log(`Found ${links.length} download links to check`);

    const failures: { href: string; text: string; status: number }[] = [];

    for (const link of links) {
      try {
        const response = await page.request.head(link.href, {
          maxRedirects: 5,
          timeout: 15_000,
        });
        const status = response.status();
        if (status >= 400) {
          failures.push({ ...link, status });
        }
      } catch (err: any) {
        failures.push({ ...link, status: 0 });
      }
    }

    if (failures.length > 0) {
      const report = failures.map((f) => `  [${f.status}] ${f.text} → ${f.href}`).join("\n");
      console.error(`Broken download links:\n${report}`);
    }

    // When all release binary links (those pointing to /releases/download/) return 404,
    // the release binaries haven't been uploaded yet (pre-release). This is expected and
    // should not fail the build — only fail when some binary links work and others don't.
    const binaryFailures = failures.filter((f) => f.href.includes("/releases/download/"));
    const binaryLinks = links.filter((l) => l.href.includes("/releases/download/"));
    const allBinariesMissing =
      binaryFailures.length > 0 &&
      binaryFailures.length === binaryLinks.length &&
      binaryFailures.every((f) => f.status === 404);
    if (allBinariesMissing) {
      console.warn(
        `Skipping assertion: all ${binaryLinks.length} binary download links returned 404 (pre-release — binaries not yet uploaded)`,
      );
      // Still check non-binary links (e.g., "Other Releases", npm)
      const nonBinaryFailures = failures.filter((f) => !f.href.includes("/releases/download/"));
      expect(
        nonBinaryFailures,
        `Found ${nonBinaryFailures.length} broken non-binary links`,
      ).toHaveLength(0);
      return;
    }

    expect(failures, `Found ${failures.length} broken download links`).toHaveLength(0);
  });
});
