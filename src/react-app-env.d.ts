/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

/** Short git commit hash injected at build time by Vite. */
declare const __BUILD_COMMIT__: string;
/** Build channel: "production" for release builds, "beta" for build-main CI, "dev" for local. */
declare const __BUILD_CHANNEL__: string;
