// polyfill global crypto for Node < 19 (required by @typespec/ts-http-runtime)
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// polyfill node-fetch AbortError (not exported in v2, but jsforce references it at request.js:183)
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
