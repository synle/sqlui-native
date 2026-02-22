import crypto from "crypto";

// Polyfill globalThis.crypto for packages like @typespec/ts-http-runtime
// that expect the Web Crypto API to be available globally (used by @azure/data-tables).
if (!globalThis.crypto) {
  // @ts-ignore - Node's crypto module is compatible enough for randomUUID
  globalThis.crypto = crypto;
}
