#!/usr/bin/env node
// Verifies that version metadata is identical everywhere. Run: npm run check:version
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const found = {
  "package.json": JSON.parse(read("package.json")).version,
  "apps/desktop/package.json": JSON.parse(read("apps/desktop/package.json")).version,
  "tauri.conf.json": JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json")).version,
  "Cargo.toml": read("apps/desktop/src-tauri/Cargo.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1],
  "packages/config": read("packages/config/src/index.ts").match(/APP_VERSION = "([^"]+)"/)?.[1],
  "go-worker": read("services/go-worker/internal/health/health.go").match(/Version = "([^"]+)"/)?.[1],
  "CHANGELOG.md": read("CHANGELOG.md").match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1],
};
const expected = found["package.json"];
const bad = Object.entries(found).filter(([, v]) => v !== expected);
for (const [k, v] of Object.entries(found)) console.log(`${v === expected ? "ok " : "BAD"} ${k}: ${v}`);
if (bad.length) { console.error("Version mismatch detected."); process.exit(1); }
