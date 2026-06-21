#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const API_TOKEN = process.env.WORKATO_API_TOKEN;
const BASE_URL = (process.env.WORKATO_API_BASE_URL || "https://www.workato.com/api").replace(/\/+$/, "");

if (!API_TOKEN) {
  console.error("WORKATO_API_TOKEN is required. Set it in .env or as an environment variable.");
  process.exit(1);
}

async function workatoFetch(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Workato API ${res.status}: ${body}`);
  }

  return res.json();
}

function textResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const server = new McpServer({
  name: "workato-recipes",
  version: "1.0.0",
});

// ── Tool: workato_list_recipes ──────────────────────────────────────────────

server.tool(
  "workato_list_recipes",
  "List Workato recipes with optional filters. Returns recipe metadata (not code by default).",
  {
    folder_id: z.string().optional().describe("Filter by folder ID"),
    running: z.enum(["true", "false"]).optional().describe("Filter by running status"),
    since: z.string().optional().describe("Return recipes updated after this ISO 8601 timestamp"),
    order: z.enum(["activity", "default"]).optional().describe("Sort order"),
    page: z.string().optional().describe("Page number (1-based)"),
    per_page: z.string().optional().describe("Results per page (max 100, default 100)"),
  },
  async (params) => {
    const query: Record<string, string> = {};
    if (params.folder_id) query.folder_id = params.folder_id;
    if (params.running) query.running = params.running;
    if (params.since) query.since = params.since;
    if (params.order) query.order = params.order;
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    const data = await workatoFetch("/recipes", query);
    return textResult(data);
  }
);

// ── Tool: workato_get_recipe ────────────────────────────────────────────────

server.tool(
  "workato_get_recipe",
  "Get full details of a single Workato recipe by ID, including its code/steps.",
  {
    recipe_id: z.string().describe("The recipe ID"),
  },
  async ({ recipe_id }) => {
    const data = await workatoFetch(`/recipes/${recipe_id}`);
    return textResult(data);
  }
);

// ── Tool: workato_list_folders ──────────────────────────────────────────────

server.tool(
  "workato_list_folders",
  "List folders in the Workato workspace. Optionally filter by parent folder.",
  {
    parent_id: z.string().optional().describe("Parent folder ID (omit for root-level folders)"),
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Results per page"),
  },
  async (params) => {
    const query: Record<string, string> = {};
    if (params.parent_id) query.parent_id = params.parent_id;
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    const data = await workatoFetch("/folders", query);
    return textResult(data);
  }
);

// ── Tool: workato_list_projects ─────────────────────────────────────────────

server.tool(
  "workato_list_projects",
  "List all projects (top-level folders) in the Workato workspace.",
  {},
  async () => {
    const data = await workatoFetch("/folders", { parent_id: "0" });
    return textResult(data);
  }
);

// ── Tool: workato_list_recipe_jobs ──────────────────────────────────────────

server.tool(
  "workato_list_recipe_jobs",
  "List recent jobs (execution history) for a specific recipe. Useful for checking failures.",
  {
    recipe_id: z.string().describe("The recipe ID"),
    status: z.enum(["succeeded", "failed", "pending", "aborted"]).optional().describe("Filter by job status"),
    rerun_from: z.string().optional().describe("Only show reruns from this job ID"),
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Results per page"),
  },
  async (params) => {
    const query: Record<string, string> = {};
    if (params.status) query.status = params.status;
    if (params.rerun_from) query.rerun_from = params.rerun_from;
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    const data = await workatoFetch(`/recipes/${params.recipe_id}/jobs`, query);
    return textResult(data);
  }
);

// ── Tool: workato_search_recipes ────────────────────────────────────────────

server.tool(
  "workato_search_recipes",
  "Search for recipes by name or keyword across the workspace.",
  {
    query: z.string().describe("Search term to match against recipe names"),
    running: z.enum(["true", "false"]).optional().describe("Filter by running status"),
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Results per page"),
  },
  async (params) => {
    const q: Record<string, string> = {};
    q.adapter_names_any = params.query;
    if (params.running) q.running = params.running;
    if (params.page) q.page = params.page;
    if (params.per_page) q.per_page = params.per_page;
    const data = await workatoFetch("/recipes", q);
    return textResult(data);
  }
);

// ── Tool: workato_get_connections ───────────────────────────────────────────

server.tool(
  "workato_get_connections",
  "List all connections in the Workato workspace with their authorization status.",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Results per page"),
  },
  async (params) => {
    const query: Record<string, string> = {};
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    const data = await workatoFetch("/connections", query);
    return textResult(data);
  }
);

// ── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("workato-recipes MCP server running on stdio");
