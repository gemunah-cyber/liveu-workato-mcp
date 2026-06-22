# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single, self-contained **read-only MCP server** (stdio transport) for the
Workato Developer API. There is one service and no database/web frontend.

### Services

- **workato-mcp** (`src/index.ts` → `dist/index.js`): an MCP server that exposes 7
  read-only Workato tools (`workato_list_recipes`, `workato_get_recipe`,
  `workato_list_folders`, `workato_list_projects`, `workato_list_recipe_jobs`,
  `workato_search_recipes`, `workato_get_connections`). It speaks JSON-RPC over **stdio**,
  not HTTP — there is no port to open and nothing to load in a browser.

### Run / build / test (commands live in `package.json`)

- Build: `npm run build` (tsc). Note: `npm install` already triggers a build via the
  `prepare` hook, so `dist/` is populated right after install.
- Dev (no build, ts directly): `npm run dev` (tsx).
- Start (built): `npm start`.
- Lint: none configured. Tests: no test framework is configured in this repo.

### Non-obvious caveats

- The server **exits immediately with code 1 unless `WORKATO_API_TOKEN` is set** (see the
  guard at the top of `src/index.ts`). For local smoke tests you can use any non-empty
  dummy value; tool calls will then reach the real Workato API and return `401` until a
  real token is provided. `tools/list` and the MCP handshake work fine with a dummy token.
- Because it's stdio-based, "running" it means launching it under an MCP client. To verify
  it works without a client, run `node scripts/mcp_smoke_test.mjs` — it spawns the server,
  lists tools, and makes one tool call.
- Real credentials go in `.env` (copy from `.env.example`); `.env` is gitignored. In
  Cursor Cloud, `WORKATO_API_TOKEN` is injected as an environment variable (configured as
  a Cursor secret) and is read directly via `process.env` — no `.env` file is needed. Note
  secrets are injected into newly started VMs, so a token added mid-session only takes
  effect on the next VM startup.
- `scripts/export_central_urls.mjs` is an ad-hoc research script that depends on `exceljs`
  (NOT in `package.json`) and a real token; it is not part of the server runtime.
