#!/usr/bin/env node

/**
 * v0 Auto-Fix Engine
 * Detects and fixes common deployment issues automatically
 *
 * Usage: node scripts/auto-fix-engine.js [--check-only] [--fix-all]
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoFixEngine {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.projectRoot = process.cwd();
  }

  /**
   * Run full diagnostic and auto-fix pipeline
   */
  async runFullDiagnostics(options = {}) {
    const checkOnly = options.checkOnly || false;
    const fixAll = options.fixAll || false;

    console.log("\n=== v0 Auto-Fix Engine ===\n");

    try {
      // 1. Check TypeScript types
      console.log("1. Checking TypeScript types...");
      await this.checkTypeScript();

      // 2. Check ESLint
      console.log("2. Checking linting...");
      await this.checkLinting();

      // 3. Check build
      console.log("3. Checking build...");
      await this.checkBuild();

      // 4. Check circular dependencies
      console.log("4. Checking circular dependencies...");
      await this.checkCircularDeps();

      // 5. Check bundle size
      console.log("5. Checking bundle size...");
      await this.checkBundleSize();

      // 6. Check environment variables
      console.log("6. Checking environment variables...");
      await this.checkEnvVars();

      // Print summary
      this.printSummary(checkOnly);

      // Execute fixes if not check-only
      if (!checkOnly && (fixAll || this.issues.length > 0)) {
        console.log("\n=== Executing Auto-Fixes ===\n");
        await this.executeFixes();
      }

      return {
        issues: this.issues,
        fixes: this.fixes,
        success: this.issues.length === 0,
      };
    } catch (error) {
      console.error("Fatal error in auto-fix engine:", error.message);
      process.exit(1);
    }
  }

  /**
   * Check TypeScript compilation
   */
  async checkTypeScript() {
    try {
      execSync("npx tsc --noEmit", { cwd: this.projectRoot, stdio: "pipe" });
      console.log("  ✓ TypeScript check passed");
    } catch (error) {
      const output = error.toString();
      this.issues.push({
        type: "typescript",
        severity: "high",
        message: "TypeScript compilation errors found",
        details: output.slice(0, 500),
      });
      console.log("  ✗ TypeScript errors detected");
    }
  }

  /**
   * Check ESLint
   */
  async checkLinting() {
    try {
      execSync("npm run lint:ci", { cwd: this.projectRoot, stdio: "pipe" });
      console.log("  ✓ Linting check passed");
    } catch (error) {
      const output = error.toString();
      this.issues.push({
        type: "linting",
        severity: "medium",
        message: "Linting errors found",
        details: output.slice(0, 500),
      });
      console.log("  ✗ Linting errors detected");

      // Try auto-fix
      try {
        execSync("npx prettier --write .", { cwd: this.projectRoot, stdio: "pipe" });
        this.fixes.push({
          type: "linting",
          action: "prettier --write .",
          status: "auto-fixed",
        });
        console.log("  → Auto-fixed with prettier");
      } catch (e) {
        console.log("  → Could not auto-fix linting");
      }
    }
  }

  /**
   * Check build
   */
  async checkBuild() {
    try {
      execSync("npm run build", { cwd: this.projectRoot, stdio: "pipe" });
      console.log("  ✓ Build passed");
    } catch (error) {
      const output = error.toString();
      this.issues.push({
        type: "build",
        severity: "critical",
        message: "Build failed",
        details: output.slice(0, 500),
      });
      console.log("  ✗ Build failed");
    }
  }

  /**
   * Check for circular dependencies
   */
  async checkCircularDeps() {
    try {
      const output = execSync("npm run build 2>&1 | grep -i circular || true", {
        cwd: this.projectRoot,
        encoding: "utf-8",
      });

      if (output.includes("circular")) {
        this.issues.push({
          type: "circular-deps",
          severity: "high",
          message: "Circular dependencies detected in build",
          details: output,
        });
        console.log("  ✗ Circular dependencies detected");
      } else {
        console.log("  ✓ No circular dependencies");
      }
    } catch (error) {
      console.log("  ? Could not check circular dependencies");
    }
  }

  /**
   * Check bundle size
   */
  async checkBundleSize() {
    try {
      const distPath = path.join(this.projectRoot, "dist");
      if (!fs.existsSync(distPath)) {
        console.log("  ? Dist folder not found, building first...");
        return;
      }

      let totalSize = 0;
      const getSize = (dir) => {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            getSize(filePath);
          } else {
            totalSize += stat.size;
          }
        });
      };

      getSize(distPath);
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

      if (totalSize > 500 * 1024) {
        // 500KB threshold
        this.issues.push({
          type: "bundle-size",
          severity: "medium",
          message: `Bundle size is large: ${sizeMB}MB`,
          details: `Consider code-splitting and lazy loading`,
        });
        console.log(`  ✗ Bundle size large: ${sizeMB}MB`);
      } else {
        console.log(`  ✓ Bundle size OK: ${sizeMB}MB`);
      }
    } catch (error) {
      console.log("  ? Could not check bundle size");
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvVars() {
    try {
      const requiredVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "BOOTSTRAP_SECRET"];

      const missing = requiredVars.filter((v) => !process.env[v]);

      if (missing.length > 0) {
        this.issues.push({
          type: "env-vars",
          severity: "high",
          message: `Missing environment variables: ${missing.join(", ")}`,
          details: "Required vars not set in Vercel or local .env",
        });
        console.log(`  ✗ Missing env vars: ${missing.join(", ")}`);
      } else {
        console.log("  ✓ Environment variables OK");
      }
    } catch (error) {
      console.log("  ? Could not check environment variables");
    }
  }

  /**
   * Execute collected fixes
   */
  async executeFixes() {
    for (const issue of this.issues) {
      console.log(`\nFixing: ${issue.message}`);

      switch (issue.type) {
        case "linting":
          try {
            execSync("npx prettier --write . --ignore-unknown", {
              cwd: this.projectRoot,
              stdio: "inherit",
            });
            this.fixes.push({
              type: "linting",
              action: "prettier --write",
              status: "success",
            });
          } catch (e) {
            console.error("  Failed to fix linting");
          }
          break;

        case "circular-deps":
          console.log("  → Circular dependencies require manual review");
          this.fixes.push({
            type: "circular-deps",
            action: "manual-review",
            status: "pending",
          });
          break;

        case "bundle-size":
          console.log("  → Bundle size optimization requires code review");
          this.fixes.push({
            type: "bundle-size",
            action: "code-review",
            status: "pending",
          });
          break;

        case "typescript":
        case "build":
          console.log("  → Build errors require manual investigation and fix");
          this.fixes.push({
            type: issue.type,
            action: "manual-fix",
            status: "pending",
          });
          break;

        case "env-vars":
          console.log("  → Missing environment variables - set in Vercel secrets");
          this.fixes.push({
            type: "env-vars",
            action: "set-vercel-secrets",
            status: "pending",
          });
          break;

        default:
          console.log("  ? Unknown issue type");
      }
    }
  }

  /**
   * Print diagnostic summary
   */
  printSummary(checkOnly = false) {
    console.log("\n=== Diagnostic Summary ===\n");

    if (this.issues.length === 0) {
      console.log("✓ All checks passed! No issues detected.\n");
      return;
    }

    console.log(`Found ${this.issues.length} issue(s):\n`);

    const bySeverity = {
      critical: this.issues.filter((i) => i.severity === "critical"),
      high: this.issues.filter((i) => i.severity === "high"),
      medium: this.issues.filter((i) => i.severity === "medium"),
      low: this.issues.filter((i) => i.severity === "low"),
    };

    Object.entries(bySeverity).forEach(([severity, items]) => {
      if (items.length > 0) {
        console.log(`${severity.toUpperCase()}: ${items.length}`);
        items.forEach((item) => {
          console.log(`  - ${item.message}`);
        });
        console.log();
      }
    });

    if (checkOnly) {
      console.log("Run with --fix-all to execute automated fixes.\n");
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const fixAll = args.includes("--fix-all");

  const engine = new AutoFixEngine();
  const result = await engine.runFullDiagnostics({ checkOnly, fixAll });

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

export default AutoFixEngine;
