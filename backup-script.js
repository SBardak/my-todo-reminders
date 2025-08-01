// Daily backup script for Supabase todo lists
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
        const { data, error } = await supabase
            .from('todo_lists')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        // Create backup object
        const backup = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            totalLists: data?.length || 0,
            data: data || []
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
        console.log(`📊 Backed up ${backup.totalLists} lists`);
        
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
