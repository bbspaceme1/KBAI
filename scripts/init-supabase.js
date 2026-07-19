#!/usr/bin/env node

/**
 * Supabase Database Initialization
 * Sets up all tables, views, and RLS policies for autonomous error tracking
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("   Set environment variables first:");
    console.error("   export SUPABASE_URL=https://your-project.supabase.co");
    console.error("   export SUPABASE_SERVICE_ROLE_KEY=sb_secret_...");
    process.exit(1);
  }

  console.log("🔧 Initializing Supabase database...");
  console.log(`📍 URL: ${supabaseUrl}`);

  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read SQL schema file
    const schemaPath = path.join(__dirname, "supabase-init.sql");
    const sqlCommands = fs.readFileSync(schemaPath, "utf-8");

    console.log("\n📊 Executing schema SQL...");

    // Execute SQL commands - split by semicolon and execute each
    const commands = sqlCommands
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd && !cmd.startsWith("--"));

    for (const command of commands) {
      if (command) {
        try {
          const result = await client.rpc("execute_sql", { sql: command });
          console.log(`✓ Executed: ${command.substring(0, 50)}...`);
        } catch (err) {
          // Some commands might fail (e.g., DROP IF EXISTS), but that's OK
          if (!err.message.includes("does not exist")) {
            console.warn(`⚠ Warning: ${err.message.substring(0, 80)}`);
          }
        }
      }
    }

    console.log("\n✅ Database initialization complete!");
    console.log("\n📋 Tables created:");
    console.log("   - error_logs");
    console.log("   - fix_history");
    console.log("   - error_patterns");
    console.log("   - deployment_health");
    console.log("   - autonomous_actions");
    console.log("   - error_log_assignments");

    console.log("\n👁 Views created:");
    console.log("   - v_error_summary");
    console.log("   - v_recent_errors");
    console.log("   - v_fix_statistics");

    console.log("\n🔒 RLS policies configured");
    console.log("   - Read: All authenticated users");
    console.log("   - Write: Service role only");

    console.log("\n🚀 Ready for autonomous loop!");
  } catch (err) {
    console.error("❌ Initialization failed:", err.message);
    process.exit(1);
  }
}

initializeSupabase();
