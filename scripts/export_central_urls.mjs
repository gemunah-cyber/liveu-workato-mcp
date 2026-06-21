/**
 * Export Workato Central_url_* usage to Excel (research).
 * Run from repo: node tools/workato-mcp/scripts/export_central_urls.mjs
 */
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env");
const OUT_PATH = join(ROOT, "..", "..", "docs", "workato-central-url-research.xlsx");

const RECIPE_UI = "https://www.workato.com/recipes/{id}";
const CONN_UI = "https://www.workato.com/connections/{id}";

const CENTRAL_PROP_RE = /Central_url_(v0|v2|billing|inventories)[^'"]*/gi;
const URL_FIELD_RE = /"url"\s*:\s*"([^"]*Central_url[^"]*)"/gi;
const METHOD_RE = /"method"\s*:\s*"([A-Z]+)"/;

function loadEnv() {
  const text = readFileSync(ENV_PATH, "utf8");
  let token = "";
  let base = "https://www.workato.com/api";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("WORKATO_API_TOKEN=")) token = t.slice("WORKATO_API_TOKEN=".length).trim();
    if (t.startsWith("WORKATO_API_BASE_URL=")) base = t.slice("WORKATO_API_BASE_URL=".length).trim().replace(/\/+$/, "");
  }
  if (!token) throw new Error("WORKATO_API_TOKEN missing");
  return { token, base };
}

async function apiGet(token, base, path, params = {}) {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeProp(raw) {
  const m = raw.replace(/\\/g, "").match(/(Central_url_\w+)/i);
  return m ? m[1] : raw;
}

function extractEndpoints(body) {
  const rows = [];
  const seen = new Set();
  const patterns = [
    // Standard: Central_url_v0', 'account_property', 'Central_url_v0')}/path...
    /Central_url_(v0|v2|billing|inventories)', 'account_property', 'Central_url_\1'\)\}([^"\\]+)/gi,
    // Escaped JSON (common in LUC recipes): Central_url_billing\"}')}/path...
    /Central_url_(v0|v2|billing|inventories)\\+"\}'\)\}([^"\\]+)/gi,
  ];

  for (const pathRe of patterns) {
    let m;
    pathRe.lastIndex = 0;
    while ((m = pathRe.exec(body)) !== null) {
      const prop = normalizeProp(`Central_url_${m[1]}`);
      const pathSuffix = (m[2] || "").replace(/\\/g, "").trim();
      const start = Math.max(0, m.index - 600);
      const chunk = body.slice(start, m.index + 50);
      const methodM = chunk.match(/\\"method\\":\\"([A-Z]+)\\"/) || chunk.match(METHOD_RE);
      const method = methodM ? methodM[1] : "";
      const endpoint = `${prop}${pathSuffix.startsWith("/") || pathSuffix.startsWith("#") ? pathSuffix : "/" + pathSuffix}`;
      const key = `${prop}|${method}|${endpoint.slice(0, 200)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const snippetStart = Math.max(0, m.index - 80);
      rows.push({
        property: prop,
        method,
        endpoint_pattern: endpoint.slice(0, 300),
        url_template: body.slice(snippetStart, m.index + m[0].length + 80).slice(0, 500),
      });
    }
  }
  return rows;
}

async function tryAccountProperties(token, base) {
  for (const path of ["/properties", "/account_properties", "/settings/properties"]) {
    try {
      const data = await apiGet(token, base, path);
      const out = [];
      const items = Array.isArray(data) ? data : data.items || data.properties || data.result || [];
      for (const item of items) {
        const name = item.name || item.key || item.property_name || "";
        const value = item.value || item.property_value || item.default || "";
        if (String(name).toLowerCase().includes("central_url") || String(value).toLowerCase().includes("central_url")) {
          out.push({ name, value });
        }
      }
      if (out.length) return out;
    } catch {
      /* try next */
    }
  }
  return [];
}

function addLink(cell, url) {
  if (!url) return;
  cell.value = { text: url, hyperlink: url };
  cell.font = { color: { argb: "FF0563C1" }, underline: true };
}

async function main() {
  const { token, base } = loadEnv();
  mkdirSync(dirname(OUT_PATH), { recursive: true });

  console.log("Fetching recipes...");
  const allRecipes = [];
  let page = 1;
  while (true) {
    const data = await apiGet(token, base, "/recipes", { per_page: 100, page });
    const items = data.items || data;
    if (!items?.length) break;
    allRecipes.push(...items);
    if (items.length < 100) break;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  ${allRecipes.length} recipes`);

  const recipeRows = [];
  const endpointRows = [];

  for (let i = 0; i < allRecipes.length; i++) {
    const r = allRecipes[i];
    const rid = String(r.id);
    const rname = r.name || "";
    const folder = r.folder_id ?? "";
    const running = !!r.running;
    if ((i + 1) % 25 === 0) console.log(`  Scanning ${i + 1}/${allRecipes.length}...`);

    let body;
    try {
      const detail = await apiGet(token, base, `/recipes/${rid}`);
      body = JSON.stringify(detail);
    } catch (e) {
      recipeRows.push({
        recipe_id: rid,
        recipe_name: rname,
        folder_id: folder,
        running,
        properties: "",
        recipe_link: RECIPE_UI.replace("{id}", rid),
        note: String(e.message),
      });
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    const props = [...new Set([...body.matchAll(/Central_url_(v0|v2|billing|inventories)/gi)].map((x) => normalizeProp(x[0])))].sort();
    if (!props.length) {
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }

    const recipeLink = RECIPE_UI.replace("{id}", rid);
    recipeRows.push({
      recipe_id: rid,
      recipe_name: rname,
      folder_id: folder,
      running,
      properties: props.join(", "),
      recipe_link: recipeLink,
      note: "",
    });

    for (const ep of extractEndpoints(body)) {
      endpointRows.push({
        ...ep,
        recipe_id: rid,
        recipe_name: rname,
        running,
        folder_id: folder,
        recipe_link: recipeLink,
      });
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("Fetching connections...");
  const connRows = [];
  try {
    const conns = await apiGet(token, base, "/connections", { per_page: 100 });
    const list = Array.isArray(conns) ? conns : conns.items || [];
    for (const c of list) {
      const name = (c.name || "").toLowerCase();
      if (name.includes("central") || name.includes("luc")) {
        const cid = c.id;
        connRows.push({
          connection_id: cid,
          connection_name: c.name,
          application: c.application || "",
          authorization_status: c.authorization_status || "",
          connection_link: CONN_UI.replace("{id}", cid),
        });
      }
    }
  } catch (e) {
    connRows.push({ connection_name: `API error: ${e.message}`, connection_link: "" });
  }

  const propRows = await tryAccountProperties(token, base);

  const wb = new ExcelJS.Workbook();

  const wsSum = wb.addWorksheet("Summary by Property");
  wsSum.addRow(["Account Property", "Recipe Count", "Example Recipe ID", "Recipe Link"]);
  const propCounts = {};
  const propLinks = {};
  for (const rr of recipeRows) {
    for (const p of rr.properties.split(", ")) {
      if (!p) continue;
      propCounts[p] = (propCounts[p] || 0) + 1;
      propLinks[p] = rr.recipe_link;
    }
  }
  for (const p of Object.keys(propCounts).sort()) {
    const row = wsSum.addRow([p, propCounts[p], "", propLinks[p] || ""]);
    addLink(row.getCell(4), propLinks[p]);
  }

  const wsRec = wb.addWorksheet("Recipes");
  wsRec.addRow(["Recipe ID", "Recipe Name", "Folder ID", "Running", "Central URL Properties", "Recipe Link", "Notes"]);
  for (const rr of recipeRows.sort((a, b) => a.properties.localeCompare(b.properties))) {
    const row = wsRec.addRow([
      rr.recipe_id,
      rr.recipe_name,
      rr.folder_id,
      rr.running,
      rr.properties,
      rr.recipe_link,
      rr.note,
    ]);
    addLink(row.getCell(6), rr.recipe_link);
  }

  const wsEp = wb.addWorksheet("API Endpoints");
  wsEp.addRow([
    "Account Property",
    "HTTP Method",
    "Endpoint Pattern",
    "Full URL Template",
    "Recipe ID",
    "Recipe Name",
    "Running",
    "Folder ID",
    "Recipe Link",
    "URL Template Snippet",
  ]);
  for (const er of endpointRows.sort(
    (a, b) => a.property.localeCompare(b.property) || a.recipe_id.localeCompare(b.recipe_id)
  )) {
    const fullUrl = `{${er.property} value}${er.endpoint_pattern.replace(/^Central_url_\w+/, "")}`;
    const row = wsEp.addRow([
      er.property,
      er.method,
      er.endpoint_pattern,
      fullUrl,
      er.recipe_id,
      er.recipe_name,
      er.running,
      er.folder_id,
      er.recipe_link,
      er.url_template,
    ]);
    addLink(row.getCell(9), er.recipe_link);
  }

  const wsConn = wb.addWorksheet("Central Connections");
  wsConn.addRow(["Connection ID", "Connection Name", "Application", "Auth Status", "Connection Link"]);
  for (const cr of connRows) {
    const row = wsConn.addRow([
      cr.connection_id ?? "",
      cr.connection_name,
      cr.application ?? "",
      cr.authorization_status ?? "",
      cr.connection_link,
    ]);
    addLink(row.getCell(5), cr.connection_link);
  }

  const wsProp = wb.addWorksheet("Account Property Values");
  wsProp.addRow(["Property Name", "Value", "Notes"]);
  if (propRows.length) {
    for (const pr of propRows) wsProp.addRow([pr.name, pr.value, ""]);
  } else {
    for (const name of ["Central_url_v0", "Central_url_v2", "Central_url_billing", "Central_url_inventories"]) {
      wsProp.addRow([
        name,
        "(not exposed via Developer API — see Workato UI > Settings > Account properties)",
        "",
      ]);
    }
  }

  for (const ws of wb.worksheets) {
    ws.columns.forEach((col) => {
      col.width = 22;
    });
  }

  await wb.xlsx.writeFile(OUT_PATH);
  console.log(`Saved: ${OUT_PATH}`);
  console.log(`  Recipes with Central URLs: ${recipeRows.length}`);
  console.log(`  Endpoint rows: ${endpointRows.length}`);
  console.log(`  Central connections: ${connRows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
