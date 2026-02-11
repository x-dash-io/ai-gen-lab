import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "node_modules", ".prisma", "client");
const targetDir = path.join(root, "node_modules", "@prisma", "client");

const declarationFiles = [
  "default.d.ts",
  "index.d.ts",
  "edge.d.ts",
  "extension.d.ts",
  "sql.d.ts",
  "client.d.ts",
];

if (!fs.existsSync(sourceDir) || !fs.existsSync(targetDir)) {
  console.warn("[prisma:sync-types] Skipping: Prisma client directories not found.");
  process.exit(0);
}

for (const file of declarationFiles) {
  const src = path.join(sourceDir, file);
  const dest = path.join(targetDir, file);

  if (!fs.existsSync(src)) {
    continue;
  }

  fs.copyFileSync(src, dest);
}

console.log("[prisma:sync-types] Synced Prisma declaration files.");
