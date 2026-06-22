# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single Node.js/TypeScript product: **Workato MCP**, a read-only
[Model Context Protocol](https://modelcontextprotocol.io) server that proxies the
Workato Developer API. There is no database, no GUI, and no co-running services.

### Services / commands

There is one process. Standard scripts live in `package.json`:

- Build: `npm run build` (`tsc` → `dist/`)
- Dev (run TS directly): `npm run dev` (`tsx src/index.ts`)
- Start (run compiled): `npm start` (`node dist/index.js`)
- Lint / typecheck: there is no dedicated lint script; use `npx tsc --noEmit`.
- Tests: there is no automated test suite.

### Non-obvious caveats

- This is a **stdio** MCP server, not an HTTP/web app. When started it blocks
  waiting for JSON-RPC on stdin and prints `workato-recipes MCP server running on
  stdio` to **stderr** — that line is normal output, not an error. It will not
  open a port or a browser page.
- `WORKATO_API_TOKEN` is **required**. If it is unset the process prints
  `WORKATO_API_TOKEN is required` and exits immediately (`src/index.ts`). In Cursor
  Cloud it is provided as an environment variable (Secrets); locally it can come
  from a `.env` file (see `.env.example`). `WORKATO_API_BASE_URL` is optional and
  defaults to `https://www.workato.com/api`.
- All 7 tools make **live** calls to the Workato cloud API, so exercising them
  requires outbound internet plus a valid token. A successful call to a workspace
  with no data returns `[]` (not an error); auth failures surface as
  `Workato API 401: ...`.
- There is no standalone interactive mode. To test end-to-end, drive it with an
  MCP client over stdio (e.g. `@modelcontextprotocol/sdk`'s `Client` +
  `StdioClientTransport`, pointed at `dist/index.js`) and call `tools/list` then a
  tool such as `workato_list_recipes`.
- `dist/` is gitignored but `npm install` runs the `prepare` script which builds
  it automatically, so `dist/index.js` exists after a fresh install.
