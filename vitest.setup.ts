// polyfill global crypto for Node < 19 (required by @typespec/ts-http-runtime)
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// Keep a compatibility fallback for node-fetch versions that do not export AbortError.
import * as nodeFetch from "node-fetch";
if (!(nodeFetch as any).AbortError) {
  class AbortError extends Error {
    type: string;
    constructor(message: string) {
      super(message);
      this.type = "aborted";
      this.name = "AbortError";
    }
  }
  (nodeFetch as any).AbortError = AbortError;
}
