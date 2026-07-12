#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function listFiles(dir, ext = ".ts") {
  const res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      res.push(...listFiles(p, ext));
    } else if (e.isFile() && p.endsWith(ext)) {
      res.push(p);
    }
  }
  return res;
}

function checkFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const parts = text.split(/export\s+async\s+function\s+/g);
  const issues = [];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const fnHeaderMatch = part.match(/^([a-zA-Z0-9_]+)\s*\(/);
    if (!fnHeaderMatch) continue;
    const fnName = fnHeaderMatch[1];
    const fnBody = part;

    if (fnBody.includes("supabaseAdmin")) {
      const idxSup = fnBody.indexOf("supabaseAdmin");
      const before = fnBody.slice(0, idxSup);
      const hasRequireAdmin =
        before.includes("requireAdminAccess(") ||
        before.includes("requireRole(") ||
        before.includes("requireSupabaseAuth(") ||
        /require[A-Z][a-zA-Z0-9_]*\(/.test(before);
      if (!hasRequireAdmin) {
        issues.push(fnName);
      }
    }
  }
  return issues;
}

function main() {
  const root = path.join(__dirname, "..", "src");
  if (!fs.existsSync(root)) {
    console.error("src/ not found; aborting guard check");
    process.exit(0);
  }

  const files = listFiles(root, ".ts");
  const flagged = [];
  for (const f of files) {
    const rel = path.relative(process.cwd(), f);
    const issues = checkFile(f);
    if (issues.length > 0) {
      flagged.push({ file: rel, functions: issues });
    }
  }

  if (flagged.length > 0) {
    console.error(
      "Detected supabaseAdmin usage without requireAdminAccess/requireRole in exported functions:",
    );
    for (const item of flagged) {
      console.error(`- ${item.file}: ${item.functions.join(", ")}`);
    }
    console.error("\nFailing CI to force review. If this is a false positive, update the script.");
    process.exit(2);
  }

  console.log("Supabase admin guard check passed.");
}

main();
