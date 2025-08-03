// Daily backup script for Supabase todo lists and shopping lists
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupData() {
    try {
        console.log('Starting backup...');
        
        // Fetch all todo lists
        const { data: todoLists, error: todoError } = await supabase
            .from('todo_lists')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (todoError) {
            throw todoError;
        }
        
        // Fetch all shopping lists
        const { data: shoppingLists, error: shoppingError } = await supabase
            .from('shopping_lists')
            .select('*')
            .order('created_at', { ascending: true });
        
        // Only throw if shopping_lists table exists but has an error
        // If the table doesn't exist yet, we'll just log a warning
        if (shoppingError && shoppingError.code !== 'PGRST116') {
            throw shoppingError;
        }
        
        // Create backup object
        const backup = {
            timestamp: new Date().toISOString(),
            version: "1.1", // Updated version to reflect new structure
            totalLists: todoLists?.length || 0,
            totalShoppingLists: shoppingLists?.length || 0,
            data: todoLists || [],
            shoppingData: shoppingLists || []
        };
        
        // Create filename with date
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:]/g, '-').split('.')[0]; // "2025-08-01T09-45-00"
        const filename = `backup-${timestamp}.json`;
        const backupPath = path.join('backups', filename);
        
        // Ensure backups directory exists
        if (!fs.existsSync('backups')) {
            fs.mkdirSync('backups');
        }
        
        // Write backup file
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        
        console.log(`✅ Backup successful: ${filename}`);
        console.log(`📊 Backed up ${backup.totalLists} todo lists and ${backup.totalShoppingLists} shopping lists`);
        
        // Keep only last 30 backups (cleanup old files)
        cleanupOldBackups();
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
    }
}

function cleanupOldBackups() {
    try {
        const backupDir = 'backups';
        if (!fs.existsSync(backupDir)) return;
        
        const files = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
            .sort()
            .reverse(); // newest first
        
        // Keep only the 30 most recent backups
        if (files.length > 30) {
            const filesToDelete = files.slice(30);
            filesToDelete.forEach(file => {
                fs.unlinkSync(path.join(backupDir, file));
                console.log(`🗑️  Deleted old backup: ${file}`);
            });
        }
    } catch (error) {
        console.warn('Warning: Could not cleanup old backups:', error.message);
    }
}

// Run backup
backupData();
