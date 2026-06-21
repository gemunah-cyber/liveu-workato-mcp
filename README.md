# Workato MCP (local)

Read-only MCP server for Workato Developer API research in Cursor.

## Prerequisites

- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **Workato Developer API token** with read access to Recipes, Folders, Connections, and Jobs  
  Create in Workato: **Settings → API platform → API client** (or **Settings → API Keys**)

## Quick start

1. **Unzip** this folder anywhere on your machine (e.g. `C:\Tools\workato-mcp` or `~/tools/workato-mcp`).

2. **Install dependencies and build:**

```bash
cd workato-mcp
npm install
npm run build
```

3. **Configure your token** — copy `.env.example` to `.env`:

```
WORKATO_API_TOKEN=your-developer-api-token-here
WORKATO_API_BASE_URL=https://www.workato.com/api
```

4. **Add to Cursor MCP config**

   Merge into **project** `.cursor/mcp.json` or **user** `~/.cursor/mcp.json` (see `mcp.json.example`).

   Replace `ABSOLUTE_PATH_TO` with the full path where you unzipped this folder.

   **Windows example:**

```json
{
  "mcpServers": {
    "Workato MCP": {
      "command": "node",
      "args": ["C:\\Tools\\workato-mcp\\dist\\index.js"],
      "env": {
        "WORKATO_API_TOKEN": "your-token-here",
        "WORKATO_API_BASE_URL": "https://www.workato.com/api"
      }
    }
  }
}
```

   **macOS / Linux example:**

```json
{
  "mcpServers": {
    "Workato MCP": {
      "command": "node",
      "args": ["/Users/you/tools/workato-mcp/dist/index.js"],
      "env": {
        "WORKATO_API_TOKEN": "your-token-here",
        "WORKATO_API_BASE_URL": "https://www.workato.com/api"
      }
    }
  }
}
```

5. **Reload MCP** — Cursor **Settings → MCP →** refresh **Workato MCP**, or run **Developer: Reload Window**.

6. **Verify** — MCP output should show `workato-recipes MCP server running on stdio` (stderr is normal; not an error).

## Available tools

| Tool | Description |
|------|-------------|
| `workato_list_recipes` | List recipes (folder, running status, date filters) |
| `workato_get_recipe` | Full recipe details including steps/code |
| `workato_list_folders` | List folders, optionally by parent |
| `workato_list_projects` | List top-level projects |
| `workato_list_recipe_jobs` | Job history for a recipe |
| `workato_search_recipes` | Search recipes by keyword |
| `workato_get_connections` | List connections and auth status |

## Example prompts in Cursor

- "List all Workato projects"
- "Show me the steps for recipe 67890"
- "Which recipes failed in the last 24 hours?"
- "List all disconnected Workato connections"

## Data center URLs

| Region | `WORKATO_API_BASE_URL` |
|--------|------------------------|
| US | `https://www.workato.com/api` |
| EU | `https://app.eu.workato.com/api` |
| JP | `https://app.jp.workato.com/api` |
| SG | `https://app.sg.workato.com/api` |
| AU | `https://app.au.workato.com/api` |

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| MCP shows green but agent gets `fetch failed` | Reload MCP or reload Cursor window |
| `WORKATO_API_TOKEN is required` | Set token in `env` block in `mcp.json` or in `.env` |
| API 401 Unauthorized | Regenerate token in Workato and update config |
| `node` not found | Install Node.js and restart Cursor |

## Security

- **Never commit or share** your `.env` file or token.
- This server is **read-only** (no recipe start/stop/edit via these tools).
- Each colleague needs their **own** Workato Developer API token.

## Cursor Cloud Automations

Local `.cursor/mcp.json` does **not** apply to Cloud Agent webhooks. Register this MCP on [cursor.com](https://cursor.com) → **Integrations / MCP**, then add it to each automation under **Add Tool or MCP**.

Cloud cannot use Windows paths like `c:\Users\...\dist\index.js`. Publish the package once, then install via `npx`:

### Option A — GitHub Packages (recommended for LiveU)

1. **Create a private repo** (e.g. `liveu/workato-mcp`) and push this folder.
2. **Update `package.json`**: set `repository.url` to your repo; keep `"name": "@gemunah-cyber/workato-mcp"` (scope must match GitHub org/user).
3. **Build and publish** (one-time auth — see [GitHub Packages npm docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)):

```bash
cd tools/workato-mcp
npm install
npm run build
npm login --registry=https://npm.pkg.github.com
npm publish
```

4. **On cursor.com MCP dashboard**, add a **custom stdio MCP**:

| Field | Value |
|-------|--------|
| Name | `Workato MCP` |
| Command | `npx` |
| Args | `["-y", "@gemunah-cyber/workato-mcp"]` |
| Env | `WORKATO_API_TOKEN` = your token (literal) |
| Env | `WORKATO_API_BASE_URL` = `https://www.workato.com/api` |

If the package is private, also add env `NODE_AUTH_TOKEN` = a GitHub PAT with `read:packages` (same org as the package).

5. **In the automation editor**, enable **Workato MCP** under tools (account MCPs are not auto-included).

### Option B — Public npm (simplest if you can publish publicly)

Use package name `@your-scope/workato-mcp` or an unscoped unique name on [npmjs.com](https://www.npmjs.com). Same dashboard config as Option A, without `NODE_AUTH_TOKEN`.

### Option C — HTTP host (skip npm; always-on)

Run the server behind **Streamable HTTP** (Railway, Fly.io, etc.) and register the URL on the Cursor MCP dashboard as an **HTTP MCP**. Requires adding an HTTP transport to this project — use Option A unless you already host internal services.

### Verify cloud MCP

After saving on the dashboard, open your LUMIS automation → **Add Tool or MCP** → confirm **Workato MCP** appears and is enabled. Trigger a test webhook on a bug whose **System** includes Workato; the agent should call `workato_search_recipes` or similar without `fetch failed` / missing-tool errors.
