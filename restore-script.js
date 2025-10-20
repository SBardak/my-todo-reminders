// Restore script for Supabase data from backup files
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Determine if we're in a browser or Node.js environment
let supabaseUrl, supabaseKey, supabase;

// Try to load from environment variables (for CI/CD and server environments)
// NOTE: For restores to work with RLS-protected tables, you need to use the SERVICE_ROLE key
// instead of the ANON key. The service role key bypasses RLS policies.
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
} else {
  // Try to load from backup config file (for local development)
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const backupConfigPath = path.join(__dirname, "js", "backup-config.js");

    if (fs.existsSync(backupConfigPath)) {
      const { backupConfig } = await import("./js/backup-config.js");
      supabaseUrl = backupConfig.supabaseUrl;
      supabaseKey = backupConfig.supabaseServiceRoleKey;
      console.log("✓ Loaded backup config from backup-config.js");
    } else {
      // Fallback to regular config (will only work if RLS is disabled or tables are public)
      const configPath = path.join(__dirname, "js", "config.js");
      if (fs.existsSync(configPath)) {
        const { supabaseConfig } = await import("./js/config.js");
        supabaseUrl = supabaseConfig.supabaseUrl;
        supabaseKey = supabaseConfig.supabaseKey;
        console.warn("⚠️  Using anon key - restore may fail if RLS is enabled");
        console.warn("⚠️  Create js/backup-config.js with your service role key for full restore");
      }
    }
  } catch (error) {
    console.warn("Could not load config file:", error.message);
  }
}

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase configuration. Please set environment variables or ensure config.js exists."
  );
  process.exit(1);
}

// Initialize Supabase client
supabase = createClient(supabaseUrl, supabaseKey);

async function restoreData(backupFilePath, options = {}) {
  const {
    clearExisting = false,
    restoreTodoLists = true,
    restoreShoppingLists = true,
    restoreTravelLists = true,
    restoreCalendarEvents = true,
    restoreNotes = true,
  } = options;

  try {
    console.log(`\n🔄 Starting restore from: ${backupFilePath}\n`);

    // Read backup file
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    const backupContent = fs.readFileSync(backupFilePath, "utf8");
    const backup = JSON.parse(backupContent);

    console.log(`📦 Backup version: ${backup.version}`);
    console.log(`📅 Backup date: ${backup.timestamp}`);
    console.log(`📊 Contains:`);
    console.log(`   - ${backup.totalLists || 0} todo lists`);
    console.log(`   - ${backup.totalShoppingLists || 0} shopping lists`);
    console.log(`   - ${backup.totalTravelLists || 0} travel lists`);
    console.log(`   - ${backup.totalCalendarEvents || 0} calendar events`);
    console.log(`   - ${backup.totalNotes || 0} notes\n`);

    let stats = {
      todoLists: { inserted: 0, updated: 0, failed: 0 },
      shoppingLists: { inserted: 0, updated: 0, failed: 0 },
      travelLists: { inserted: 0, updated: 0, failed: 0 },
      calendarEvents: { inserted: 0, updated: 0, failed: 0 },
      notes: { inserted: 0, updated: 0, failed: 0 },
    };

    // Clear existing data if requested
    if (clearExisting) {
      console.log("⚠️  Clearing existing data...");
      await clearAllData();
      console.log("✓ Existing data cleared\n");
    }

    // Restore todo lists
    if (restoreTodoLists && backup.data && backup.data.length > 0) {
      console.log("📝 Restoring todo lists...");
      stats.todoLists = await restoreTable("todo_lists", backup.data);
    }

    // Restore shopping lists
    if (restoreShoppingLists && backup.shoppingData && backup.shoppingData.length > 0) {
      console.log("🛒 Restoring shopping lists...");
      stats.shoppingLists = await restoreTable("shopping_lists", backup.shoppingData);
    }

    // Restore travel lists
    if (restoreTravelLists && backup.travelData && backup.travelData.length > 0) {
      console.log("✈️  Restoring travel lists...");
      stats.travelLists = await restoreTable("travel_lists", backup.travelData);
    }

    // Restore calendar events
    if (restoreCalendarEvents && backup.calendarData && backup.calendarData.length > 0) {
      console.log("📅 Restoring calendar events...");
      stats.calendarEvents = await restoreTable("events", backup.calendarData);
    }

    // Restore notes
    if (restoreNotes && backup.notesData && backup.notesData.length > 0) {
      console.log("📓 Restoring notes...");
      stats.notes = await restoreTable("notes_lists", backup.notesData);
    }

    // Print summary
    console.log("\n✅ Restore completed!\n");
    console.log("📊 Summary:");
    printStats("Todo Lists", stats.todoLists);
    printStats("Shopping Lists", stats.shoppingLists);
    printStats("Travel Lists", stats.travelLists);
    printStats("Calendar Events", stats.calendarEvents);
    printStats("Notes", stats.notes);

  } catch (error) {
    console.error("\n❌ Restore failed:", error.message);
    process.exit(1);
  }
}

async function restoreTable(tableName, records) {
  const stats = { inserted: 0, updated: 0, failed: 0 };

  for (const record of records) {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from(tableName)
        .select("id")
        .eq("id", record.id)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from(tableName)
          .update(record)
          .eq("id", record.id);

        if (error) throw error;
        stats.updated++;
      } else {
        // Insert new record
        const { error } = await supabase
          .from(tableName)
          .insert(record);

        if (error) throw error;
        stats.inserted++;
      }
    } catch (error) {
      console.error(`   ⚠️  Failed to restore record ${record.id}:`, error.message);
      stats.failed++;
    }
  }

  return stats;
}

async function clearAllData() {
  const tables = ["todo_lists", "shopping_lists", "travel_lists", "events", "notes_lists"];

  for (const table of tables) {
    try {
      // Delete all records from the table
      const { error } = await supabase
        .from(table)
        .delete()
        .neq("id", ""); // This will match all records

      if (error && error.code !== "PGRST116") {
        console.warn(`   ⚠️  Could not clear ${table}:`, error.message);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not clear ${table}:`, error.message);
    }
  }
}

function printStats(label, stats) {
  const total = stats.inserted + stats.updated + stats.failed;
  if (total > 0) {
    console.log(`   ${label}:`);
    console.log(`      ✓ Inserted: ${stats.inserted}`);
    console.log(`      ↻ Updated: ${stats.updated}`);
    if (stats.failed > 0) {
      console.log(`      ✗ Failed: ${stats.failed}`);
    }
  }
}

function getLatestBackup() {
  const backupDir = "backups";
  if (!fs.existsSync(backupDir)) {
    throw new Error("Backups directory not found");
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
    .sort()
    .reverse(); // newest first

  if (files.length === 0) {
    throw new Error("No backup files found");
  }

  return path.join(backupDir, files[0]);
}

// Parse command line arguments
const args = process.argv.slice(2);
let backupFile = null;
let clearExisting = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" || args[i] === "-f") {
    backupFile = args[i + 1];
    i++;
  } else if (args[i] === "--clear" || args[i] === "-c") {
    clearExisting = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
Restore Script - Restore data from backup files

Usage:
  node restore-script.js [options]

Options:
  -f, --file <path>    Path to backup file (default: latest backup)
  -c, --clear          Clear existing data before restore (DANGEROUS!)
  -h, --help           Show this help message

Examples:
  # Restore from latest backup
  node restore-script.js

  # Restore from specific backup
  node restore-script.js --file backups/backup-2025-10-19T09-18-24.json

  # Clear all data and restore from backup (DANGEROUS!)
  node restore-script.js --clear --file backups/backup-2025-10-19T09-18-24.json
`);
    process.exit(0);
  }
}

// Use latest backup if no file specified
if (!backupFile) {
  try {
    backupFile = getLatestBackup();
    console.log(`📁 No backup file specified, using latest: ${backupFile}`);
  } catch (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
}

// Confirm if clearing existing data
if (clearExisting) {
  console.log("\n⚠️  WARNING: You are about to DELETE ALL EXISTING DATA!");
  console.log("⚠️  This action cannot be undone!");
  console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// Run restore
restoreData(backupFile, { clearExisting });
