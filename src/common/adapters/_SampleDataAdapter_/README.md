# Sample Adapter Template

This directory contains a starter template for creating a new database adapter. These files are **not** used in the application -- they serve as a reference and starting point.

## Files

| File            | Purpose                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| `index.ts`      | Data adapter class -- handles connect, authenticate, query metadata, and execute    |
| `scripts.ts`    | Script generator -- provides pre-built query templates and code snippets for the UI |
| `index.spec.ts` | Test template -- skeleton Jest tests for the adapter                                |
| `mydb.png`      | Dialect icon -- PNG imported in `scripts.ts` and returned from `getDialectIcon()`   |

## Quick Start

1. Copy this entire directory and rename it to match your adapter (e.g., `MyDbDataAdapter/`).
2. Rename all placeholder class names (`SampleDataAdapter`, `ConcreteDataScripts`, `AdapterClient`) to match your adapter.
3. Replace `your_dialect_name` with your dialect identifier (e.g., `mydb`) -- must match what you add to `typings/index.ts`.
4. Implement all `TODO` methods.
5. Register your adapter in the factories -- see `CONTRIBUTING.md` for the full step-by-step guide.
