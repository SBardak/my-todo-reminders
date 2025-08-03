# Todo Reminders App

## Features

- ✅ **Supabase Database** - Migrated from Firebase for better performance
- ✅ **Individual List Saving** - Prevents accidental data loss
- ✅ **Optimistic UI Updates** - Instant feedback, background saving
- ✅ **Debounced Saves** - Efficient database operations
- ✅ **Automated Daily Backups** - Free GitHub Actions backup
- ✅ **Centralized Configuration** - Single source of truth for Supabase credentials

## Automated Daily Backup Setup (Free)

### Setup Instructions:

1. **Push to GitHub** (if not already done)

   ```bash
   git add .
   git commit -m "Add automated backup system"
   git push origin main
   ```

2. **Add Secrets to GitHub**

   - Go to your `my-todo-reminders` repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous/public API key

3. **Test the Backup**
   - Go to Actions tab in your GitHub repo
   - Click "Daily Database Backup"
   - Click "Run workflow" to test manually

### How it Works:

- **Runs daily at 2 AM UTC** (adjust in `.github/workflows/daily-backup.yml`)
- **Exports all your todo lists** from Supabase
- **Saves as JSON files** in the `backups/` folder
- **Commits to GitHub** automatically
- **Keeps 30 days** of backups (auto-cleanup)
- **100% free** using GitHub's free tier

### Manual Backup:

```bash
npm install
npm run backup
```

### Backup File Format:

```json
{
  "timestamp": "2025-01-31T02:00:00.000Z",
  "version": "1.0",
  "totalLists": 5,
  "data": [
    {
      "id": "list_1234567890_abc123",
      "title": "Shopping List",
      "entries": ["Milk", "Bread", "Eggs"],
      "created_at": "2025-01-30T10:00:00.000Z"
    }
  ]
}
```

### Recovery:

If you need to restore data, use the JSON files in the `backups/` folder. Each file contains all your lists and entries for that day.

## Configuration

The app uses a centralized configuration approach for Supabase credentials:

- **Location**: `js/config.js`
- **Format**:
  ```javascript
  export const supabaseConfig = {
    url: "your-supabase-url",
    key: "your-supabase-key",
  };
  ```
- **Usage**: Import in your modules with `import { supabaseConfig } from './js/config.js';`

This centralized approach follows best practices by:

1. Maintaining a single source of truth
2. Making credential updates easier and less error-prone
3. Facilitating environment-specific configurations

Preview HTML
##  python -m http.server 8000
##  Get-Process python | Where-Object { $_.CommandLine -like '*http.server*' } | Stop-Process -Force