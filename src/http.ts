#!/usr/bin/env node
import type { Request, Response, NextFunction } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createWorkatoMcpServer } from "./create-server.js";
import { requireWorkatoToken } from "./workato-api.js";

const MCP_API_KEY = process.env.MCP_API_KEY;
const PORT = Number(process.env.PORT || 8080);

if (!MCP_API_KEY) {
  console.error("MCP_API_KEY is required for the HTTP server.");
  process.exit(1);
}

requireWorkatoToken();

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const expected = `Bearer ${MCP_API_KEY}`;
  if (header !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const allowedHosts = process.env.ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean);

const app = createMcpExpressApp({
  host: "0.0.0.0",
  ...(allowedHosts?.length ? { allowedHosts } : {}),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "workato-mcp" });
});

app.use("/mcp", authMiddleware);

app.post("/mcp", async (req, res) => {
  const server = createWorkatoMcpServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Workato MCP HTTP server listening on port ${PORT}`);
});
