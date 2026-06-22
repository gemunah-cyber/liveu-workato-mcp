import { chmod } from "node:fs/promises";
import { resolve } from "node:path";

const binPath = resolve("dist/index.js");

await chmod(binPath, 0o755);
