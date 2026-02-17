// polyfill global crypto for Node < 19 (required by @typespec/ts-http-runtime)
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// set timeout for tests...
jest.setTimeout(10000);
