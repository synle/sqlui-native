# sqlui-native

A minimal native desktop SQL client built on Tauri 2 with a React 19 + Vite frontend and a Hono-based Node sidecar server. Supports MySQL, MariaDB, MS SQL Server, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Cosmos DB, Azure Tables, and Salesforce.

## Quick Start

Install dependencies:

```bash
npm ci || npm install --no-fund --prefer-offline
```

Run the desktop app (Tauri dev):

```bash
npm start
```

Run the web frontend + sidecar server in dev mode:

```bash
npm run dev
```

Build a production desktop bundle:

```bash
npm run dist
```
