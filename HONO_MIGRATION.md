# Hono Migration

The sqlui-server (Tauri sidecar + portal bundle + browser dev server) moved from
Express to [Hono](https://hono.dev/) plus `@hono/node-server`. This note records
why, what changed, and what risks were accepted.

## Why Hono

After comparing Express 4, Fastify, Express 5, and Hono:

- **Bundle size.** Hono is roughly 25–40 KB minified versus Express ~80 KB and
  Fastify ~120 KB. For the portal bundle (a single shipped `.js` file), the
  modest savings are real but not dramatic.
- **Zero transitive dependencies.** Hono ships with none; Express pulls in 30+.
  Smaller dep graph means fewer surface-area issues to audit.
- **Modernisation.** Native TypeScript, idiomatic context API, and future
  compatibility with edge runtimes if we ever want to target them.

### Performance is not the reason

This is a SQL/NoSQL client. Every endpoint waits on a database driver round-trip
that takes 20–500 ms. HTTP framework overhead is microseconds. Anyone telling
you Hono is "10x faster" is benchmarking hello-world JSON — that gap is invisible
under real workloads. We did not migrate for throughput.

## What changed

### Dependencies

Removed (devDependencies): `express`, `body-parser`, `multer`, `supertest`,
`@types/supertest`.

Added (dependencies, because the sidecar imports them at runtime in both the
bundled and the unbundled standalone server build): `hono`, `@hono/node-server`.

### Files rewritten

- `src/sqlui-server/server.ts` — Hono app instance, `hono/cors` middleware,
  `c.req.parseBody()` for `POST /api/file`, and `mountStaticAssets()` now uses
  `@hono/node-server/serve-static` plus an `app.get("*")` SPA fallback that
  skips `/api/`.
- `src/common/Endpoints.ts` — The ~55 endpoint handlers keep their original
  `(req, res, cache)` shape. A small `buildReqRes(c, body)` adapter materialises
  the buffered response into a Hono `Response` at the end of each request. This
  keeps the diff scoped to the wrapper rather than touching every handler.
- `src/sqlui-server/index.ts` and `src/sqlui-server/portal.ts` — `app.listen()`
  swapped for `serve({ fetch: app.fetch, port, hostname }, cb)` from
  `@hono/node-server`. The sidecar entry still prints the `__SIDECAR_PORT__=`
  marker the Tauri Rust host parses, and the portal still falls back to a
  random port on `EADDRINUSE`. SIGINT/SIGTERM graceful shutdown is preserved on
  the http.Server that `serve()` returns.
- `src/sqlui-server/server.spec.ts` — Replaced supertest with a small fluent
  wrapper around `app.request(path, init)`. Every test case and every assertion
  is preserved.

### Ergonomic differences

The handlers still see Express-shaped `req`/`res` because of the adapter, but
new endpoints can be written against the Hono `Context` directly. Notable
mappings (kept centralised in `addDataEndpoint`):

| Express                             | Hono                               |
| ----------------------------------- | ---------------------------------- |
| `req.params.foo`                    | `c.req.param('foo')`               |
| `req.query.q`                       | `c.req.query('q')`                 |
| `req.headers['x-name']`             | `c.req.header('x-name')`           |
| `req.body` (sync after body-parser) | `await c.req.json()` / `parseBody` |
| `res.status(n).json(obj)`           | `c.json(obj, n)`                   |
| `res.send(buffer)`                  | `c.body(buffer, n)`                |
| `res.setHeader('x', 'y')`           | `c.header('x', 'y')`               |

## Risks accepted

- **Wrapper complexity vs handler churn.** The adapter shim adds one indirection
  but means handler code stayed untouched. A future cleanup could migrate
  handlers to call `c` directly; not done in this PR to keep the diff
  reviewable.
- **Smaller ecosystem.** Hono has fewer community middlewares than Express.
  Everything we used (`cors`, static serving) ships in core or in
  `@hono/node-server`.
- **File-upload semantics differ.** `multer` wrote uploads to a temp file on
  disk; `parseBody` reads them into memory. For the single `POST /api/file`
  endpoint (which reads the uploaded file as utf-8 text anyway) this is fine
  and arguably better — no tmp file to clean up.

## Verification

CI gates passed (lint, typecheck, test-ci, frontend build, sidecar build,
portal build), plus manual smoke tests:

- `node build/sqlui-server.js` and `curl http://127.0.0.1:3001/api/health` →
  JSON ok.
- `SIDECAR_PORT=0 node build/sqlui-server.js` prints `__SIDECAR_PORT__=<n>`.
- `node dist/portal/sqlui-portal.js --port 19999 --no-open` and
  `curl http://127.0.0.1:19999/` returns the index.html with the
  `__SQLUI_PORTAL_SESSION__` bootstrap script injected.

## Future-facing

Hono compiles to Web Standards `fetch`. If we ever want to deploy the server to
Cloudflare Workers, Vercel Edge, Deno Deploy, or Bun, the framework cost is
zero — only the adapters change. The database drivers are still
Node-API-bound, so this is hypothetical, but it is no longer the framework
that blocks the move.
