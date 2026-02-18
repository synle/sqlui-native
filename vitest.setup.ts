// polyfill global crypto for Node < 19 (required by @typespec/ts-http-runtime)
import { webcrypto } from "crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
