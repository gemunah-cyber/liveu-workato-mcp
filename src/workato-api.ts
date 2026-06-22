import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

export const API_TOKEN = process.env.WORKATO_API_TOKEN;
export const BASE_URL = (process.env.WORKATO_API_BASE_URL || "https://www.workato.com/api").replace(
  /\/+$/,
  ""
);

export function requireWorkatoToken(): string {
  if (!API_TOKEN) {
    throw new Error("WORKATO_API_TOKEN is required. Set it in .env or as an environment variable.");
  }
  return API_TOKEN;
}

export async function workatoFetch(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = requireWorkatoToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Workato API ${res.status}: ${body}`);
  }

  return res.json();
}

export function textResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
