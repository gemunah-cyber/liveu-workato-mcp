#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWorkatoMcpServer } from "./create-server.js";
import { requireWorkatoToken } from "./workato-api.js";

requireWorkatoToken();

const server = createWorkatoMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("workato-recipes MCP server running on stdio");
