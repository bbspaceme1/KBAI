#!/usr/bin/env node

/**
 * Vercel Deployment Monitor
 * Real-time monitoring of Vercel deployments with error detection
 *
 * Usage:
 *   node scripts/vercel-monitor.js --watch
 *   node scripts/vercel-monitor.js --check-latest
 *   node scripts/vercel-monitor.js --get-logs
 */

import https from "https";

class VercelMonitor {
  constructor() {
    // Support both token names - prefer VERCEL_PERSONAL_ACCESS_TOKEN
    this.token = process.env.VERCEL_PERSONAL_ACCESS_TOKEN || process.env.VERCEL_TOKEN;
    this.projectId = process.env.VERCEL_PROJECT_ID;
    this.orgId = process.env.VERCEL_ORG_ID;

    if (!this.token || !this.projectId) {
      throw new Error(
        "Missing VERCEL_PERSONAL_ACCESS_TOKEN/VERCEL_TOKEN or VERCEL_PROJECT_ID environment variables",
      );
    }
  }

  /**
   * Make HTTPS request to Vercel API
   */
  async request(endpoint, method = "GET") {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.vercel.com",
        port: 443,
        path: endpoint,
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
              headers: res.headers,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data,
              headers: res.headers,
            });
          }
        });
      });

      req.on("error", reject);
      req.end();
    });
  }

  /**
   * Get latest deployment
   */
  async getLatestDeployment() {
    console.log("Fetching latest deployment...");

    const response = await this.request(`/v6/deployments?projectId=${this.projectId}&limit=1`);

    if (response.status !== 200) {
      throw new Error(`Vercel API error: ${response.status}`);
    }

    const deployment = response.data.deployments?.[0];
    if (!deployment) {
      throw new Error("No deployments found");
    }

    return deployment;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId) {
    const response = await this.request(`/v13/deployments/${deploymentId}`);

    if (response.status !== 200) {
      throw new Error(`Failed to get deployment: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    console.log(`Fetching logs for deployment ${deploymentId}...`);

    const response = await this.request(`/v6/deployments/${deploymentId}/logs`);

    if (response.status !== 200) {
      console.warn(`Could not fetch logs: ${response.status}`);
      return [];
    }

    return response.data;
  }

  /**
   * Parse and analyze logs for errors
   */
  analyzeLogs(logs) {
    if (!Array.isArray(logs)) {
      return [];
    }

    const errors = logs.filter((log) => {
      const text = log.text?.toLowerCase() || "";
      return (
        log.level === "error" ||
        text.includes("error") ||
        text.includes("failed") ||
        text.includes("fatal") ||
        text.includes("exception")
      );
    });

    return errors;
  }

  /**
   * Get runtime errors from deployment
   */
  async getRuntimeErrors(deploymentId) {
    console.log("Checking for runtime errors...");

    const response = await this.request(`/v13/deployments/${deploymentId}/instance-errors`);

    if (response.status === 200) {
      return response.data;
    }

    return [];
  }

  /**
   * Check deployment health
   */
  async checkDeploymentHealth() {
    try {
      console.log("\n=== Vercel Deployment Monitor ===\n");

      const deployment = await this.getLatestDeployment();

      console.log(`Deployment ID: ${deployment.uid}`);
      console.log(`State: ${deployment.state}`);
      console.log(`Created: ${new Date(deployment.createdAt).toISOString()}`);

      if (deployment.errorMessage) {
        console.log(`Error: ${deployment.errorMessage}`);
      }

      const status = await this.getDeploymentStatus(deployment.uid);
      console.log(`Status: ${status.deployment?.state || "unknown"}`);

      // Fetch logs
      const logs = await this.getDeploymentLogs(deployment.uid);
      const errors = this.analyzeLogs(logs);

      if (errors.length > 0) {
        console.log(`\nFound ${errors.length} error(s):\n`);
        errors.forEach((err) => {
          console.log(`  [${err.level}] ${err.text}`);
        });
      } else {
        console.log("\n✓ No errors detected in logs");
      }

      // Check runtime errors
      const runtimeErrors = await this.getRuntimeErrors(deployment.uid);
      if (runtimeErrors.length > 0) {
        console.log(`\nRuntime errors: ${runtimeErrors.length}`);
        runtimeErrors.forEach((err) => {
          console.log(`  - ${err}`);
        });
      }

      return {
        deploymentId: deployment.uid,
        state: deployment.state,
        errors: errors,
        runtimeErrors: runtimeErrors,
        healthy: deployment.state === "READY" && errors.length === 0,
      };
    } catch (error) {
      console.error("Monitor error:", error.message);
      process.exit(1);
    }
  }

  /**
   * Watch deployments with polling
   */
  async watchDeployments(intervalMs = 30000) {
    console.log(`Watching deployments every ${intervalMs}ms...\n`);

    let lastDeploymentId = null;
    let consecutiveErrors = 0;

    const check = async () => {
      try {
        const health = await this.checkDeploymentHealth();

        if (health.deploymentId !== lastDeploymentId && lastDeploymentId !== null) {
          console.log("\n[NEW DEPLOYMENT DETECTED]");
        }

        lastDeploymentId = health.deploymentId;

        if (!health.healthy) {
          consecutiveErrors++;

          if (consecutiveErrors >= 3) {
            console.log("\n⚠️  ALERT: Deployment unhealthy for 3+ checks");
            console.log(
              "Triggering auto-fix workflow (check .github/workflows/auto-monitor-and-fix.yml)\n",
            );
            consecutiveErrors = 0;
          }
        } else {
          consecutiveErrors = 0;
        }

        console.log(`Last check: ${new Date().toISOString()}\n`);
      } catch (error) {
        console.error(`Check failed: ${error.message}`);
      }
    };

    // Initial check
    await check();

    // Setup interval
    setInterval(check, intervalMs);
  }

  /**
   * Get full deployment report
   */
  async getFullReport() {
    console.log("\n=== Full Deployment Report ===\n");

    const deployment = await this.getLatestDeployment();
    const logs = await this.getDeploymentLogs(deployment.uid);
    const errors = this.analyzeLogs(logs);

    const report = {
      timestamp: new Date().toISOString(),
      deployment: {
        id: deployment.uid,
        state: deployment.state,
        url: deployment.url,
        createdAt: deployment.createdAt,
        errorMessage: deployment.errorMessage,
      },
      logs: {
        total: logs.length,
        errors: errors.length,
        errorMessages: errors.map((e) => e.text),
      },
    };

    console.log(JSON.stringify(report, null, 2));
    return report;
  }
}

// CLI
async function main() {
  try {
    const monitor = new VercelMonitor();
    const args = process.argv.slice(2);

    if (args.includes("--watch")) {
      await monitor.watchDeployments(30000);
    } else if (args.includes("--check-latest")) {
      await monitor.checkDeploymentHealth();
    } else if (args.includes("--get-logs")) {
      await monitor.getFullReport();
    } else {
      console.log(`
v0 Vercel Monitor - Real-time deployment monitoring

Usage:
  --watch        Watch deployments every 30 seconds
  --check-latest Check latest deployment status
  --get-logs     Get full deployment report with logs

Environment Variables Required:
  VERCEL_TOKEN          Vercel API token
  VERCEL_PROJECT_ID     Vercel project ID
      `);
    }
  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default VercelMonitor;
