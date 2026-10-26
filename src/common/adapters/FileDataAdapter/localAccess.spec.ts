import { afterEach, describe, expect, test } from "vitest";
import { configureLocalFileAccess } from "src/common/adapters/FileDataAdapter/localAccess";

const LOCAL_FILE_ACCESS_ENV = "SQLUI_LOCAL_FILE_ADAPTER_ENABLED";
const originalAccessSetting = process.env[LOCAL_FILE_ACCESS_ENV];

afterEach(() => {
  if (originalAccessSetting === undefined) {
    delete process.env[LOCAL_FILE_ACCESS_ENV];
  } else {
    process.env[LOCAL_FILE_ACCESS_ENV] = originalAccessSetting;
  }
});

describe("configureLocalFileAccess", () => {
  test.each(["127.0.0.1", "127.255.2.3", "localhost", "::1", "[::1]"])("enables local reads for loopback host %s", (host) => {
    expect(configureLocalFileAccess(host)).toBe(true);
    expect(process.env[LOCAL_FILE_ACCESS_ENV]).toBe("true");
  });

  test.each(["0.0.0.0", "::", "example.test", "127.0.0.256"])("disables local reads for non-loopback host %s", (host) => {
    expect(configureLocalFileAccess(host)).toBe(false);
    expect(process.env[LOCAL_FILE_ACCESS_ENV]).toBe("false");
  });
});
