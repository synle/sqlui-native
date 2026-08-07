// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "src/frontend/utils/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("strips script tags from database values", () => {
    const result = sanitizeHtml("<div>hi</div><script>window.__pwned = true;</script>");
    expect(result).toContain("hi");
    expect(result).not.toContain("script");
  });

  it("strips inline event handlers that would execute in the app", () => {
    const result = sanitizeHtml('<img src="x" onerror="window.__pwned = true">');
    expect(result).not.toContain("onerror");
  });

  it("strips javascript: protocol links", () => {
    const result = sanitizeHtml('<a href="javascript:window.__pwned=1">click</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click");
  });

  it("preserves ordinary formatting markup", () => {
    const result = sanitizeHtml("<b>Acme</b> <i>Globex</i><ul><li>Initech</li></ul>");
    expect(result).toContain("<b>Acme</b>");
    expect(result).toContain("<i>Globex</i>");
    expect(result).toContain("<li>Initech</li>");
  });

  it("preserves http and https links", () => {
    const result = sanitizeHtml('<a href="https://example.com">docs</a>');
    expect(result).toContain('href="https://example.com"');
  });

  it("returns an empty string for null and undefined values", () => {
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
  });

  it("leaves plain text untouched", () => {
    expect(sanitizeHtml("no markup here")).toBe("no markup here");
  });
});
