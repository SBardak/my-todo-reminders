// Daily backup script for Supabase todo lists, shopping lists, travel lists, calendar events, and notes
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Determine if we're in a browser or Node.js environment
let supabaseUrl, supabaseKey, supabase;

// Try to load from environment variables (for CI/CD and server environments)
// NOTE: For backups to work with RLS-protected tables, you need to use the SERVICE_ROLE key
// instead of the ANON key. The service role key bypasses RLS policies.
// Set SUPABASE_SERVICE_ROLE_KEY in your environment or GitHub secrets.
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
        console.warn("⚠️  Using anon key - backups may be empty if RLS is enabled");
        console.warn("⚠️  Create js/backup-config.js with your service role key for full backups");
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

async function backupData() {
  try {
    console.log("Starting backup...");

    // Fetch all todo lists
    const { data: todoLists, error: todoError } = await supabase
      .from("todo_lists")
      .select("*")
      .order("created_at", { ascending: true });

    if (todoError) {
      throw todoError;
    }

    // Fetch all shopping lists
    const { data: shoppingLists, error: shoppingError } = await supabase
      .from("shopping_lists")
      .select("*")
      .order("created_at", { ascending: true });

    // Only throw if shopping_lists table exists but has an error
    // If the table doesn't exist yet, we'll just log a warning
    if (shoppingError && shoppingError.code !== "PGRST116") {
      throw shoppingError;
    }

    // Fetch all travel lists
    const { data: travelLists, error: travelError } = await supabase
      .from("travel_lists")
      .select("*")
      .order("created_at", { ascending: true });

    // Only throw if travel_lists table exists but has an error
    if (travelError && travelError.code !== "PGRST116") {
      throw travelError;
    }

    // Fetch all calendar events
    const { data: calendarEvents, error: calendarError } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    // Only throw if events table exists but has an error
    if (calendarError && calendarError.code !== "PGRST116") {
      throw calendarError;
    }

    // Fetch all notes
    const { data: notesLists, error: notesError } = await supabase
      .from("notes_lists")
      .select("*")
      .order("list_order", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: true });

    // Only throw if notes_lists table exists but has an error
    if (notesError && notesError.code !== "PGRST116") {
      throw notesError;
    }

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.4", // Updated version to include notes
      totalLists: todoLists?.length || 0,
      totalShoppingLists: shoppingLists?.length || 0,
      totalTravelLists: travelLists?.length || 0,
      totalCalendarEvents: calendarEvents?.length || 0,
      totalNotes: notesLists?.length || 0,
      data: todoLists || [],
      shoppingData: shoppingLists || [],
      travelData: travelLists || [],
      calendarData: calendarEvents || [],
      notesData: notesLists || [],
    };

    // Create filename with date
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:]/g, "-").split(".")[0]; // "2025-08-01T09-45-00"
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join("backups", filename);

    // Ensure backups directory exists
    if (!fs.existsSync("backups")) {
      fs.mkdirSync("backups");
    }

    // Write backup file
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup successful: ${filename}`);
    console.log(
      `📊 Backed up ${backup.totalLists} todo lists, ${backup.totalShoppingLists} shopping lists, ${backup.totalTravelLists} travel lists, ${backup.totalCalendarEvents} calendar events, and ${backup.totalNotes} notes`
    );

    // Keep only last 10 backups (cleanup old files)
    cleanupOldBackups();
  } catch (error) {
    console.error("❌ Backup failed:", error.message);
    process.exit(1);
  }
}

function cleanupOldBackups() {
  try {
    const backupDir = "backups";
    if (!fs.existsSync(backupDir)) return;

    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
      .sort()
      .reverse(); // newest first

    // Keep only the 10 most recent backups
    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach((file) => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`🗑️  Deleted old backup: ${file}`);
      });
    }
  } catch (error) {
    console.warn("Warning: Could not cleanup old backups:", error.message);
  }
}

// Run backup
backupData();
