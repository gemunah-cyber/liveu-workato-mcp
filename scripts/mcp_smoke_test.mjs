import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, WORKATO_API_TOKEN: "dummy-token-for-smoke-test" },
});

const client = new Client({ name: "smoke-test", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`Connected. Server exposes ${tools.length} tools:`);
for (const t of tools) console.log(` - ${t.name}`);

console.log("\nCalling workato_list_recipes (expect auth error against real API)...");
try {
  const res = await client.callTool({ name: "workato_list_recipes", arguments: { per_page: "1" } });
  console.log("Tool returned content:", JSON.stringify(res.content).slice(0, 300));
} catch (e) {
  console.log("Tool execution error (expected without a real token):", String(e.message).slice(0, 200));
}

await client.close();
console.log("\nSmoke test OK");
process.exit(0);
