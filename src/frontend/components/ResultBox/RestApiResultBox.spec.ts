// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formatBytes } from "src/frontend/components/ResultBox/RestApiResultBox";

describe("formatBytes", () => {
  it("formats bytes under 1 KB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats bytes as KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10240)).toBe("10.0 KB");
  });

  it("formats bytes as MB", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
  });
});
